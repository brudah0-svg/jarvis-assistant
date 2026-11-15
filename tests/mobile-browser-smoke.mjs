import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {once} from 'node:events';
import {execFileSync} from 'node:child_process';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {mkdirSync} from 'node:fs';
import {chromium} from 'playwright';

// Chromium with Android-like touch/viewport, not physical Android or remote staging.
execFileSync(process.execPath,['scripts/build-v4-ui-next.mjs'],{stdio:'inherit'});
const worker=(await import(pathToFileURL(resolve('dist/jarvis-v4-ui-next.mjs')).href)).default;
const syntheticDB={prepare(sql){return{bind(){return this},async all(){
 if(sql.startsWith('SELECT id,name,description,status,created_at,updated_at FROM projects'))return {results:[{id:'staging-project',name:'Progetto dimostrativo',description:'Dati sintetici',status:'active'}]};
 if(sql.startsWith('SELECT * FROM tasks'))return {results:[{id:'staging-task',project_id:'staging-project',title:'Attività dimostrativa',status:'pending'}]};
 throw Error('Unexpected SQL: '+sql);
},async first(){throw Error('Unexpected SQL: '+sql)}}}};
const stats={get:[],other:[]};
const server=createServer(async(req,res)=>{
 try{
  if(req.method!=='GET'&&req.method!=='HEAD'){
   stats.other.push({method:req.method,path:req.url});
   res.writeHead(405,{'Content-Type':'application/json'}).end(JSON.stringify({error:'No synthetic writes allowed'}));
   return;
  }
  stats.get.push(req.url);
  // No user data or live Cloudflare origin is proxied into this browser test.
  const source=new Request('https://isolated.example'+req.url,{method:'GET'});
  const output=await worker.fetch(source,{DB:syntheticDB,VERSION:{id:'synthetic-worker-version'}},{waitUntil(){}});
  const headers=Object.fromEntries(output.headers);
  const bytes=Buffer.from(await output.arrayBuffer());
  res.writeHead(output.status,{...headers,'Content-Length':bytes.length}).end(bytes);
 }catch(error){
  res.writeHead(500,{'Content-Type':'text/plain'}).end(String(error));
 }
});
server.listen(0,'127.0.0.1');
await once(server,'listening');
const address=server.address();
const base='http://127.0.0.1:'+address.port;
let browser;
try{
 browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 const context=await browser.newContext({
  viewport:{width:393,height:852},deviceScaleFactor:3,isMobile:true,hasTouch:true,
  locale:'it-IT',colorScheme:'dark',reducedMotion:'reduce'
 });
 const page=await context.newPage();
 const errors=[];
 const outside=[];
 page.on('pageerror',e=>errors.push(String(e)));
 page.on('request',r=>{if(!r.url().startsWith(base+'/'))outside.push(r.url())});
 const response=await page.goto(base+'/command-v4',{waitUntil:'networkidle',timeout:30000});
 assert.equal(response.status(),200);
 await page.waitForFunction(()=>document.querySelector('#projectCount')?.textContent==='1',{timeout:15000});
 assert.equal(await page.locator('#taskCount').textContent(),'1');
 assert.match(await page.locator('#projects').textContent(),/Progetto dimostrativo/);
 assert.match(await page.locator('#tasks').textContent(),/Attività dimostrativa/);
 assert.match(await page.locator('#memories').textContent(),/Ricordo dimostrativo/);
 assert.equal(await page.locator('#addProject').isDisabled(),true);
 assert.equal(await page.locator('#addTask').isDisabled(),true);
 assert.equal(await page.locator('#chatInput').isDisabled(),true);
 assert.equal(await page.locator('#voiceBtn').isDisabled(),true);
 assert.equal(await page.locator('#memoryInput').isDisabled(),true);
 assert.equal(await page.locator('#memoryForm button[type="submit"]').isDisabled(),true);
 assert.equal(await page.locator('#chatForm button[type="submit"]').isDisabled(),true);
 assert.match(await page.locator('body').textContent(),/STAGING ISOLATO/);

 for(const width of [360,393,412]){
  await page.setViewportSize({width,height:852});
  const sizes=await page.evaluate(()=>({screen:window.innerWidth,document:document.documentElement.scrollWidth}));
  assert(sizes.document<=sizes.screen+4,'Unexpected horizontal overflow at '+width+'px: '+JSON.stringify(sizes));
 }
 await page.setViewportSize({width:393,height:852});
 mkdirSync('dist/browser-artifacts',{recursive:true});
 await page.screenshot({path:'dist/browser-artifacts/jarvis-v4-mobile.png',fullPage:true});
 assert.deepEqual(errors,[],'No uncaught browser JS errors');
 assert.deepEqual(outside,[],'No calls to live external services');
 assert.deepEqual(stats.other,[],'Isolated staging UI must not send writes');
 for(const route of ['/api/projects','/api/tasks','/api/memory','/api/proposals','/api/chat-history']){
  assert(stats.get.some(x=>x.startsWith(route)),'Missing browser GET route '+route);
 }
 console.log('Mobile Chromium smoke passed: synthetic dashboard, Android-like viewport/touch, no overflow, blocked controls, five data reads, zero live API calls, zero writes.');
 await context.close();
}finally{
 if(browser)await browser.close();
 server.close();
 await once(server,'close');
}
