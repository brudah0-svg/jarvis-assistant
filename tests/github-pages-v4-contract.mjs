import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
const html=readFileSync('index.html','utf8');
const app=readFileSync('app.js','utf8');
const old=readFileSync('legacy/v03.html','utf8');
assert.match(html,/JARVIS v4 — Centro di comando Android/);
assert.match(html,/JARVIS v4 · CENTRO DI COMANDO LOCALE/);
assert(html.includes('src="app.js"'),'Same app.js must preserve localStorage migration-free');
assert(html.includes('id="autoMemory"'));
assert(html.includes('id="exportAll"'));
assert(html.includes('id="chatInput"'));
assert(html.includes('id="addProject"'));
assert(html.includes('id="addTask"'));
assert(html.includes('id="memoryForm"'));
assert(html.includes('id="memoryFile"'));
assert(html.includes('id="approvalCount"'));
assert(!html.includes('const STATIC_PREVIEW'),'Root v4 must not disable local input actions');
assert(!html.includes('SISTEMA ONLINE'),'Misleading cloud status must not remain');
assert(html.includes('Progetti, attività e ricordi funzionano sul tuo dispositivo'));
assert(html.includes('non legge né scrive il suo database'));
for(const route of ['jarvis','planner-v3','executor-v3','self-improvement-v3','autonomy-control-v3','sandbox-v3','recovery-download-v3']){
 assert(html.includes('https://jarvis-backend.jarvisproj3ct.workers.dev/'+route),'Missing Cloudflare secure link: '+route);
}
assert(!html.includes('href="/planner-v3"'),'Cloud module links must not resolve to GitHub Pages');
for(const key of ['jarvis_projects','jarvis_tasks','jarvis_approvals','jarvis_memories','jarvis_auto_memory']){
 assert(app.includes(key),'Historical phone storage key was changed: '+key);
}
assert(app.includes("data={format:'jarvis-local-data-v1'"),'Full local backup missing');
assert(app.includes("if(confirm('Eliminare questo progetto locale?'))"),'Project deletions must ask');
assert(app.includes("if(confirm('Eliminare questa attività locale?'))"),'Task deletions must ask');
assert(app.includes("value.replace(/^aggiungi attivit[àa] /i,'')"),'Voice-added task title must not include command');
assert(old.includes('../app.js')&&old.includes('../style.css'),'Legacy UI must share same-origin assets');
assert(old.includes('JARVIS v0.3'),'Old v0.3 interface must be retained');
execFileSync(process.execPath,['--check','app.js'],{stdio:'inherit'});
console.log('JARVIS v4 GitHub Pages checks passed: live local controls, historical data, backup, legacy route, protected cloud links.');
