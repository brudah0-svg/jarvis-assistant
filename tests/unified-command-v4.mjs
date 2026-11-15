import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';

execFileSync(process.execPath,['scripts/build-unified.mjs'],{stdio:'inherit'});
execFileSync(process.execPath,['--check','dist/jarvis-backend.mjs'],{stdio:'inherit'});

const original=readFileSync('cloudflare/workers/jarvis-backend.mjs','utf8');
const built=readFileSync('dist/jarvis-backend.mjs','utf8');
assert(original.includes("test('patch_block',deniedPatch.status===404,'PATCH HTTP '+deniedPatch.status);"),'Immutable source must retain original regression');
assert(built.includes("test('patch_block',[404,405].includes(deniedPatch.status),'PATCH HTTP '+deniedPatch.status);"),'Candidate regression must support 405 rejection');
assert(built.includes("test('patch_block',[404,405].includes(patch.status));"),'Scheduled regression must support 405 rejection');
const module = await import('../dist/jarvis-backend.mjs');
const fetch=async (path,options={})=>module.default.fetch(new Request('https://jarvis.example'+path,options),{}, {waitUntil:()=>{}});
const page=await fetch('/command-v4');
assert.equal(page.status,200,'route should be available on the Worker origin');
assert.match(page.headers.get('content-type'),/text\/html/);
assert.match(page.headers.get('cache-control'),/no-store/);
assert.match(page.headers.get('content-security-policy'),/connect-src 'self'/);
const html=await page.text();
for(const route of ['/api/projects','/api/tasks','/api/memory','/api/proposals','/api/ai-chat','/api/chat-history','/planner-v3','/executor-v3','/self-improvement-v3','/autonomy-control-v3','/sandbox-v3','/recovery-download-v3']){
  assert(html.includes(route),'Missing unified UI backend link: '+route);
}
assert(html.includes('locali nel vecchio sito')||html.includes('ricordi del vecchio sito'),'Old data retention notice missing');
assert(!html.includes('localStorage.setItem'),'New UI must never overwrite old localStorage');
assert(!html.includes('localStorage.getItem'),'New UI must not silently read old localStorage');
assert(html.includes('confirm('),'Consequential task changes and imports require confirmation');
assert(html.includes("credentials:'same-origin'"),'API calls must stay on authenticated origin');
assert(html.includes('esc('),'User-controlled items should use output encoding');

const wrongMethod=await fetch('/command-v4',{method:'POST'});
assert.equal(wrongMethod.status,404,'UI route must be read-only');
const crossOrigin=await module.default.fetch(new Request('https://jarvis.example/command-v4',{headers:{Origin:'https://unexpected.example'}}),{}, {waitUntil:()=>{}});
assert.equal(crossOrigin.status,403,'Worker must reject unexpected Origin');
const projectApi=await fetch('/api/projects');
assert.notEqual(projectApi.status,200,'Mock without D1 must not leak projects');
const htmlFile=readFileSync('cloudflare/ui/command-v4.html','utf8');
assert.equal(html,htmlFile,'Served UI must match versioned HTML exactly');
console.log('Unified Command v4 checks passed: same-origin routing, UI modules, isolation, CSP, no local data migration.');
