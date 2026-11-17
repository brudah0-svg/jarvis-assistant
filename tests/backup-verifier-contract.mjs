import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';

const source=readFileSync('cloudflare/workers/jarvis-backend.mjs','utf8');
const start=source.indexOf('async function jarvisBackupVerifier(env)');
const end=source.indexOf('async function jarvisScheduledFullSnapshot(env)',start);
assert(start>=0&&end>start,'Exact backup verifier source required');
const section=source.slice(start,end);
assert(section.includes("d.schema.filter(x=>x.object_type==='table').length===tables"),'Count actual tables, not indexes');
assert(section.includes("'verify_passed':'verify_failed'"),'Verifier results must have distinct verdicts');
assert(source.includes("SELECT verdict,snapshot_id,created_at FROM backup_export_health_checks WHERE verdict IN ('passed','unchanged','failed') ORDER BY created_at DESC,id DESC LIMIT 1"),'Health dashboard must look only at actual scheduled snapshots');
assert(source.includes("parsed.schema.filter(x=>x.object_type==='table').length!==parsed.metadata.table_count"),'Encrypted mobile backup export must accept table plus index schema');
assert(source.includes("data.schema.filter(x=>x.object_type==='table').length!==data.metadata?.table_count"),'Offline decrypted backup verification must accept table plus index schema');

const rows=[];
const tables=Array.from({length:39},(_,i)=>({object_type:'table',object_name:'t'+i,definition:'CREATE TABLE t'+i+' (id TEXT)'}));
const indexes=Array.from({length:3},(_,i)=>({object_type:'index',object_name:'i'+i,definition:'CREATE INDEX i'+i+' ON t'+i+' (id)'}));
const makeEnv=shape=>({
 BACKUP_SERVICE:{fetch:async()=>({ok:true,json:async()=>shape})},
 DB:{prepare:()=>({bind:(...values)=>({run:async()=>{rows.push(values);return {meta:{changes:1}}}})})}
});
const verifier=runInNewContext(section+';jarvisBackupVerifier',{console,crypto,AbortSignal});
const base={format:'JARVIS_VERIFIED_D1_BACKUP_V1',metadata:{id:'snapshot-1',verified:true,table_count:39,rows_total:174},schema:[...tables,...indexes],rows:Array.from({length:174},()=>({record_json:'{}'}))};
await verifier(makeEnv(base));
assert.equal(rows.at(-1)[4],'verify_passed','39 actual tables and 3 indexes should be verified');
assert.equal(rows.at(-1)[2],39);
assert.equal(rows.at(-1)[3],174);
assert.equal(base.schema.length,42,'Fixture must reproduce production schema mismatch');
assert.equal(base.schema.filter(x=>x.object_type==='table').length,39);
await verifier(makeEnv({...base,schema:base.schema.slice(1)}));
assert.equal(rows.at(-1)[4],'verify_failed','Missing real table must fail');
await verifier(makeEnv({...base,rows:base.rows.slice(1)}));
assert.equal(rows.at(-1)[4],'verify_failed','Incomplete rows must fail');
console.log('JARVIS backup verifier PASS: 39+3 schema, missing table, missing row, verdict isolation and mobile encrypted export contracts');
