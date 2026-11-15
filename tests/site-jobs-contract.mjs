import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';

execFileSync(process.execPath,['scripts/build-website-builder-candidate.mjs'],{stdio:'inherit'});
execFileSync(process.execPath,['--check','dist/jarvis-website-builder-candidate.mjs'],{stdio:'inherit'});
const worker=(await import(pathToFileURL(resolve('dist/jarvis-website-builder-candidate.mjs')).href)).default;
const jobs=[],drafts=[],otherWrites=[];
const UUID=()=>crypto.randomUUID();
let aiCalls=0;
const copy=x=>x?JSON.parse(JSON.stringify(x)):x;
function database(){
 const stmt=(sql,params=[])=>({
  bind(...values){return stmt(sql,values)},
  async first(){
   if(sql==='SELECT COUNT(*) AS n FROM site_jobs')return{n:jobs.length};
   if(sql==='SELECT COUNT(*) AS n FROM site_drafts')return{n:drafts.length};
   if(sql.includes('FROM site_jobs WHERE id=? AND lease_token=?'))return copy(jobs.find(x=>x.id===params[0]&&x.lease_token===params[1]));
   if(sql.includes('FROM site_jobs WHERE id=?'))return copy(jobs.find(x=>x.id===params[0]));
   throw Error('Unexpected first '+sql)
  },
  async all(){
   if(sql.includes('FROM site_jobs ORDER BY'))return{results:copy(jobs.slice().reverse().slice(0,20).map(({lease_token,contact_email,...x})=>x))};
   throw Error('Unexpected all '+sql)
  },
  async run(){
   if(sql.startsWith('INSERT INTO site_jobs(')){
    const[id,brief,style,contact_email]=params;
    jobs.push({id,brief,style,contact_email,status:'queued',attempt_count:0,lease_token:null,draft_id:null,error_text:null,created_at:'2026-11-15',updated_at:'2026-11-15'});return{meta:{changes:1}};
   }
   if(sql.startsWith("UPDATE site_jobs SET status='running'")){
    const[token,id]=params;const x=jobs.find(x=>x.id===id&&x.attempt_count<3&&(x.status==='queued'||x.status==='failed'));
    if(!x)return{meta:{changes:0}};
    x.status='running';x.lease_token=token;x.attempt_count++;x.error_text=null;return{meta:{changes:1}};
   }
   if(sql.startsWith("UPDATE site_jobs SET status='failed'")){
    const[error,id,token]=params;const x=jobs.find(x=>x.id===id&&x.lease_token===token&&x.status==='running');if(!x)return{meta:{changes:0}};
    x.status='failed';x.lease_token=null;x.error_text=error;return{meta:{changes:1}};
   }
   if(sql.startsWith('INSERT OR IGNORE INTO site_drafts(')){
    const[id,title,brief,style,contact_email,html]=params;
    if(drafts.some(d=>d.id===id))return{meta:{changes:0}};
    drafts.push({id,title,brief,style,contact_email,html});return{meta:{changes:1}};
   }
   if(sql.startsWith("UPDATE site_jobs SET status='completed'")){
    const[draft_id,id,token]=params;
    const x=jobs.find(x=>x.id===id&&x.lease_token===token&&x.status==='running');
    if(!x)return{meta:{changes:0}};
    x.status='completed';x.draft_id=draft_id;x.lease_token=null;x.error_text=null;
    return{meta:{changes:1}};
   }
   otherWrites.push(sql);throw Error('Unexpected write '+sql);
  }
 });
 return{prepare:sql=>stmt(sql),async batch(commands){
  const results=[];for(const c of commands)results.push(await c.run());
  return results;
 }};
}
const db=database();
const example={title:'Pinco Pallo Elettricista',subtitle:'Elettricità e domotica per la tua casa.',about:'Impianti sicuri e servizi dedicati al territorio.',services:[{title:'Impianti elettrici',description:'Installazioni su misura'},{title:'Domotica',description:'Soluzioni smart'},{title:'Manutenzione',description:'Controlli e verifiche'}],callToAction:'Contattaci'};
let badOutput=false,delayedResolve=null;
const env={DB:db,AI:{async run(){aiCalls++;if(delayedResolve)await new Promise(resolve=>{const orig=delayedResolve;delayedResolve=()=>{orig();resolve()}});return{response:badOutput?'not-json':JSON.stringify(example)}}}};
const hit=async(method,path,body={},environment=env)=>{
 const req=new Request('https://jarvis.example'+path,{method,headers:method==='POST'?{'Content-Type':'application/json'}:{},...(method==='POST'?{body:JSON.stringify(body)}:{})});
 const res=await worker.fetch(req,environment,{waitUntil(){}});
 return{status:res.status,data:await res.json()};
};
const brief='Sito aziendale per Pinco Pallo elettricista con servizi di domotica';
assert.equal((await hit('GET','/api/site-jobs')).data.jobs.length,0);
assert.equal((await hit('POST','/api/site-jobs',{brief:'short'})).status,400);
assert.equal(jobs.length,0);
const created=await hit('POST','/api/site-jobs',{brief,style:'energia'});
assert.equal(created.status,201);
assert.equal(created.data.status,'queued');
const id=created.data.job.id;
assert.match(id,/^[0-9a-f-]{36}$/);
assert.equal((await hit('GET','/api/site-jobs/'+id)).data.job.status,'queued');
assert.equal((await hit('GET','/api/site-jobs/not-a-uuid')).status,400);
const run=await hit('POST','/api/site-jobs/'+id+'/run');
assert.equal(run.status,200);
assert.equal(run.data.status,'completed');
assert.equal(run.data.external_publication,false);
assert.equal(run.data.requires_publication_approval,true);
assert.equal(jobs[0].status,'completed');
assert.equal(drafts.length,1);
assert.equal(drafts[0].id,id,'Idempotent draft ID = job ID');
assert.match(drafts[0].html,/<!doctype html>/);
assert.equal((await hit('POST','/api/site-jobs/'+id+'/run')).data.already_completed,true);
assert.equal(drafts.length,1);
assert.equal(aiCalls,1,'Completed job must not rerun AI');
assert.equal((await hit('GET','/api/site-jobs')).data.jobs[0].status,'completed');
const failed=await hit('POST','/api/site-jobs',{brief,style:'notte'});const failId=failed.data.job.id;badOutput=true;
for(let i=1;i<=3;i++){
 assert.equal((await hit('POST','/api/site-jobs/'+failId+'/run')).status,502);
 assert.equal(jobs.find(x=>x.id===failId).attempt_count,i);
 assert.equal(jobs.find(x=>x.id===failId).status,'failed');
}
assert.equal((await hit('POST','/api/site-jobs/'+failId+'/run')).status,409,'Bounded retries');
badOutput=false;
assert.equal(drafts.length,1,'Failures must not create fake site drafts');
// A concurrent second execution should not claim the same job.
const queued=await hit('POST','/api/site-jobs',{brief,style:'chiaro'});const cid=queued.data.job.id;
let release;delayedResolve=()=>{release?.()};
const inFlight=hit('POST','/api/site-jobs/'+cid+'/run');
for(let i=0;i<12&&jobs.find(x=>x.id===cid)?.status!=='running';i++)await new Promise(resolve=>setTimeout(resolve,0));
assert.equal(jobs.find(x=>x.id===cid).status,'running');
assert.equal((await hit('POST','/api/site-jobs/'+cid+'/run')).status,409,'Concurrent request must not execute AI twice');
const savedCalls=aiCalls;delayedResolve();const result=await inFlight;assert.equal(result.status,200);
assert.equal(aiCalls,savedCalls);
assert.equal(drafts.length,2);
assert.deepEqual(otherWrites,[]);
const uiResponse=await worker.fetch(new Request('https://jarvis.example/jarvis-unified'),{},{waitUntil(){}});
assert.equal(uiResponse.status,200);const ui=await uiResponse.text();
for(const selector of ['id="siteJobsList"','id="siteJobCreate"','id="siteJobsRefresh"','loadSiteJobs()','id="siteDraftsList"'])assert(ui.includes(selector),'Missing UI '+selector);
console.log('PASS: persistent queued/run/completed jobs, bounded retries, atomic job/draft storage, concurrency lock, Android UI, zero publishing.');
