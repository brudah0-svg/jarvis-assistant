import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {once} from 'node:events';
import {readFileSync} from 'node:fs';
import {webcrypto,createHash,randomUUID} from 'node:crypto';
import {chromium} from 'playwright';

const html=readFileSync('backup-verify-offline.html');
const {subtle}=webcrypto;
const enc=new TextEncoder();
const sha=t=>createHash('sha256').update(t).digest('hex');
const b64=b=>Buffer.from(b).toString('base64');
const password='only-a-synthetic-test-passphrase-123';
const snapshotId=randomUUID();
const schema=[{object_type:'table',object_name:'fixture',definition:'CREATE TABLE fixture(id TEXT PRIMARY KEY)'}];
const rows=[{table_name:'fixture',record_key:'000000',record_json:JSON.stringify({id:'synthetic-only'})}];
const schemaDigest=sha(schema.map(x=>x.object_type+'|'+x.object_name+'|'+x.definition).join('\n'));
const rowsDigest=sha(rows.map(x=>x.table_name+'\u0000'+x.record_key+'\u0000'+x.record_json).join('\n'));
const fixture={
 format:'JARVIS_VERIFIED_D1_BACKUP_V1',
 metadata:{id:snapshotId,verified:true,table_count:1,rows_total:1,schema_sha256:schemaDigest,rows_sha256:rowsDigest,created_at:'2026-11-15 00:00:00',isolated_restore_tested:false},
 schema,rows
};
async function pack(data,{wrongPlainHash=false}={}){
 const salt=webcrypto.getRandomValues(new Uint8Array(16)),iv=webcrypto.getRandomValues(new Uint8Array(12));
 const base=await subtle.importKey('raw',enc.encode(password),'PBKDF2',false,['deriveKey']);
 const key=await subtle.deriveKey({name:'PBKDF2',salt,iterations:310000,hash:'SHA-256'},base,{name:'AES-GCM',length:256},false,['encrypt']);
 const plain=enc.encode(JSON.stringify(data));
 const cipher=new Uint8Array(await subtle.encrypt({name:'AES-GCM',iv},key,plain));
 const digest=new Uint8Array(await subtle.digest('SHA-256',plain));
 if(wrongPlainHash)digest[0]^=1;
 const out={format:'JARVIS_AES256_GCM_BACKUP_V1',kdf:'PBKDF2_SHA256',iterations:310000,salt:b64(salt),iv:b64(iv),ciphertext:b64(cipher),plaintext_sha256:b64(digest),snapshot_id:snapshotId};
 return out;
}
const server=createServer((request,response)=>{
 if(request.url!=='/backup-verify-offline.html'||request.method!=='GET'){
  response.writeHead(404).end('Not Found');return;
 }
 response.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'}).end(html);
});
server.listen(0,'127.0.0.1');
await once(server,'listening');
const base='http://127.0.0.1:'+server.address().port;
let browser;
try{
 browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 const context=await browser.newContext({viewport:{width:393,height:852},isMobile:true,hasTouch:true,locale:'it-IT',colorScheme:'dark'});
 const page=await context.newPage();
 const errors=[],requests=[];
 page.on('pageerror',e=>errors.push(String(e)));
 page.on('request',r=>requests.push(r.url()));
 await page.goto(base+'/backup-verify-offline.html',{waitUntil:'load'});
 assert.match(await page.title(),/JARVIS/);
 const upload=async (envelope,pwd)=> {
  await page.locator('#archive').setInputFiles({name:'synthetic.jarvisbak',mimeType:'application/octet-stream',buffer:Buffer.from(JSON.stringify(envelope))});
  await page.locator('#password').fill(pwd);
  await page.locator('#verify').click();
  await page.waitForFunction(()=>document.querySelector('#result')?.dataset.state==='ok'||document.querySelector('#result')?.dataset.state==='error',{timeout:20000});
  const result=await page.locator('#result').textContent();
  const state=await page.locator('#result').getAttribute('data-state');
  assert.equal(await page.locator('#password').inputValue(),'','Password must be erased after verification');
  return {state,result};
 };
 const valid=await pack(fixture);
 const good=await upload(valid,password);
 assert.equal(good.state,'ok',good.result);
 assert.match(good.result,/1 tabelle, 1 record/);
 assert.match(good.result,/Impronte SHA-256 valide/);
 assert.match(good.result,/ripristino integrale.*non risulta collaudato/i);
 const wrong=await upload(valid,'bad-password');
 assert.equal(wrong.state,'error','Wrong password must fail closed');
 const tampered=structuredClone(valid);
 const ciphertext=Buffer.from(tampered.ciphertext,'base64');ciphertext[0]^=1;tampered.ciphertext=ciphertext.toString('base64');
 assert.equal((await upload(tampered,password)).state,'error','Changed ciphertext must fail');
 assert.equal((await upload(await pack({...fixture,rows:[{...rows[0],record_json:JSON.stringify({id:'changed'})}]}),password)).state,'error','Content with stale row digest must fail');
 assert.equal((await upload(await pack(fixture,{wrongPlainHash:true}),password)).state,'error','Wrong plaintext hash must fail');
 const badIdentity=structuredClone(valid);badIdentity.snapshot_id=randomUUID();
 assert.equal((await upload(badIdentity,password)).state,'error','Mismatched snapshot identity must fail');
 const sizes=await page.evaluate(()=>({viewport:innerWidth,scroll:document.documentElement.scrollWidth}));
 assert(sizes.scroll<=sizes.viewport+4,'Mobile page must not overflow');
 assert.deepEqual(errors,[],'No uncaught browser errors');
 assert.deepEqual(requests,[base+'/backup-verify-offline.html'],'Offline verifier must not request external resources');
 await context.close();
 console.log('Offline Android-like browser verification PASS: valid archive; wrong password; tampered ciphertext; invalid schema/row digests; wrong plaintext digest; snapshot ID mismatch; no network requests.');
}finally{
 if(browser)await browser.close();
 server.close();await once(server,'close');
}
