import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import worker from '../cloudflare/workers/jarvis-backup-export.mjs';

// Contract tests use in-memory synthetic data ONLY. No Cloudflare connection.
const hash = input => createHash('sha256').update(input).digest('hex');
const schema = [{object_type:'table',object_name:'fixture',definition:'CREATE TABLE fixture(id TEXT PRIMARY KEY)'}];
const rows = [{table_name:'fixture',record_key:'000000',record_json:JSON.stringify({id:'synthetic'})}];
const schemaHash = hash(schema.map(x=>x.object_type+'|'+x.object_name+'|'+x.definition).join('\n'));
const rowsHash = hash(rows.map(x=>x.table_name+'\u0000'+x.record_key+'\u0000'+x.record_json).join('\n'));
const id = 'a2bc4fc6-e9d7-4d51-9dd1-115a8af23001';
const manifest = {id,table_count:1,rows_total:1,counts:{fixture:1},schema_sha256:schemaHash,rows_sha256:rowsHash};
const baseline = {manifest,schema,rows};
const dbState = {sets:new Map(),schemas:new Map(),rows:new Map()};
function command(sql, params = []) {
  return {
    bind(...values){return command(sql,values)},
    async first(){
      if(sql.includes('SELECT id,table_count,rows_total FROM complete_snapshot_sets WHERE consistency_verified=1 AND schema_sha256=')){
        const match=[...dbState.sets.values()].find(s=>s.consistency_verified===1&&s.schema_sha256===params[0]&&s.rows_sha256===params[1]);
        return match&&{id:match.id,table_count:match.table_count,rows_total:match.rows_total};
      }
      if(sql.includes('SELECT id FROM complete_snapshot_sets WHERE id='))return dbState.sets.has(params[0])?{id:params[0]}:null;
      if(sql.includes('SELECT * FROM complete_snapshot_sets WHERE consistency_verified=1'))return [...dbState.sets.values()].filter(s=>s.consistency_verified===1).at(-1)||null;
      throw Error('Unexpected first(): '+sql);
    },
    async all(){
      if(sql.includes('SELECT object_type,object_name,definition FROM complete_snapshot_schema')){
        return {results:(dbState.schemas.get(params[0])||[]).slice().sort((a,b)=>a.object_type.localeCompare(b.object_type)||a.object_name.localeCompare(b.object_name))};
      }
      if(sql.includes('SELECT table_name,record_key,record_json FROM complete_snapshot_rows')){
        return {results:(dbState.rows.get(params[0])||[]).slice().sort((a,b)=>a.table_name.localeCompare(b.table_name)||a.record_key.localeCompare(b.record_key))};
      }
      throw Error('Unexpected all(): '+sql);
    },
    async run(){
      if(sql.startsWith('UPDATE complete_snapshot_sets SET consistency_verified=1')){
        const found=dbState.sets.get(params[0]);if(found)found.consistency_verified=1;return {success:true};
      }
      throw Error('Unexpected run(): '+sql);
    },
    sql,params
  };
}
const DB={
  prepare:sql=>command(sql),
  async batch(commands){
    // All writes are committed as a group in the mock.
    const nextSets=new Map(dbState.sets);
    const nextSchemas=new Map(dbState.schemas);
    const nextRows=new Map(dbState.rows);
    for(const {sql,params} of commands){
      if(sql.startsWith('INSERT INTO complete_snapshot_schema')){
        const [key,object_type,object_name,definition]=params;
        nextSchemas.set(key,[...(nextSchemas.get(key)||[]),{object_type,object_name,definition}]);
      }else if(sql.startsWith('INSERT INTO complete_snapshot_rows')){
        const [key,table_name,record_key,record_json]=params;
        nextRows.set(key,[...(nextRows.get(key)||[]),{table_name,record_key,record_json}]);
      }else if(sql.startsWith('INSERT INTO complete_snapshot_sets')){
        const [key,scope,schema_sha256,rows_sha256,table_count,rows_total,counts_json]=params;
        nextSets.set(key,{id:key,scope,schema_sha256,rows_sha256,table_count,rows_total,counts_json,consistency_verified:0,restore_test_verified:0,created_at:'2026-11-14 00:00:00'});
      }else throw Error('Unexpected batch SQL: '+sql);
    }
    dbState.sets=nextSets;dbState.schemas=nextSchemas;dbState.rows=nextRows;
    return commands.map(()=>({success:true}));
  }
};
async function request(path,method='GET',body=null,env={BACKUP_DB:DB},host='jarvis-backup.internal'){
  const headers=body?{'content-type':'application/json'}:{};
  const url='https://'+host+path;
  const response=await worker.fetch(new Request(url,{method,headers,body:body&&JSON.stringify(body)}),env);
  const data=await response.json();return {status:response.status,data,headers:response.headers};
}
assert.equal((await request('/verified-snapshot')).status,409,'missing snapshot is not downloadable');
assert.equal((await request('/verified-snapshot','GET',null,{BACKUP_DB:null})).status,503);
assert.equal((await request('/verified-snapshot','GET',null,{BACKUP_DB:DB},'untrusted.example')).status,404);
assert.equal((await request('/internal/snapshot-write','POST',{manifest:{},schema:[],rows:[]})).status,400);
const invalidHash={...baseline,manifest:{...manifest,rows_sha256:'0'.repeat(64)}};
assert.equal((await request('/internal/snapshot-write','POST',invalidHash)).status,409,'incorrect digest must be rejected');
assert.equal(dbState.sets.size,0,'invalid snapshot must not be committed');
const created=await request('/internal/snapshot-write','POST',baseline);
assert.equal(created.status,200);assert.equal(created.data.status,'created');assert.equal(created.data.verified,true);
assert.equal(dbState.sets.get(id).consistency_verified,1);
const downloaded=await request('/verified-snapshot');
assert.equal(downloaded.status,200);assert.deepEqual(downloaded.data.schema,schema);assert.deepEqual(downloaded.data.rows,rows);
assert.equal(downloaded.data.metadata.verified,true);
assert.equal(downloaded.headers.get('cache-control'),'no-store');
const duplicate=await request('/internal/snapshot-write','POST',{...baseline,manifest:{...manifest,id:'bb1b6a71-0267-43f3-ae44-0e317f474bbe'}});
assert.equal(duplicate.data.status,'unchanged','identical snapshot should be deduplicated');
assert.equal(dbState.sets.size,1,'deduplication must not create a second snapshot');
const previous=dbState.rows.get(id);
dbState.rows.set(id,[{...rows[0],record_json:JSON.stringify({id:'tampered'})}]);
assert.equal((await request('/verified-snapshot')).status,409,'corrupted stored record must block export');
dbState.rows.set(id,previous);
assert.equal((await request('/verified-snapshot')).status,200,'valid stored snapshot remains readable');
console.log('Backup Worker contract tests passed: isolation, validation, digest verification, atomic write, deduplication and corruption block.');
