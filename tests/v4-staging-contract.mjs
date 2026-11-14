import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {pathToFileURL} from 'node:url';
import {resolve} from 'node:path';
execFileSync(process.execPath,['scripts/build-v4-staging.mjs'],{stdio:'inherit'});
execFileSync(process.execPath,['--check','dist/jarvis-v4-staging.mjs'],{stdio:'inherit'});
const worker=(await import(pathToFileURL(resolve('dist/jarvis-v4-staging.mjs')).href)).default;
const fixture={
 prepare(sql){
  return {sql,bind(){return this},async all(){
   if(sql.startsWith('SELECT id,name,description,status,created_at,updated_at FROM projects'))return {results:[{id:'staging-project',name:'JARVIS staging fixture',description:'Synthetic',status:'active'}]};
   if(sql.startsWith('SELECT * FROM tasks'))return {results:[{id:'task-fixture',project_id:'staging-project',title:'Synthetic staging task',status:'pending'}]};
   throw Error('Unexpected query: '+sql);
  },async first(){throw Error('Unexpected first query: '+sql)}};
 }
};
async function hit(path,method='GET',origin){
 const headers={};if(origin)headers.Origin=origin;
 const r=await worker.fetch(new Request('https://isolated.example'+path,{method,headers,body:method==='POST'?'{}':undefined}),{DB:fixture,VERSION:{id:'fixture-version'}},{waitUntil:()=>{}});
 const body=r.headers.get('content-type')?.includes('application/json')?await r.json():await r.text();
 return {status:r.status,body,headers:r.headers};
}
const page=await hit('/command-v4');
assert.equal(page.status,200);
assert(page.body.includes('JARVIS v4 · STAGING ISOLATO'));
assert(page.body.includes('const ISOLATED_STAGING=true;'));
assert(page.body.includes('Staging isolato: modifiche disabilitate.'));
assert.equal(page.headers.get('cache-control'),'private, no-store');
assert.match(page.headers.get('content-security-policy'),/connect-src 'self'/);
assert.equal((await hit('/command-v4','GET','https://evil.example')).status,403);
const p=await hit('/api/projects');assert.equal(p.status,200);assert.equal(p.body.projects[0].id,'staging-project');
const t=await hit('/api/tasks');assert.equal(t.status,200);assert.equal(t.body.tasks[0].id,'task-fixture');
const m=await hit('/api/memory');assert.equal(m.status,200);assert.match(m.body.memories[0].content,/dimostrativo/);
const proposals=await hit('/api/proposals');assert.equal(proposals.status,200);assert.deepEqual(proposals.body.proposals,[]);
assert.equal((await hit('/api/memory','POST')).status,405);
assert.equal((await hit('/api/ai-chat','POST')).status,405);
assert.equal((await hit('/api/chat-history','POST')).status,405);
assert.equal((await hit('/api/ai-plan','POST')).status,405);
assert.equal((await hit('/api/recovery/preflight')).status,404);
assert.equal((await hit('/api/autonomy/status')).status,404);
console.log('Staging v4 integration: UI, same-origin synthetic data and write isolation verified.');
