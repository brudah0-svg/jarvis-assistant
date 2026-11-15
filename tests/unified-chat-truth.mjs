import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
import {resolve} from 'node:path';
execFileSync(process.execPath,['scripts/build-unified-trusted-chat.mjs'],{stdio:'inherit'});
execFileSync(process.execPath,['--check','dist/jarvis-unified-trusted-chat.mjs'],{stdio:'inherit'});
const source=readFileSync('dist/jarvis-unified-trusted-chat.mjs','utf8');
const worker=(await import(pathToFileURL(resolve('dist/jarvis-unified-trusted-chat.mjs')).href)).default;
const ui=await worker.fetch(new Request('https://test.invalid/jarvis-unified'),{},{waitUntil(){}});
assert.equal(ui.status,200);
assert((await ui.text()).includes('result.operations_executed===false'));
let inferences=0,prompt='';
const db={prepare(sql){return{
 async all(){if(sql.startsWith('SELECT content,category FROM memories'))return{results:[]};if(sql.startsWith('SELECT name,description,status FROM projects'))return{results:[]};if(sql.startsWith('SELECT title,status FROM tasks'))return{results:[]};throw Error('Unexpected read: '+sql)},
 async first(){if(sql.includes("COUNT(*) AS n FROM action_proposals WHERE status='pending'"))return{n:2};throw Error('Unexpected query: '+sql)},
 async run(){throw Error('AI chat must never write D1')}
}}};
const env={DB:db,AI:{async run(model,params){inferences++;prompt=params.messages[0].content;return{response:'Questo è solo un suggerimento, non un piano approvato.'}}}};
const call=async environment=>{
 const r=await worker.fetch(new Request('https://test.invalid/api/ai-chat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({message:'Hai approvato il mio piano?'})}),environment,{waitUntil(){}});
 return{status:r.status,body:await r.json()};
};
const ok=await call(env);
assert.equal(ok.status,200);
assert.equal(ok.body.read_only,true);
assert.equal(ok.body.operations_executed,false);
assert.equal(ok.body.approval_granted_by_chat,false);
assert.equal(ok.body.pending_proposals,2);
assert(prompt.includes('Non dichiarare piani approvati'));
assert(prompt.includes('"pending_proposals":2'));
const broken={...env,DB:{prepare(sql){if(sql.includes('action_proposals'))return{first:async()=>{throw Error('DB unavailable')}};return db.prepare(sql)}}};
assert.equal((await call(broken)).status,503);
assert.equal(inferences,1,'An unverifiable approval count must block AI inference');
assert(source.includes('if (path === "/jarvis" && method === "GET")'));
console.log('PASS: approval evidence, read-only AI, safe failure, existing routes preserved');
