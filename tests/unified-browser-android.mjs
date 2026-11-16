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
const savedDrafts=[];
const siteJobs=[];
const multipageProjects=[];
const multiFiles={
 'index.html':'<!doctype html><html><body><nav><a href="index.html">Home</a><a href="servizi.html">Servizi</a><a href="contatti.html">Contatti</a></nav><h1>Officina Demo Home</h1></body></html>',
 'servizi.html':'<!doctype html><html><body><nav><a href="index.html">Home</a><a href="servizi.html">Servizi</a><a href="contatti.html">Contatti</a></nav><h1>Officina Demo Servizi</h1></body></html>',
 'contatti.html':'<!doctype html><html><body><nav><a href="index.html">Home</a><a href="servizi.html">Servizi</a><a href="contatti.html">Contatti</a></nav><h1>Officina Demo Contatti</h1></body></html>'
};

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
   if(path==='/api/site-projects')return json(res,200,{status:'ok',projects:multipageProjects.map(({id,title})=>({id,title}))});
   if(path.startsWith('/api/site-projects/')&&path.endsWith('/export')){
    const id=path.split('/')[3];if(!multipageProjects.some(p=>p.id===id))return json(res,404,{error:'Not found'});
    res.writeHead(200,{'Content-Type':'application/zip','Content-Disposition':'attachment; filename="jarvis-sito-multipagina.zip"'}).end(Buffer.concat([Buffer.from([0x50,0x4b,0x03,0x04]),Buffer.alloc(1024)]));return;
   }
   if(path.startsWith('/api/site-projects/')){
    const id=path.split('/')[3],project=multipageProjects.find(p=>p.id===id);
    return json(res,project?200:404,project?{status:'ok',project}:{error:'Not found'});
   }
   if(path==='/api/site-jobs')return json(res,200,{status:'ok',jobs:siteJobs});
   if(path.startsWith('/api/site-jobs/')){const found=siteJobs.find(j=>j.id===path.split('/').pop());return json(res,found?200:404,found?{status:'ok',job:found}:{error:'Not found'});}
   if(path==='/api/site-drafts')return json(res,200,{status:'ok',drafts:savedDrafts.map(({id,title,brief,style,created_at})=>({id,title,brief,style,created_at}))});
   if(path.startsWith('/api/site-drafts/')){const found=savedDrafts.find(x=>x.id===path.split('/').pop());return json(res,found?200:404,found?{status:'ok',draft:found}:{error:'Not found'});}
   if(path==='/api/projects')return json(res,200,{projects});
   if(path==='/api/tasks')return json(res,200,{tasks});
   if(path==='/api/memory')return json(res,200,{memories});
   if(path==='/api/proposals')return json(res,200,{proposals});
   if(path==='/api/autonomy/status')return json(res,200,{status:'healthy',latest:{checks_passed:5,checks_total:5},pending_approvals:[],automatic_publication:false});
    if(path==='/api/autonomy/remediations')return json(res,200,{status:'ok',cases:[{state:'needs_review',title:'Synthetic QA finding'}],automatic_execution:false});
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
  if(path==='/api/site-projects'&&req.method==='POST'){
   const id='00000000-0000-4000-8000-'+String(++counter).padStart(12,'0');
   const project={id,title:'Officina Demo',brief:body.brief,files:multiFiles,audit:{passed:true,pages_checked:3},attempts:1};
   multipageProjects.unshift(project);
   return json(res,201,{status:'completed',format:'three-page-static-site',project,production_deployed:false,requires_publication_approval:true,external_actions_executed:false});
  }
  if(path==='/api/site-jobs'&&req.method==='POST'){
    const id='00000000-0000-4000-8000-'+String(++counter).padStart(12,'0');
    const job={id,brief:body.brief,style:body.style,contact_email:body.contactEmail||'',status:'queued',attempt_count:0,draft_id:null,created_at:'2026-11-15 16:40:00'};
    siteJobs.push(job);return json(res,201,{status:'queued',job,external_publication:false});
  }
  if(path.startsWith('/api/site-jobs/')&&path.endsWith('/run')&&req.method==='POST'){
    const id=path.split('/')[3];const job=siteJobs.find(j=>j.id===id);
    if(!job)return json(res,404,{error:'Not found'});
    if(job.status==='completed')return json(res,200,{status:'completed',job,already_completed:true});
    job.status='completed';job.attempt_count++;job.draft_id=id;
    const html='<!doctype html><html><head><meta charset="utf-8"><title>Generated</title></head><body><h1>Sito generato e salvato</h1></body></html>';
    savedDrafts.push({id,title:'Sito completato',brief:job.brief,style:job.style,contact_email:job.contact_email,html,created_at:'2026-11-15 16:40:00'});
    return json(res,200,{status:'completed',job,external_publication:false,requires_publication_approval:true});
  }
  if(path==='/api/site-builder'&&req.method==='POST'){
    const html='<!doctype html><html lang="it"><head><meta charset="utf-8"><title>Pinco Pallo</title></head><body><h1>Pinco Pallo - Sito creato</h1><p>Impianti elettrici</p>'+('<section><p>Testi di prova per il collaudo mobile del sito. Nessun dato personale o esterno.</p></section>'.repeat(8))+'</body></html>';
    let draftId=null,saved=false;
    if(body.saveDraft===true){
      draftId='00000000-0000-4000-8000-'+String(++counter).padStart(12,'0');
      savedDrafts.push({id:draftId,title:'Pinco Pallo',brief:body.brief,style:body.style,contact_email:body.contactEmail||'',html,created_at:'2026-11-15 15:40:00'});
      saved=true;
    }
    return json(res,200,{status:'generated',format:'standalone-static-html',html,siteTitle:'Pinco Pallo',saved,draftId,requires_publication_approval:true,production_deployed:false,operations_executed:false});
  }
  if(path==='/api/plan'&&req.method==='POST')return json(res,200,{status:'proposal',goal:body.goal,steps:[{order:1,title:'Preparare il prototipo'},{order:2,title:'Collaudare su Android'}],requires_approval:true,notice:'Bozza sintetica senza scritture'});
  if(path==='/api/executor/run'&&req.method==='POST')return json(res,200,{status:'completed',project_id:body.project_id,total_checks:5,passed:4,warnings:1,read_only:true,automatic_fix_applied:false});
   if(path==='/api/self-improvement/prepare'&&req.method==='POST')return json(res,200,{status:'ok',project_id:body.project_id,automatic_changes:0,generated:1,proposals:[{id:'synthetic-safe-proposal'}]});
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
 await page.addInitScript(()=>{
  window.__jarvisSpoken=[];
  window.__jarvisAutoRecognition=true;
  window.__jarvisRecognitionInstances=[];
  window.SpeechSynthesisUtterance=class {constructor(text){this.text=text}};
  Object.defineProperty(window,'speechSynthesis',{configurable:true,value:{
   cancel(){},
   speak(utterance){
    window.__jarvisSpoken.push(utterance.text);
    if(window.__jarvisAutoRecognition===false)setTimeout(()=>utterance.onend?.(),25);
   }
  }});
  window.SpeechRecognition=class {
   start(){
    window.__jarvisRecognitionInstances.push(this);
    if(window.__jarvisAutoRecognition)queueMicrotask(()=>this.onresult?.({results:[[{transcript:'Puoi spiegarmi cosa fai, Jarvis?'}]]}));
   }
   abort(){this.onend?.()}
  };
 });

 const jsErrors=[],dialogs=[];
 page.on('pageerror',e=>jsErrors.push(String(e)));
 page.on('request',request=>{
  if(!request.url().startsWith('http://127.0.0.1:'+server.address().port+'/'))externalNetwork.push(request.url())
 });
 page.on('dialog',async dialog=>{
  dialogs.push({type:dialog.type(),message:dialog.message()});
  if(dialog.message().includes('Confermi la creazione del progetto')){if(dialog.message().includes('Sito web per elettricista'))await dialog.accept();else await dialog.dismiss();return}
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
 await page.waitForFunction(()=>document.querySelector('#projectCount')?.textContent==='2'&&document.querySelector('#taskCount')?.textContent==='2',{timeout:15000});
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
 // The colloquial command in the real Android screenshot must be routed to D1, not advisory AI.
 const naturalBefore=writes.filter(w=>w.path==='/api/projects').length;
 const aiBeforeNatural=writes.filter(w=>w.path==='/api/ai-chat').length;
 await page.locator('#chatInput').fill('Ciao Jarvis mi crei un progetto per un elettricista per un sito web di un elettricista');
 await page.locator('#chatForm button[type=submit]').click();
 await page.waitForFunction(()=>document.querySelector('#conversation')?.textContent?.includes('Progetto “Sito web per elettricista” creato e confermato dal server Cloud.'),{timeout:15000});
 assert.equal(writes.filter(w=>w.path==='/api/projects').length,naturalBefore+1,'Colloquial project creation must make a verified D1 write');
 assert.equal(writes.filter(w=>w.path==='/api/ai-chat').length,aiBeforeNatural,'Colloquial project command must not go to advisory AI');
 assert(projects.some(p=>p.name==='Sito web per elettricista'));
 assert((await page.locator('#projects').textContent()).includes('Sito web per elettricista'),'Newly created project must appear in the list');
 const createdBeforeDup=writes.filter(w=>w.path==='/api/projects').length;
 await page.locator('#chatInput').fill('Ciao Jarvis mi crei un progetto per un elettricista per un sito web di un elettricista');
 await page.locator('#chatForm button[type=submit]').click();
 await page.waitForFunction(()=>document.querySelector('#conversation')?.textContent?.includes('Un progetto con questo nome esiste già'),{timeout:15000});
 assert.equal(writes.filter(w=>w.path==='/api/projects').length,createdBeforeDup,'Repeated request must not create duplicate');

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
 assert.equal(savedDrafts.length,1,'User-selected save must store a single draft in fake Cloud');
 await page.waitForFunction(()=>document.querySelector('#siteDraftsList')?.querySelector('button[data-site-draft-id]'),{timeout:15000});
 assert.equal(await page.locator('#siteDraftsList button').count(),1,'Saved draft appears in the list');
 await page.locator('#siteDraftsList button[data-site-draft-id]').click();
 await page.waitForFunction(()=>document.querySelector('#siteBuilderStatus')?.textContent?.includes('recuperata dal Cloud'),{timeout:15000});
 assert.equal(await page.locator('#siteDownload').isEnabled(),true);

 assert.equal(await page.locator('#sitePreview').getAttribute('sandbox'),'','Preview must disable scripts and browser capabilities');
 assert.equal(await page.locator('#sitePreview').isHidden(),false);
 assert((await page.locator('#sitePreview').getAttribute('srcdoc')).includes('Pinco Pallo - Sito creato'));
 assert.equal(writes.filter(w=>/publish|deploy|github/i.test(w.path)).length,0,'No publishing or external operations');
 const downloadPromise=page.waitForEvent('download',{timeout:10000});
 await page.locator('#siteDownload').click();
 const download=await downloadPromise;
 assert.equal(download.suggestedFilename(),'sito-jarvis.html','Standalone site must download');
 const builderAfter=writes.filter(w=>w.path==='/api/site-builder').length;
 const queuedBefore=siteJobs.length;
 const runBefore=writes.filter(w=>w.path.endsWith('/run')).length;
 await page.locator('#chatInput').fill('Hey Jarvis, creami un sito web per Pinco Pallo elettricista in Veneto');
 await page.locator('#chatForm button[type=submit]').click();
 await page.waitForFunction(()=>document.querySelector('#conversation')?.textContent?.includes('Ho generato il sito'),{timeout:15000});
 assert.equal(writes.filter(w=>w.path==='/api/site-builder').length,builderAfter,'Chat must use persistent jobs, not an untracked one-shot generation');
 assert.equal(siteJobs.length,queuedBefore+1,'One utterance must create exactly one persistent job');
 assert.equal(siteJobs.at(-1).status,'completed','The job must auto-run without clicking Avvia');
 assert.equal(writes.filter(w=>w.path.endsWith('/run')).length,runBefore+1,'One utterance must auto-run exactly once');
 assert.equal(savedDrafts.length,2,'Website command must save the result privately in Cloud D1');
 assert.equal(await page.locator('#conversation iframe[sandbox=""]').count(),1,'Website preview must appear directly in JARVIS conversation');
 assert.equal(await page.locator('#sitePreview').isHidden(),false);
 assert.equal(writes.filter(w=>/publish|deploy|github/i.test(w.path)).length,0,'No external publication from chat');


 // Durable job: queue and run, then reload Android browser and recover the same completed site.
 await page.locator('#siteBrief').fill('Realizza un sito moderno per Pinco Pallo, manutenzione e domotica per famiglie.');
 await page.locator('#siteJobCreate').click();
 await page.waitForFunction(()=>document.querySelector('#siteJobsList button[data-job-id]'),{timeout:15000});
 assert.equal(siteJobs.length,queuedBefore+2);
 assert.equal(siteJobs.at(-1).status,'queued');
 await page.locator('#siteJobsList button[data-job-id]').last().click();
 await page.waitForFunction(()=>document.querySelector('#siteJobsStatus')?.textContent?.includes('Sito completato e salvato'),{timeout:15000});
 assert.equal(siteJobs.at(-1).status,'completed');
 assert.equal(savedDrafts.length,3);
 assert.equal(writes.filter(w=>/publish|deploy|github/i.test(w.path)).length,0);
 await page.reload({waitUntil:'networkidle'});
 await page.waitForFunction(()=>document.querySelector('#siteJobsList button[data-job-id]')?.textContent==='Apri sito',{timeout:15000});
 await page.locator('#siteJobsList button[data-job-id]').last().click();
 await page.waitForFunction(()=>document.querySelector('#siteBuilderStatus')?.textContent?.includes('Sito recuperato dall’incarico'),{timeout:15000});
 assert.equal(await page.locator('#siteDownload').isEnabled(),true);
 assert((await page.locator('#sitePreview').getAttribute('srcdoc')).includes('Sito generato e salvato'));
 assert.equal(writes.filter(w=>/publish|deploy|github/i.test(w.path)).length,0);
 // Natural-language read-only recovery: no separate dashboard buttons or writes.
 const writesBeforeLookup=writes.length;
 await page.locator('#chatInput').fill('Hey Jarvis, mostrami i lavori');
 await page.locator('#chatForm button[type=submit]').click();
 await page.waitForFunction(()=>document.querySelector('#conversation')?.textContent?.includes('Ho trovato 2 incarichi'),{timeout:15000});
 assert.equal(writes.filter(w=>w.path==='/api/ai-chat'&&w.body.message?.includes('mostrami i lavori')).length,0,'Job status must use D1, not AI claims');
 assert.equal(writes.filter(w=>/publish|deploy|github/i.test(w.path)).length,0);
 await page.locator('#chatInput').fill('Hey Jarvis, apri l’ultimo sito');
 await page.locator('#chatForm button[type=submit]').click();
 await page.waitForFunction(()=>document.querySelector('#conversation')?.textContent?.includes('Ho recuperato il tuo sito completato più recente'),{timeout:15000});
 assert.equal(await page.locator('#conversation iframe[sandbox=""]').count(),1,'Chat must show private recovered preview without extra clicks');
 assert.equal(await page.locator('#conversation iframe[sandbox=""]').first().getAttribute('referrerpolicy'),'no-referrer');
 assert.equal(writes.length,writesBeforeLookup+4,'Only user/assistant chat-history persistence is permitted for read-only requests');
 assert.equal(writes.filter(w=>/publish|deploy|github/i.test(w.path)).length,0);



 // One voice/text command creates three private pages, and retrieval/navigation remains same-origin.
 const writesBeforeMulti=writes.filter(w=>w.path==='/api/site-projects').length;
 await page.locator('#chatInput').fill('Hey Jarvis, creami un sito multipagina per Officina Demo');
 await page.locator('#chatForm button[type=submit]').click();
 await page.waitForFunction(()=>document.querySelector('#conversation')?.textContent?.includes('Ho creato il sito multipagina'),{timeout:15000});
 assert.equal(writes.filter(w=>w.path==='/api/site-projects').length,writesBeforeMulti+1);
 assert.equal(multipageProjects.length,1);
 assert.equal(await page.locator('#conversation iframe[title="Anteprima isolata multipagina"]').count(),1);
 assert.equal(await page.locator('#conversation iframe[title="Anteprima isolata multipagina"]').getAttribute('sandbox'),'');
 const controls=page.locator('#conversation section').last();
 await controls.getByRole('button',{name:'Servizi'}).click();
 assert((await page.locator('#conversation iframe[title="Anteprima isolata multipagina"]').getAttribute('srcdoc')).includes('Officina Demo Servizi'));
 const zipDownload=page.waitForEvent('download',{timeout:10000});
 await controls.getByRole('button',{name:'Scarica ZIP'}).click();
 assert.equal((await zipDownload).suggestedFilename(),'jarvis-sito-multipagina.zip');
 await page.locator('#chatInput').fill('Hey Jarvis, apri l’ultimo sito multipagina');
 await page.locator('#chatForm button[type=submit]').click();
 await page.waitForFunction(()=>document.querySelector('#conversation')?.textContent?.includes('Ho recuperato il tuo ultimo sito multipagina'),{timeout:15000});
 assert.equal(await page.locator('#conversation iframe[title="Anteprima isolata multipagina"]').count(),2);
 assert.equal(multipageProjects.length,1,'Read-only retrieval must not regenerate');
 assert.equal(writes.filter(w=>/publish|deploy|github/i.test(w.path)).length,0);
 
 // Tap-to-talk: a recognized Italian phrase submits to the existing AI path;
 // only then does JARVIS speak the server-supplied reply.
 await page.locator('#voiceBtn').click();
 await page.waitForFunction(()=>window.__jarvisSpoken?.some(x=>x.includes('Risposta sintetica')),{timeout:15000});
 assert.equal(await page.locator('#voiceOutputBtn').getAttribute('aria-pressed'),'true');
 const voiceCalls=writes.filter(w=>w.path==='/api/ai-chat'&&w.body.message==='Puoi spiegarmi cosa fai, Jarvis?');
 assert.equal(voiceCalls.length,1,'Speech recognition must submit recognized text exactly once');
 await page.locator('#voiceOutputBtn').click();
 assert.equal(await page.locator('#voiceOutputBtn').getAttribute('aria-pressed'),'false');

 // Voice dialogue: one button press, two independent recognized turns, automatic resumption.
 await page.evaluate(()=>{window.__jarvisAutoRecognition=false});
 await page.locator('#dialogueBtn').click();
 assert.equal(await page.locator('#dialogueBtn').getAttribute('aria-pressed'),'true');
 await page.waitForFunction(()=>window.__jarvisRecognitionInstances?.length>=2,{timeout:15000});
 const chatCallsBefore=writes.filter(w=>w.path==='/api/ai-chat').length;
 await page.evaluate(()=>{
  const rec=window.__jarvisRecognitionInstances.at(-1);
  rec.onresult?.({results:[[{transcript:'Puoi spiegarmi cosa fai, Jarvis?'}]]});
 });
 await page.waitForFunction(()=>window.__jarvisSpoken?.filter(x=>x.includes('Risposta sintetica')).length>=2,{timeout:15000});
 await page.waitForFunction(()=>window.__jarvisRecognitionInstances?.length>=3,{timeout:15000});
 assert.equal(writes.filter(w=>w.path==='/api/ai-chat').length,chatCallsBefore+1,'Voice transcript should be submitted once');
 const multiBefore=writes.filter(w=>w.path==='/api/site-projects').length;
 await page.evaluate(()=>{
  const rec=window.__jarvisRecognitionInstances.at(-1);
  rec.onresult?.({results:[[{transcript:'Hey Jarvis, creami un sito multipagina per Officina Demo'}]]});
 });
 await page.waitForFunction(()=>window.__jarvisSpoken?.some(x=>x.includes('Ho creato il sito multipagina')),{timeout:15000});
 await page.waitForFunction(()=>window.__jarvisRecognitionInstances?.length>=4,{timeout:15000});
 assert.equal(writes.filter(w=>w.path==='/api/site-projects').length,multiBefore+1,'Voice creates project without a builder click');
 // Voice-first execution: project write must wait for an explicit spoken yes.
 // A spoken no cancels without opening a native Android confirmation dialog.
 const projectWritesBeforeVoice=writes.filter(w=>w.path==='/api/projects').length;
 const nativeDialogsBeforeVoice=dialogs.length;
 const voiceProjectName='Officina prova vocale';
 const speakIntoActiveDialogue=async phrase=>{
  const previous=await page.evaluate(()=>window.__jarvisRecognitionInstances.length);
  await page.evaluate(text=>window.__jarvisRecognitionInstances.at(-1).onresult?.({results:[[{transcript:text}]]}),phrase);
  await page.waitForFunction(previous=>window.__jarvisRecognitionInstances.length>previous,previous,{timeout:15000});
 };
 await speakIntoActiveDialogue('Jarvis, crea progetto: '+voiceProjectName);
 await page.waitForFunction(()=>document.querySelector('#conversation')?.textContent?.includes('Sto per creare il progetto «Officina prova vocale»'),{timeout:15000});
 assert.equal(writes.filter(w=>w.path==='/api/projects').length,projectWritesBeforeVoice,'Voice proposal must not write before confirmation');
 assert.equal(dialogs.length,nativeDialogsBeforeVoice,'Voice proposal must not open a native confirm dialog');
 await speakIntoActiveDialogue('No, annulla');
 await page.waitForFunction(()=>document.querySelector('#conversation')?.textContent?.includes('Operazione annullata'),{timeout:15000});
 assert.equal(writes.filter(w=>w.path==='/api/projects').length,projectWritesBeforeVoice,'Voice cancel is read-only');
 await speakIntoActiveDialogue('Jarvis, crea progetto: '+voiceProjectName);
 await speakIntoActiveDialogue('Sì, confermo');
 await page.waitForFunction(()=>document.querySelector('#conversation')?.textContent?.includes('Progetto “Officina prova vocale” creato'),{timeout:15000});
 assert.equal(projects.filter(p=>p.name===voiceProjectName).length,1,'New project must exist in the synthetic Cloud');
 assert.equal(writes.filter(w=>w.path==='/api/projects').length,projectWritesBeforeVoice+1,'One spoken yes authorizes exactly one project creation');
 assert.equal(dialogs.length,nativeDialogsBeforeVoice,'Voice confirmation must not require touching the screen');
 // Cancellation must remain safe when speaking a short follow-up.
 const taskWritesBeforeVoice=writes.filter(w=>w.path==='/api/tasks').length;
 await page.locator('#activeProject').selectOption({label:voiceProjectName});
 await speakIntoActiveDialogue('Aggiungi attività: Verifica vocale');
 assert.equal(writes.filter(w=>w.path==='/api/tasks').length,taskWritesBeforeVoice,'Task must wait for spoken yes');
 await speakIntoActiveDialogue('No, annulla');
 assert.equal(writes.filter(w=>w.path==='/api/tasks').length,taskWritesBeforeVoice,'Spoken task cancel must not write');
 await speakIntoActiveDialogue('Aggiungi attività: Verifica vocale');
 await speakIntoActiveDialogue('Sì, confermo');
 await page.waitForFunction(()=>document.querySelector('#conversation')?.textContent?.includes('Attività “Verifica vocale” creata'),{timeout:15000});
 assert.equal(tasks.filter(t=>t.title==='Verifica vocale').length,1,'New task must exist in the synthetic Cloud');
 assert.equal(writes.filter(w=>w.path==='/api/tasks').length,taskWritesBeforeVoice+1,'Spoken yes must create exactly one task');
 assert.equal(dialogs.length,nativeDialogsBeforeVoice,'Voice task creation must remain entirely hands-free');
 const priorWrites=writes.length;
 await page.locator('#dialogueBtn').click();
 assert.equal(await page.locator('#dialogueBtn').getAttribute('aria-pressed'),'false');
 assert.equal(writes.length,priorWrites,'Stopping must not write');
 assert.match(await page.locator('#dialogueStatus').textContent(),/terminato/i);


 // Reproduce the Redmi voice transcription: the command must start an actual job,
 // not receive a fabricated advisory answer from read-only AI.
 const beforeNoisyJobs=siteJobs.length;
 const beforeNoisyRuns=writes.filter(w=>w.path.endsWith('/run')).length;
 const beforeNoisyAI=writes.filter(w=>w.path==='/api/ai-chat').length;
 await page.locator('#chatInput').fill('Hey Jarvis micr è un sito un sito web per un idraulico per piacere');
 await page.locator('#chatForm button[type=submit]').click();
 await page.waitForFunction(()=>document.querySelector('#conversation')?.textContent?.includes('Ho generato il sito «Sito completato»'),{timeout:15000});
 await page.waitForFunction(()=>document.querySelector('#siteJobsList button[data-job-id]')?.textContent==='Apri sito',{timeout:15000});
 assert.equal(siteJobs.length,beforeNoisyJobs+1,'Noisy recognition must create exactly one persistent website job');
 assert.equal(writes.filter(w=>w.path.endsWith('/run')).length,beforeNoisyRuns+1,'Noisy voice command must execute that job');
 assert.equal(siteJobs.at(-1).status,'completed','Generated result must be server-confirmed');
 assert.match(siteJobs.at(-1).brief,/idraulico/i);
 assert.equal(writes.filter(w=>w.path==='/api/ai-chat').length,beforeNoisyAI,'Noisy site command must not fall back to advisory AI');
 assert.equal(writes.filter(w=>/publish|deploy|github/i.test(w.path)).length,0,'No external publishing');
 // Never turn informational queries into external writes.
 const afterNoisyJobs=siteJobs.length;
 await page.locator('#chatInput').fill('Jarvis, quanto costa un sito web per un idraulico?');
 await page.locator('#chatForm button[type=submit]').click();
 await page.waitForFunction(()=>document.querySelector('#conversation .bubble.jarvis:last-of-type')?.textContent?.includes('Risposta sintetica')||[...document.querySelectorAll('#conversation .bubble.jarvis')].at(-1)?.textContent?.includes('Risposta sintetica'),{timeout:15000});
 assert.equal(siteJobs.length,afterNoisyJobs,'Question about site costs is not an action request');
 // The conversational Core AI self-audit must use verified diagnostic APIs, not advisory AI.
 // It must prepare proposals without changing any user project/task records or deploying code.
 projects.push({id:'jarvis-core',name:'JARVIS',description:'Synthetic core project',status:'active'});
 await page.evaluate(async()=>{await loadAll()});
 const aiBeforeAudit=writes.filter(w=>w.path==='/api/ai-chat').length;
 const tasksBeforeAudit=tasks.length,projectsBeforeAudit=projects.length;
 await page.locator('#chatInput').fill('Hey Jarvis, analizzati e proponi come migliorarti');
 await page.locator('#chatForm button[type=submit]').click();
 await page.waitForFunction(()=>document.querySelector('#conversation')?.textContent?.includes('Ho preparato 1 nuova proposta'),{timeout:15000});
 assert.equal(writes.filter(w=>w.path==='/api/executor/run').length,1,'Self audit must execute only one diagnostic');
 assert.equal(writes.filter(w=>w.path==='/api/self-improvement/prepare').length,1,'Self audit must prepare reviewed proposals');
 assert.equal(writes.filter(w=>w.path==='/api/ai-chat').length,aiBeforeAudit,'Self audit cannot be fabricated by an advisory AI response');
 assert.equal(tasks.length,tasksBeforeAudit,'Self audit cannot modify tasks');
 assert.equal(projects.length,projectsBeforeAudit,'Self audit cannot modify project records');
 assert.equal(writes.filter(w=>/publish|deploy|github/i.test(w.path)).length,0,'Self audit cannot deploy code');
 // Spoken self-improvement must only create a bounded, durable queue entry.
 const improvementBefore=memories.filter(x=>x.category==='JARVIS_AUTOIMPROVE_TASK').length;
 const improvementProjects=projects.length,improvementTasks=tasks.length;
 await page.locator('#chatInput').fill('Hey Jarvis, migliorati automaticamente');
 await page.locator('#chatForm button[type=submit]').click();
 await page.waitForFunction(()=>document.querySelector('#conversation')?.textContent?.includes('Richiesta di automiglioramento registrata'),{timeout:15000});
 assert.equal(memories.filter(x=>x.category==='JARVIS_AUTOIMPROVE_TASK').length,improvementBefore+1,'AutoImprove must queue one job');
 assert.equal(projects.length,improvementProjects,'AutoImprove may not change project records');
 assert.equal(tasks.length,improvementTasks,'AutoImprove may not change tasks');
 await page.locator('#chatInput').fill('Hey Jarvis, migliorati automaticamente');
 await page.locator('#chatForm button[type=submit]').click();
 await page.waitForFunction(()=>document.querySelector('#conversation')?.textContent?.includes('richiesta di automiglioramento è già presente'),{timeout:15000});
 assert.equal(memories.filter(x=>x.category==='JARVIS_AUTOIMPROVE_TASK').length,improvementBefore+1,'Repeat command may not duplicate queued requests');
 // Regression: real Redmi ASR utterance previously got a fabricated advisory AI response.
 const aiBeforeRedmi=writes.filter(w=>w.path==='/api/ai-chat').length;
 await page.locator('#chatInput').fill('Ehi Jarvis migliorati autonomamente');
 await page.locator('#chatForm button[type=submit]').click();
 await page.waitForFunction(()=>[...document.querySelectorAll('#conversation .bubble.jarvis')].at(-1)?.textContent?.includes('già presente nella coda'),{timeout:15000});
 assert.equal(memories.filter(x=>x.category==='JARVIS_AUTOIMPROVE_TASK').length,improvementBefore+1,'Redmi command must route to existing queue');
 assert.equal(writes.filter(w=>w.path==='/api/ai-chat').length,aiBeforeRedmi,'No advisory AI answer for Redmi autoimprovement command');

 // Exact ASR artifacts captured on the phone: filler before Jarvis or before the imperative.
 for(const transcript of ['e Jarvis migliorati autonomamente','Jarvis è migliorati autonomamente','Jarvis e migliorati autonomamente']){
  const previousBubbles=await page.locator('#conversation .bubble.jarvis').count();
  const queuedBefore=memories.filter(x=>x.category==='JARVIS_AUTOIMPROVE_TASK').length;
  const consultedBefore=writes.filter(w=>w.path==='/api/ai-chat').length;
  await page.locator('#chatInput').fill(transcript);
  await page.locator('#chatForm button[type=submit]').click();
  await page.waitForFunction(previous=>document.querySelectorAll('#conversation .bubble.jarvis').length>previous,previousBubbles,{timeout:15000});
  const lastJarvis=await page.locator('#conversation .bubble.jarvis').last().textContent();
  assert.match(lastJarvis,/già presente nella coda/i,'ASR artifact must route to existing job: '+transcript);
  assert.equal(memories.filter(x=>x.category==='JARVIS_AUTOIMPROVE_TASK').length,queuedBefore,'ASR artifact cannot duplicate job');
  assert.equal(writes.filter(w=>w.path==='/api/ai-chat').length,consultedBefore,'ASR artifact cannot go to advisory AI');
 }

 const beforeAnother=writes.filter(w=>w.path==='/api/ai-chat').length;
 await page.locator('#chatInput').fill('Jarvis, quanto tempo serve per migliorarti autonomamente?');
 await page.locator('#chatForm button[type=submit]').click();
 await page.waitForFunction(()=>[...document.querySelectorAll('#conversation .bubble.jarvis')].at(-1)?.textContent?.includes('Risposta sintetica'),{timeout:15000});
 assert.equal(writes.filter(w=>w.path==='/api/ai-chat').length,beforeAnother+1,'Questions remain read-only AI');
 assert.equal(memories.filter(x=>x.category==='JARVIS_AUTOIMPROVE_TASK').length,improvementBefore+1,'No new job from information question');
 assert.equal(writes.filter(w=>/publish|deploy|github/i.test(w.path)).length,0,'AutoImprove command may not deploy or invoke GitHub directly');
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
