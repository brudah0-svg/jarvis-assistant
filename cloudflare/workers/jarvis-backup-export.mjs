const json=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Content-Security-Policy':"default-src 'none'"}});
const hex=async text=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(text)))).map(n=>n.toString(16).padStart(2,'0')).join('');
const schemaCanon=items=>items.map(x=>x.object_type+'|'+x.object_name+'|'+x.definition).join('\n');
const rowsCanon=items=>items.map(x=>x.table_name+'\u0000'+x.record_key+'\u0000'+x.record_json).join('\n');
async function stored(env,id){
  const [s,r]=await Promise.all([
    env.BACKUP_DB.prepare('SELECT object_type,object_name,definition FROM complete_snapshot_schema WHERE snapshot_id=? ORDER BY object_type,object_name').bind(id).all(),
    env.BACKUP_DB.prepare('SELECT table_name,record_key,record_json FROM complete_snapshot_rows WHERE snapshot_id=? ORDER BY table_name,record_key').bind(id).all()
  ]);
  return {schema:s.results||[],rows:r.results||[]};
}
export default {
  async fetch(request,env){
    const url=new URL(request.url);
    if(url.hostname!=='jarvis-backup.internal')return json({error:'Not found'},404);
    if(!env.BACKUP_DB)return json({error:'Backup database unavailable'},503);
    if(request.method==='POST'&&url.pathname==='/internal/snapshot-write'){
      try{
        const raw=await request.text();
        if(raw.length>5000000)return json({error:'Snapshot payload too large'},413);
        const data=JSON.parse(raw);
        const m=data?.manifest, schema=data?.schema, rows=data?.rows;
        if(!m||!Array.isArray(schema)||!Array.isArray(rows)||schema.length<1||schema.length>120||rows.length>15000)return json({error:'Invalid snapshot structure'},400);
        if(!/^[a-f0-9-]{36}$/.test(m.id||'')||m.table_count>120||m.table_count<1||m.rows_total!==rows.length||m.schema_sha256?.length!==64||m.rows_sha256?.length!==64)return json({error:'Invalid snapshot metadata'},400);
        const validName=x=>typeof x==='string'&&/^[a-zA-Z_][a-zA-Z0-9_]{0,127}$/.test(x);
        if(!schema.every(x=>['table','index','view','trigger'].includes(x.object_type)&&validName(x.object_name)&&typeof x.definition==='string'&&x.definition.length<100000))return json({error:'Invalid schema item'},400);
        const knownTables=new Set(schema.filter(x=>x.object_type==='table').map(x=>x.object_name));
        if(knownTables.size!==m.table_count||!rows.every(x=>knownTables.has(x.table_name)&&/^\d{6,}$/.test(x.record_key)&&typeof x.record_json==='string'&&x.record_json.length<100000))return json({error:'Invalid snapshot record'},400);
        const counts=Object.fromEntries([...knownTables].map(name=>[name,0]));
        for(const r of rows){counts[r.table_name]++;try{const obj=JSON.parse(r.record_json);if(!obj||Array.isArray(obj)||typeof obj!=='object')return json({error:'Invalid record JSON'},400)}catch{return json({error:'Invalid record JSON'},400)}}
        if(Object.keys(m.counts||{}).length!==knownTables.size||Object.keys(counts).some(name=>m.counts[name]!==counts[name]))return json({error:'Count mismatch'},400);
        const sh=await hex(schemaCanon(schema)),rh=await hex(rowsCanon(rows));
        if(sh!==m.schema_sha256||rh!==m.rows_sha256)return json({error:'Source digest mismatch'},409);
        const existing=await env.BACKUP_DB.prepare('SELECT id,table_count,rows_total FROM complete_snapshot_sets WHERE consistency_verified=1 AND schema_sha256=? AND rows_sha256=? ORDER BY created_at DESC LIMIT 1').bind(sh,rh).first();
        if(existing)return json({status:'unchanged',snapshot_id:existing.id,tables:existing.table_count,rows:existing.rows_total,verified:true});
        const insertedId=await env.BACKUP_DB.prepare('SELECT id FROM complete_snapshot_sets WHERE id=?').bind(m.id).first();
        if(insertedId)return json({error:'Snapshot ID already used'},409);
        const commands=[];
        const addSchema=env.BACKUP_DB.prepare('INSERT INTO complete_snapshot_schema(snapshot_id,object_type,object_name,definition) VALUES(?,?,?,?)');
        const addRow=env.BACKUP_DB.prepare('INSERT INTO complete_snapshot_rows(snapshot_id,table_name,record_key,record_json) VALUES(?,?,?,?)');
        for(const item of schema)commands.push(addSchema.bind(m.id,item.object_type,item.object_name,item.definition));
        for(const item of rows)commands.push(addRow.bind(m.id,item.table_name,item.record_key,item.record_json));
        commands.push(env.BACKUP_DB.prepare('INSERT INTO complete_snapshot_sets(id,scope,schema_sha256,rows_sha256,table_count,rows_total,counts_json,bookmark_before,bookmark_after,consistency_verified,restore_test_verified) VALUES(?,?,?,?,?,?,?,?,?,0,0)').bind(m.id,'full_d1_schema_and_data',sh,rh,m.table_count,m.rows_total,JSON.stringify(counts),'unavailable:worker_binding','unavailable:worker_binding'));
        await env.BACKUP_DB.batch(commands);
        const result=await stored(env,m.id);
        const verified=result.schema.length===schema.length&&result.rows.length===rows.length&&await hex(schemaCanon(result.schema))===sh&&await hex(rowsCanon(result.rows))===rh;
        if(!verified)return json({error:'Readback verification failed; snapshot remains quarantined'},409);
        await env.BACKUP_DB.prepare('UPDATE complete_snapshot_sets SET consistency_verified=1 WHERE id=? AND consistency_verified=0').bind(m.id).run();
        return json({status:'created',snapshot_id:m.id,tables:m.table_count,rows:m.rows_total,verified:true,isolated_restore_tested:false});
      }catch(e){console.error('Private snapshot write failed',String(e?.name||'Error').slice(0,90));return json({error:'Snapshot creation failed'},503)}
    }
    if(request.method==='GET'&&url.pathname==='/verified-snapshot'){
      try{
        const latest=await env.BACKUP_DB.prepare('SELECT * FROM complete_snapshot_sets WHERE consistency_verified=1 ORDER BY created_at DESC,id DESC LIMIT 1').first();
        if(!latest)return json({error:'No verified snapshot'},409);
        const {schema,rows}=await stored(env,latest.id);
        const sh=await hex(schemaCanon(schema)),rh=await hex(rowsCanon(rows));
        if(sh!==latest.schema_sha256||rh!==latest.rows_sha256||schema.filter(x=>x.object_type==='table').length!==latest.table_count||rows.length!==latest.rows_total)return json({error:'Snapshot integrity check failed'},409);
        return json({format:'JARVIS_VERIFIED_D1_BACKUP_V1',metadata:{id:latest.id,created_at:latest.created_at,table_count:latest.table_count,rows_total:latest.rows_total,schema_sha256:sh,rows_sha256:rh,verified:true,isolated_restore_tested:latest.restore_test_verified===1},schema,rows});
      }catch(e){console.error('Private snapshot read failed',String(e?.name||'Error').slice(0,90));return json({error:'Backup export unavailable'},503)}
    }
    return json({error:'Not found'},404);
  }
};