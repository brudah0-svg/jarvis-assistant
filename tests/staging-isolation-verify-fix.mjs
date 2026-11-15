import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {pathToFileURL} from 'node:url';
import {resolve} from 'node:path';
import {readFileSync} from 'node:fs';

execFileSync(process.execPath,['scripts/build-v4-staging-isolation-fix.mjs'],{stdio:'inherit'});
execFileSync(process.execPath,['--check','dist/jarvis-v4-staging-isolation-fix.mjs'],{stdio:'inherit'});
const source=readFileSync('dist/jarvis-v4-staging-isolation-fix.mjs','utf8');
assert(source.includes("if(STAGING_ONLY_MODE&&method==='POST'&&path==='/api/tasks'&&!request.headers.get('content-type'))"),'Guard missing');
const worker=(await import(pathToFileURL(resolve('dist/jarvis-v4-staging-isolation-fix.mjs')).href)).default;
const database={prepare(sql){return{bind(){return this},async all(){
 if(sql.includes('sqlite_master'))return {results:[{name:'projects'},{name:'tasks'}]};
 if(sql.includes('FROM projects'))return {results:[{id:'staging-project',name:'Synthetic',status:'active'}]};
 if(sql.includes('FROM tasks'))return {results:[{id:'staging-task',project_id:'staging-project',status:'pending'}]};
 throw Error('Unexpected all '+sql);
},async first(){
 if(sql.includes('COUNT(*) FROM projects'))return {projects:1,tasks:1};
 if(sql.startsWith('SELECT name FROM projects WHERE id='))return {name:'JARVIS-REG-aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa'};
 throw Error('Unexpected first '+sql);
}}}};
const env={DB:database,VERSION:{id:'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa'}};
async function hit(path,method='GET',data){
 const opts={method};
 if(data!==undefined){opts.headers={'Content-Type':'application/json'};opts.body=JSON.stringify(data)}
 const response=await worker.fetch(new Request('https://staging.internal'+path,opts),env,{waitUntil(){}});
 let body=null;try{body=await response.json()}catch{}
 return{status:response.status,body};
}
assert.equal((await hit('/api/tasks','POST')).status,404,'Production isolation verifier sends empty POST and expects a blocked 404');
assert.equal((await hit('/api/projects','POST',{name:'UNAUTHORIZED-REGRESSION',description:'Staging regression temporary fixture'})).status,404);
assert.equal((await hit('/api/tasks','POST',{title:'unauthorized'})).status,404);
assert.equal((await hit('/api/tasks/staging-task','PATCH',{title:'unauthorized'})).status,404);
assert.equal((await hit('/api/ai-chat','POST',{message:'blocked'})).status,405);
assert.equal((await hit('/api/chat-history','POST',{role:'user',content:'blocked'})).status,405);
const health=await hit('/staging-check');
assert.equal(health.status,200);
assert.equal(health.body?.ok,true);
assert.equal(health.body?.guard_version,2);
assert.equal(health.body?.isolated_database?.projects,1);
assert.equal(health.body?.isolated_database?.tasks,1);
assert.equal(health.body?.production_data_access,false);
assert.equal(health.body?.push_secret_available,false);
assert.equal(health.body?.ai_binding_available,false);
assert.equal((await hit('/api/projects')).status,200);
assert.equal((await hit('/api/tasks?project_id=staging-project')).status,200);
console.log('Isolated staging 502 regression: empty POST tasks denied with 404, synthetic reads and health valid, no AI or unsafe writes.');
