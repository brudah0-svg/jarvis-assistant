import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {pathToFileURL} from 'node:url';
import {resolve} from 'node:path';
import {readFileSync} from 'node:fs';

execFileSync(process.execPath,['scripts/build-v4-staging-next.mjs'],{stdio:'inherit'});
execFileSync(process.execPath,['--check','dist/jarvis-v4-staging-next.mjs'],{stdio:'inherit'});
const worker=(await import(pathToFileURL(resolve('dist/jarvis-v4-staging-next.mjs')).href)).default;
const db={prepare(sql){return {bind(){return this},async all(){
 if(sql.startsWith('SELECT id,name,description,status,created_at,updated_at FROM projects'))return {results:[{id:'staging-project',name:'Synthetic project',status:'active'}]};
 if(sql.startsWith('SELECT * FROM tasks'))return {results:[{id:'staging-task',project_id:'staging-project',status:'pending'}]};
 throw Error('Unexpected SQL '+sql);
},async first(){throw Error('Unexpected DB access '+sql)}}}};
const request=async(path,method='GET',body)=>{
 const headers=body?{'Content-Type':'application/json'}:{};
 const response=await worker.fetch(new Request('https://isolated.example'+path,{method,headers,body:body?JSON.stringify(body):undefined}),{DB:db,VERSION:{id:'synthetic-version'}},{waitUntil(){}});
 return {status:response.status,body:response.headers.get('content-type')?.includes('json')?await response.json():await response.text()};
};
const page=await request('/command-v4');
assert.equal(page.status,200);
assert.match(page.body,/STAGING ISOLATO/);
assert.equal((await request('/api/projects')).status,200);
assert.equal((await request('/api/tasks')).status,200);
assert.equal((await request('/api/memory')).status,200);
assert.equal((await request('/api/proposals')).status,200);
assert.equal((await request('/api/tasks/staging-task','PATCH',{title:'Changed'})).status,404);
assert.equal((await request('/api/projects','POST',{name:'Unauthorized'})).status,404);
assert.equal((await request('/api/memory','POST',{content:'No writes'})).status,405);
assert.equal((await request('/api/ai-chat','POST',{message:'No AI'})).status,405);
assert.equal((await request('/api/chat-history','POST',{role:'user',content:'No writes'})).status,405);
assert.equal((await request('/api/recovery/preflight')).status,404);
const deployed=JSON.parse(readFileSync('cloudflare/STAGING_V4_DEPLOYMENT.json','utf8'));
assert.equal(deployed.version_id,'a43a3a07-4e54-4577-a775-3a11db96258e','Old deployment remains pinned');
console.log('Next staging candidate passed: PATCH 404, all writes blocked, synthetic reads, no privileged routes.');
