import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {once} from 'node:events';
import {mkdirSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {pathToFileURL} from 'node:url';
import {resolve} from 'node:path';
import {chromium} from 'playwright';

// Browser tests run against a local synthetic API and the complete candidate Worker UI.
// No Cloudflare network, Cloudflare login, real users or real databases.
execFileSync(process.execPath,['scripts/build-v4-unified-production-candidate.mjs'],{stdio:'inherit'});
const worker=(await import(pathToFileURL(resolve('dist/jarvis-backend-unified-candidate.mjs')).href)).default;
const projects=[{id:'cloud-base',name:'Progetto già nel Cloud',description:'Sintetico',status:'active'}];
const tasks=[{id:'task-base',project_id:'cloud-base',title:'Attività Cloud',status:'pending'}];
const memories=[{id:'memory-base',content:'Memoria Cloud',category:'Altro',created_at:'2026-11-15'}];
const proposals=[];
const requests=[],writes=[];
let counter=0,externalNetwork=[];
const json=(res,status,data)=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'}).end(JSON.stringify(data))};
const server=createServer(async(req,res)=>{
 const url=new URL(req.url||'/','http://127.0.0.1');
 const path=url.pathname;
 try{
  if((path==='/jarvis-unified'||path==='/jarvis-app.webmanifest')&&req.method==='GET'){
   const response=await worker.fetch(new Request('https://isolated.test'+path),{},{waitUntil(){}});
   res.writeHead(response.status,Object.fromEntries(response.headers)).end(Buffer.from(await response.arrayBuffer()));return;
  }
  if(!path.startsWith('/api/')){res.writeHead(404).end('Not Found');return}
  requests.push({path,method:req.method});
  if(req.method==='GET'){
   if(path==='/api/projects')return json(res,200,{projects});
   if(path==='/api/tasks')return json(res,200,{tasks});
   if(path==='/api/memory')return json(res,200,{memories});
   if(path==='/api/proposals')return json(res,200,{proposals});
   if(path==='/api/chat-history')return json(res,200,{messages:[]});
   return json(res,404,{error:'Route unavailable'});
  }
  if(req.method!=='POST'&&req.method!=='PATCH')return json(res,405,{error:'Method disabled'});
  let content='';for await(const chunk of req){content+=chunk;if(content.length>10000)throw Error('Unexpected payload')}
  const body=JSON.parse(content||'{}');writes.push({path,method:req.method,body});
  if(path==='/api/projects'&&req.method==='POST'){
   const project={id:'created-project-'+(++counter),name:body.name,description:body.description||'',status:'active'};
   projects.push(project);return json(res,201,{status:'created',project});
  }
  if(path==='/api/tasks'&&req.method==='POST'){
   const task={id:'created-task-'+(++counter),title:body.title,status:'pending',project_id:body.project_id};
   tasks.push(task);return json(res,201,{status:'created',task});
  }
  if(path.startsWith('/api/tasks/')&&req.method==='PATCH'){
   const item=tasks.find(t=>t.id===path.split('/').pop());if(!item)return json(res,404,{error:'Task missing'});
   item.status=body.status;return json(res,200,{status:'updated',task:item});
  }
  if(path==='/api/memory'&&req.method==='POST'){
   const memory={id:'created-memory-'+(++counter),content:body.content,category:body.category,created_at:'2026-11-15'};
   memories.push(memory);return json(res,201,{status:'created',memory});
  }
  if(path==='/api/site-builder'&&req.method==='POST')return json(res,200,{status:'generated',format:'standalone-static-html',html:'<!doctype html><html lang="it"><head><meta charset="utf-8"><title>Pinco Pallo</title></head><body><h1>Pinco Pallo - Sito creato</h1><p>Impianti elettrici</p>'+('<section><p>Testi di prova per il collaudo mobile del sito. Nessun dato personale o esterno.</p></section>'.repeat(8))+'</body></html>',siteTitle:'Pinco Pallo',requires_publication_approval:true,production_deployed:false,operations_executed:false});
  if(path==='/api/plan'&&req.method==='POST')return json(res,200,{status:'proposal',goal:body.goal,steps:[{order:1,title:'Preparare il prototipo'},{order:2,title:'Collaudare su Android'}],requires_approval:true,notice:'Bozza sintetica senza scritture'});
  if(path==='/api/chat-history'&&req.method==='POST')return json(res,201,{status:'created'});
  if(path==='/api/ai-chat'&&req.method==='POST')return json(res,200,{answer:'Risposta sintetica, nessuna AI reale utilizzata.'});
  return json(res,404,{error:'No synthetic route'});
 }catch(e){json(res,500,{error:String(e).slice(0,200)})}
});
server.listen(0,'127.0.0.1');
await once(server,'listening');
let browser;
try{
 browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 const context=await browser.newContext({viewport:{width:393,height:852},isMobile:true,hasTouch:true,deviceScaleFactor:3,colorScheme:'dark',locale:'it-IT',reducedMotion:'reduce'});
 const page=await context.newPage();
 const jsErrors=[],dialogs=[];
 page.on('pageerror',e=>jsErrors.push(String(e)));
 page.on('request',request=>{
  if(!request.url().startsWith('http://127.0.0.1:'+server.address().port+'/'))externalNetwork.push(request.url())
 });
 page.on('dialog',async dialog=>{
  dialogs.push({type:dialog.type(),message:dialog.message()});
  if(dialog.message().includes('Confermi la creazione del progetto')){await dialog.dismiss();return}
  if(dialog.message().includes('Creare l’attività')){await dialog.accept();return}
  if(dialog.message().startsWith('Importare nel Cloud')){
   if(dialogs.filter(d=>d.message.startsWith('Importare nel Cloud')).length===1)await dialog.dismiss();
   else await dialog.accept();
  } else await dialog.dismiss();
 });
 const origin='http://127.0.0.1:'+server.address().port;
 const response=await page.goto(origin+'/jarvis-unified',{waitUntil:'networkidle',timeout:30000});
 assert.equal(response.status(),200);
 await page.waitForFunction(()=>document.querySelector('#projectCount')?.textContent==='1',{timeout:15000});
 assert.equal(await page.locator('#taskCount').textContent(),'1');
 assert.match(await page.locator('#aiApprovalNotice').textContent(),/Centro approvazioni/);
 assert.match(await page.locator('#cloudNotice').textContent(),/Connesso/);
 const advanced=await page.locator('a.module').evaluateAll(links=>links.map(a=>({href:a.getAttribute('href'),url:a.href})));
 assert(advanced.length>=6);
 assert(advanced.every(link=>link.href.startsWith('/')&&link.url.startsWith(origin+'/')),'Advanced functionality must stay on the same origin');
 const manifest=await page.locator('link[rel=manifest]').getAttribute('href');
 assert.equal(manifest,'/jarvis-app.webmanifest');
 for(const width of [360,393,412]){
  await page.setViewportSize({width,height:852});
  const size=await page.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth}));
  assert(size.scroll<=size.width+4,'Unexpected horizontal overflow '+JSON.stringify(size));
 }
 await page.setViewportSize({width:864,height:960});
 const wideMobileLike=await page.evaluate(()=>({
   gridColumns:getComputedStyle(document.querySelector('.grid')).gridTemplateColumns,
   firstPanelWidth:document.querySelector('.grid .panel').getBoundingClientRect().width,
   viewport:window.innerWidth,
   pageWidth:document.documentElement.scrollWidth
 }));
 assert(wideMobileLike.gridColumns.trim().split(/\s+/).length===1,'Narrow desktop-mode browser must use a single column: '+JSON.stringify(wideMobileLike));
 assert(wideMobileLike.firstPanelWidth>600,'Panels should use available screen width');
 assert(wideMobileLike.pageWidth<=wideMobileLike.viewport+4,'No horizontal overflow in desktop-site mode');
 await page.setViewportSize({width:393,height:852});
 const data={
  format:'jarvis-local-data-v1',
  projects:[{name:'Nuovo progetto locale',note:'Creato localmente'}],
  tasks:[{title:'Attività locale uno',done:false},{title:'Attività locale già conclusa',done:true}],
  memories:[{text:'Ricordo locale',category:'Preferenze'}],
  approvals:[{title:'Mai trasferire e mai eseguire'}],
  autoMemory:true
 };
 const upload=()=>page.locator('#workspaceFile').setInputFiles({name:'jarvis-local-data-backup.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(data))});
 const writesBefore=writes.length;
 await upload();
 await page.waitForFunction(()=>document.querySelector('#workspaceImportStatus')?.textContent?.includes('annullata'),{timeout:10000});
 assert.equal(writes.length,writesBefore,'Cancelled import must not write anything');
 await upload();
 await page.waitForFunction(()=>document.querySelector('#workspaceImportStatus')?.textContent?.includes('Importazione completata'),{timeout:25000});
 assert.equal(await page.locator('#projectCount').textContent(),'2');
 assert.equal(await page.locator('#taskCount').textContent(),'2','One of the three imported and existing tasks is complete, so only two remain open');
 assert.equal(projects.length,2);
 assert.equal(tasks.length,3);
 assert.equal(memories.length,2);
 assert.equal(tasks.find(x=>x.title==='Attività locale già conclusa')?.status,'done');
 assert.equal(proposals.length,0,'Local approvals must never be transferred');
 assert(writes.every(w=>w.path!=='/api/proposals'),'Never submit local approvals');
 const countAfter=writes.length;
 await upload();
 await page.waitForFunction(()=>document.querySelector('#workspaceImportStatus')?.textContent?.includes('Importazione completata: 0 progetti, 0 attività, 0 ricordi'),{timeout:15000});
 assert.equal(writes.length,countAfter,'Repeat import must skip duplicate writes');
 await page.locator('#chatInput').fill('Ciao JARVIS, test sintetico');
 await page.locator('#chatForm button[type=submit]').click();
 await page.waitForFunction(()=>document.querySelector('#conversation')?.textContent?.includes('Risposta sintetica'),{timeout:15000});
 assert(writes.some(w=>w.path==='/api/ai-chat'&&w.body.message==='Ciao JARVIS, test sintetico'));
 assert(writes.some(w=>w.path==='/api/chat-history'&&w.body.role==='user'));
 // Actual core commands. The first project confirmation is denied: no write.
 const projectWritesBefore=writes.filter(w=>w.path==='/api/projects').length;
 await page.locator('#chatInput').fill('Crea progetto: Da non salvare');
 await page.locator('#chatForm button[type=submit]').click();
 await page.waitForFunction(()=>document.querySelector('#conversation')?.textContent?.includes('Creazione annullata'),{timeout:15000});
 assert.equal(writes.filter(w=>w.path==='/api/projects').length,projectWritesBefore,'Denied project create must not mutate D1');
 assert(!projects.some(p=>p.name==='Da non salvare'));
 // A task must target an explicitly selected existing Cloud project; no guessing.
 await page.locator('#activeProject').selectOption('cloud-base');
 const aiCallsBefore=writes.filter(w=>w.path==='/api/ai-chat').length;
 await page.locator('#chatInput').fill('Aggiungi attività: Controlla il prototipo');
 await page.locator('#chatForm button[type=submit]').click();
 await page.waitForFunction(()=>document.querySelector('#conversation')?.textContent?.includes('creata nel progetto'),{timeout:15000});
 assert(tasks.some(t=>t.title==='Controlla il prototipo'&&t.project_id==='cloud-base'));
 assert.equal(writes.filter(w=>w.path==='/api/ai-chat').length,aiCallsBefore,'Confirmed operational command must not be reinterpreted by AI');
 const coreTaskCount=writes.filter(w=>w.path==='/api/tasks'&&w.method==='POST').length;
 await page.locator('#chatInput').fill('Aggiungi attività: Controlla il prototipo');
 await page.locator('#chatForm button[type=submit]').click();
 await page.waitForFunction(()=>document.querySelector('#conversation')?.textContent?.includes('nessun duplicato creato'),{timeout:15000});
 assert.equal(writes.filter(w=>w.path==='/api/tasks'&&w.method==='POST').length,coreTaskCount,'Repeated core task must not duplicate');
 assert.equal(proposals.length,0,'Chat core commands must not authorize proposals');
 const beforePlanWrites=writes.filter(w=>w.path==='/api/projects'||w.path==='/api/tasks').length;
 await page.locator('#chatInput').fill('Pianifica: costruire il mio assistente AI');
 await page.locator('#chatForm button[type=submit]').click();
 await page.waitForFunction(()=>document.querySelector('#conversation')?.textContent?.includes('Bozza operativa per'),{timeout:15000});
 assert(writes.some(w=>w.path==='/api/plan'&&w.body.goal==='costruire il mio assistente AI'),'Planning must use existing same-origin API');
 assert.equal(writes.filter(w=>w.path==='/api/projects'||w.path==='/api/tasks').length,beforePlanWrites,'Planning cannot write projects or tasks');
 assert.equal(proposals.length,0);

 // WEBSITE BUILDER: same-origin API, sandboxed preview, user-initiated download, no external publishing.
 await page.locator('#siteBrief').fill('Sito elegante per Pinco Pallo, un elettricista con servizi di domotica e impianti.');
 await page.locator('#siteStyle').selectOption('energia');
 const builderBefore=writes.filter(w=>w.path==='/api/site-builder').length;
 await page.locator('#siteGenerate').click();
 await page.waitForFunction(()=>document.querySelector('#siteDownload')&&!document.querySelector('#siteDownload').disabled,{timeout:15000});
 assert.equal(writes.filter(w=>w.path==='/api/site-builder').length,builderBefore+1);
 assert.equal(await page.locator('#sitePreview').getAttribute('sandbox'),'','Preview must disable scripts and browser capabilities');
 assert.equal(await page.locator('#sitePreview').isHidden(),false);
 assert((await page.locator('#sitePreview').getAttribute('srcdoc')).includes('Pinco Pallo - Sito creato'));
 assert.equal(writes.filter(w=>/publish|deploy|github/i.test(w.path)).length,0,'No publishing or external operations');
 const downloadPromise=page.waitForEvent('download',{timeout:10000});
 await page.locator('#siteDownload').click();
 const download=await downloadPromise;
 assert.equal(download.suggestedFilename(),'sito-jarvis.html','Standalone site must download');
 const builderAfter=writes.filter(w=>w.path==='/api/site-builder').length;
 await page.locator('#chatInput').fill('Crea un sito web per Pinco Pallo elettricista in Veneto');
 await page.locator('#chatForm button[type=submit]').click();
 await page.waitForFunction(()=>document.querySelector('#conversation')?.textContent?.includes('Ho generato il sito'),{timeout:15000});
 assert.equal(writes.filter(w=>w.path==='/api/site-builder').length,builderAfter+1,'Voice/text chat command must dispatch to Website Builder');

 assert.deepEqual(jsErrors,[],'No unhandled JS errors');
 assert.deepEqual(externalNetwork,[],'No external domains were contacted');
 mkdirSync('dist/browser-artifacts',{recursive:true});
 await page.screenshot({path:'dist/browser-artifacts/jarvis-unified-android.png',fullPage:true});
 await context.close();
 console.log('Unified JARVIS Chromium mobile PASS: dashboard, AI chat stub, same-origin modules, cancelled import, confirmed import, duplicate skip, ignored approvals, no data loss and no external API calls.');
}finally{
 if(browser)await browser.close();
 server.close();
 await once(server,'close');
}
