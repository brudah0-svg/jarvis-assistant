import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';

execFileSync(process.execPath,['scripts/build-v4-ui-hardened.mjs'],{stdio:'inherit'});
execFileSync(process.execPath,['--check','dist/jarvis-v4-ui-hardened.mjs'],{stdio:'inherit'});
const worker=(await import(pathToFileURL(resolve('dist/jarvis-v4-ui-hardened.mjs')).href)).default;
const database={prepare(sql){return {bind(){return this},async all(){
 if(sql.startsWith('SELECT id,name,description,status,created_at,updated_at FROM projects'))return {results:[{id:'staging-project',name:'Synthetic project',status:'active'}]};
 if(sql.startsWith('SELECT * FROM tasks'))return {results:[{id:'staging-task',project_id:'staging-project',status:'pending'}]};
 throw Error('Unexpected SQL '+sql);
},async first(){throw Error('Unexpected DB first '+sql)}}}};
async function hit(path,method='GET'){
 const r=await worker.fetch(new Request('https://staging.example'+path,{method}),{DB:database,VERSION:{id:'synthetic-version'}},{waitUntil(){}});
 return {status:r.status,body:r.headers.get('content-type')?.includes('json')?await r.json():await r.text()};
}
const page=await hit('/command-v4');
assert.equal(page.status,200);
for(const text of ['STAGING ISOLATO','ISOLATED_STAGING=true','let chatRevision=0','async function loadChatHistory(){','chatBusy=false','modifiche disabilitate']){
 assert(page.body.includes(text),'Missing current staging UI feature '+text);
}
assert.match(page.body,/Staging isolato: modifiche disabilitate/);
assert.equal((await hit('/api/chat-history')).status,200);
assert.deepEqual((await hit('/api/chat-history')).body.messages,[]);
assert.equal((await hit('/api/projects')).status,200);
assert.equal((await hit('/api/tasks')).status,200);
assert.equal((await hit('/api/memory')).status,200);
assert.equal((await hit('/api/proposals')).status,200);
assert.equal((await hit('/api/tasks/staging-task','PATCH')).status,404);
assert.equal((await hit('/api/ai-chat','POST')).status,405);
assert.equal((await hit('/api/chat-history','POST')).status,405);
assert.equal((await hit('/api/autonomy/status')).status,404);
console.log('Latest UI on isolated staging: protected reads, cloud chat history fixture, write blocking and corrected PATCH guard.');
