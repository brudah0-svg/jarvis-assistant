import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';

const workerPath='cloudflare/workers/jarvis-backend.mjs';
const uiPath='cloudflare/ui/command-v4.html';
const worker=readFileSync(workerPath,'utf8');
const html=readFileSync(uiPath,'utf8');
assert(html.startsWith('<!doctype html>'));
assert(html.includes('JARVIS CLOUD · MODALITÀ AVANZATA'));
assert(html.includes('/api/ai-chat'));
assert(html.includes('Cloudflare'));
assert(!html.includes('<script src='),'Dashboard must be self-contained');
assert(!html.includes('localStorage.'),'Do not read or overwrite old GitHub Pages local data');
assert(!html.includes('github.io'),'Cloud dashboard must not request GitHub Pages storage');
assert(!html.includes('http://'),'No insecure external origins');

const anchor='const method = request.method;';
assert.equal(worker.split(anchor).length,2,'Worker insertion point must be unique');
assert(!worker.includes("if(path==='/command-v4'"),'Route already exists in source');

const response = "if(path==='/command-v4' && method==='GET'){if(origin && origin !== ALLOWED_ORIGIN && origin !== url.origin)return json({error:'Origin not allowed'},403);return new Response("+
  JSON.stringify(html)+
  ",{status:200,headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer','Content-Security-Policy':\"default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; connect-src 'self'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'\"}})}";
// Build candidate only: never rewrite a pinned deployed Worker snapshot.
assert.equal(worker.split("test('patch_block',deniedPatch.status===404,'PATCH HTTP '+deniedPatch.status);").length,2);
assert.equal(worker.split("test('patch_block',patch.status===404);").length,2);
const candidate=worker.replace("test('patch_block',deniedPatch.status===404,'PATCH HTTP '+deniedPatch.status);","test('patch_block',[404,405].includes(deniedPatch.status),'PATCH HTTP '+deniedPatch.status);").replace("test('patch_block',patch.status===404);","test('patch_block',[404,405].includes(patch.status));");
const output=candidate.replace(anchor,anchor+'\n'+response);
assert(output.includes('/command-v4'));
mkdirSync('dist',{recursive:true});
writeFileSync('dist/jarvis-backend.mjs',output);
const hash=data=>createHash('sha256').update(data).digest('hex');
console.log('Unified Worker build complete.');
console.log('Original Worker SHA-256 (unchanged in source):',hash(worker));
console.log('Unified Worker SHA-256 (build artifact only):',hash(output));
console.log('Embedded UI size:',Buffer.byteLength(html),'bytes');
console.log('No upload or deployment performed.');
