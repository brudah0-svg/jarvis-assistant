import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import assert from 'node:assert/strict';

const stage=readFileSync('cloudflare/workers/jarvis-staging.mjs','utf8');
let html=readFileSync('cloudflare/ui/command-v4-staging-snapshot.html','utf8');
assert(stage.includes('const STAGING_ONLY_MODE = true;'));
assert(stage.includes("Staging: endpoint not exposed"));
assert(stage.includes("path === '/staging-check'"));
assert(!html.includes('localStorage.'),'Never use the phone localStorage');
const anchor='const method = request.method;';
assert.equal(stage.split(anchor).length,2);
html=html.replace('JARVIS CLOUD · MODALITÀ AVANZATA','JARVIS v4 · STAGING ISOLATO');
html=html.replace('Questo centro di comando usa il database Cloudflare tramite API sullo stesso sito.','Questa anteprima usa solo dati di test in staging e non può eseguire scritture.');
html=html.replace('const state={','const ISOLATED_STAGING=true; const state={');
assert(html.includes('const ISOLATED_STAGING=true;'));
html=html.replace("if(STATIC_PREVIEW)throw Error('Anteprima statica: API Cloudflare disponibili solo dal dominio autenticato.');","if(ISOLATED_STAGING&&options.method&&options.method!=='GET')throw Error('Staging isolato: modifiche disabilitate.'); if(STATIC_PREVIEW)throw Error('Anteprima statica: API Cloudflare disponibili solo dal dominio autenticato.');");
const headers={'Content-Type':'text/html; charset=utf-8','Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff','Content-Security-Policy':"default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; connect-src 'self'; base-uri 'none'; frame-ancestors 'none'"};
const route=[
"if(path==='/command-v4'&&method==='GET'){",
" if(origin&&origin!==url.origin)return json({error:'Origin not allowed'},403,'');",
" return new Response(STAGING_V4_HTML,{status:200,headers:STAGING_V4_HEADERS});",
"}",
"if(method==='GET'&&path==='/api/memory')return json({memories:[{id:'fixture-memory',content:'Ricordo dimostrativo: nessun dato reale.',category:'Staging',created_at:'2026-11-15'}]},200,'');",
"if(method==='GET'&&path==='/api/proposals')return json({proposals:[]},200,'');",
"if(method==='POST'&&path==='/api/ai-chat')return json({error:'Staging: chat AI non disponibile'},405,'');",
"if(path.startsWith('/api/')&&method!=='GET'&&path!=='/api/projects'&&path!=='/api/tasks')return json({error:'Staging: scrittura non consentita'},405,'');"
].join('\n');
const generated='const STAGING_V4_HTML='+JSON.stringify(html)+';\nconst STAGING_V4_HEADERS='+JSON.stringify(headers)+';\n'+stage.replace(anchor,anchor+'\n'+route);
assert(generated.includes('const STAGING_ONLY_MODE = true;'));
mkdirSync('dist',{recursive:true});
writeFileSync('dist/jarvis-v4-staging.mjs',generated,'utf8');
console.log('Built isolated v4 staging candidate. No deployment performed.');
