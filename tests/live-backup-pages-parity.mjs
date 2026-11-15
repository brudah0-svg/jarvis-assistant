import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';

const expected=readFileSync('backup-verify-offline.html');
const sourceDigest=createHash('sha256').update(expected).digest('hex');
const url='https://brudah0-svg.github.io/jarvis-assistant/backup-verify-offline.html';
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function readPublished(){
 const response=await fetch(url+'?jarvis_parity='+sourceDigest.slice(0,16),{
  headers:{'Accept':'text/html','Cache-Control':'no-cache'},
  redirect:'error',signal:AbortSignal.timeout(20000)
 });
 assert.equal(response.status,200,'GitHub Pages must serve HTTP 200');
 assert.match(response.headers.get('content-type')||'',/text\/html/i,'Page must be HTML');
 const published=new Uint8Array(await response.arrayBuffer());
 assert(published.length>2000&&published.length<500000,'Page size must be plausible and bounded');
 const liveDigest=createHash('sha256').update(published).digest('hex');
 assert.equal(liveDigest,sourceDigest,'Published file differs from approved source. Check deployment or file changes.');
 const content=new TextDecoder().decode(published);
 assert(content.includes("connect-src 'none'"),'Published CSP must block outgoing network');
 assert(content.includes("default-src 'none'"),'Published CSP must block remote assets');
 assert(content.includes("form-action 'none'"),'Published CSP must block form submission');
 assert(content.includes('JARVIS_AES256_GCM_BACKUP_V1'),'Expected encrypted backup format missing');
 assert(!/\bfetch\s*\(|\bXMLHttpRequest\b|\bWebSocket\b|\bsendBeacon\s*\(/.test(content),'Published verifier must not contain API upload calls');
}
let lastError;
for(let attempt=1;attempt<=5;attempt++){
 try{
  await readPublished();
  lastError=null;
  console.log('Public verifier parity confirmed on attempt '+attempt);
  break;
 }catch(error){
  lastError=error;
  console.warn('Publication check '+attempt+'/5: '+String(error.message||error).slice(0,200));
  if(attempt<5)await sleep(15000);
 }
}
if(lastError)throw lastError;
console.log('GitHub Pages live backup verifier PASSED. HTTP 200, exact SHA-256 source parity, strict local-only CSP, encrypted format. No backup or password handled.');
