import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';

execFileSync(process.execPath,['scripts/build-v4-staging-next.mjs'],{stdio:'inherit'});
const base=readFileSync('dist/jarvis-v4-staging-next.mjs','utf8');
const pinned=JSON.parse(readFileSync('cloudflare/STAGING_V4_DEPLOYMENT_PATCH.json','utf8'));
const sha=s=>createHash('sha256').update(s,'utf8').digest('hex');
assert.equal(sha(base),pinned.source_sha256,'Start from current verified isolated staging Worker');
const start='const STAGING_V4_HTML=';
const end=';\nconst STAGING_V4_HEADERS=';
const i=base.indexOf(start),j=base.indexOf(end,i);
assert(i===0&&j>i,'Expected unique staging HTML constant');
const previous=JSON.parse(base.slice(i+start.length,j));
assert(previous.includes('ISOLATED_STAGING=true'));
let html=readFileSync('cloudflare/ui/command-v4.html','utf8');
assert(html.includes('let chatRevision=0;')&&html.includes('async function loadChatHistory(){'),'Current chat persistence missing');
const replace=(from,to)=>{
 assert.equal(html.split(from).length,2,'Expected one UI insertion point: '+from.slice(0,45));
 html=html.replace(from,to);
};
replace('JARVIS CLOUD · MODALITÀ AVANZATA','JARVIS v4 · STAGING ISOLATO');
replace('Questo centro di comando usa il database Cloudflare tramite API sullo stesso sito.','Questa anteprima usa solo dati sintetici: operazioni e chat AI sono disabilitate.');
replace('const state={','const ISOLATED_STAGING=true; const state={');
replace("if(STATIC_PREVIEW)throw Error('Anteprima statica: API Cloudflare disponibili solo dal dominio autenticato.');",
 "if(ISOLATED_STAGING&&options.method&&options.method!=='GET')throw Error('Staging isolato: modifiche disabilitate.'); if(STATIC_PREVIEW)throw Error('Anteprima statica: API Cloudflare disponibili solo dal dominio autenticato.');");
replace('function tick(){',"if(ISOLATED_STAGING){for(const id of ['addProject','addTask','memoryInput','memoryCategory','exportMemory','importMemory','chatInput','voiceBtn'])$(id).disabled=true;$('chatForm').querySelector('.send').disabled=true;$('memoryForm').querySelector('button[type=\"submit\"]').disabled=true;}\nfunction tick(){");
for(const [needle,repl] of [
 ["$('addProject').disabled=!state.availability.projects;","$('addProject').disabled=ISOLATED_STAGING||!state.availability.projects;"],
 ["$('addTask').disabled=!state.availability.tasks;","$('addTask').disabled=ISOLATED_STAGING||!state.availability.tasks;"],
 ["$('memoryInput').disabled=!state.availability.memories;","$('memoryInput').disabled=ISOLATED_STAGING||!state.availability.memories;"],
 ["$('memoryCategory').disabled=!state.availability.memories;","$('memoryCategory').disabled=ISOLATED_STAGING||!state.availability.memories;"],
 ["$('importMemory').disabled=!state.availability.memories;","$('importMemory').disabled=ISOLATED_STAGING||!state.availability.memories;"],
 ["$('exportMemory').disabled=!state.availability.memories;","$('exportMemory').disabled=ISOLATED_STAGING||!state.availability.memories;"],
 ["$('memoryForm').querySelector('button[type=\"submit\"]').disabled=!state.availability.memories;","$('memoryForm').querySelector('button[type=\"submit\"]').disabled=ISOLATED_STAGING||!state.availability.memories;"]
])replace(needle,repl);
const htmlUpdated=base.slice(0,i+start.length)+JSON.stringify(html)+base.slice(j);
const marker='const STAGING_ONLY_MODE = true;';
assert.equal(htmlUpdated.split(marker).length,2);
const fixture="if(method==='GET'&&path==='/api/chat-history')return json({messages:[]},200,'');\n";
const generated=htmlUpdated.replace(marker,fixture+marker);
assert(generated.includes('const STAGING_ONLY_MODE = true;'));
assert(generated.includes("if(method==='PATCH')return json({error:'Staging: endpoint not exposed'},404,'');"));
writeFileSync('dist/jarvis-v4-ui-next.mjs',generated);
console.log('Current Cloud v4 UI isolated staging candidate built, SHA-256: '+sha(generated)+'. No deployment.');
