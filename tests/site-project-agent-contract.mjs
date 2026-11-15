import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {parseSiteProjectPlan,renderSiteProject,inspectSiteProject,siteProjectZip} from '../cloudflare/workers/site-project-agent.mjs';

const base={title:'Officina Pilota',tagline:'Cura per la tua auto sportiva',about:'Un laboratorio dedicato alla manutenzione.',contactIntro:'Scrivici per richiedere informazioni.',cta:'Scopri i servizi',
 services:[{title:'Diagnosi',description:'Verifica dei sistemi di bordo.'},{title:'Manutenzione',description:'Controlli programmati e accurati.'},{title:'Preparazione',description:'Consulenza tecnica personalizzata.'}]};
const checked=parseSiteProjectPlan(JSON.stringify(base));
assert.equal(checked.services.length,3);
assert.throws(()=>parseSiteProjectPlan('{}'),/Missing/);
assert.throws(()=>parseSiteProjectPlan('not json'));
assert.throws(()=>parseSiteProjectPlan(JSON.stringify({...base,services:[{title:'A',description:'B'}]})));
const files=renderSiteProject(base,{style:'energia',contactEmail:'info@example.it'});
assert.deepEqual(Object.keys(files),['index.html','servizi.html','contatti.html','README.txt']);
assert(inspectSiteProject(files).passed);
assert(files['contatti.html'].includes('mailto:info@example.it'));
assert(!renderSiteProject(base,{contactEmail:'" onmouseover="alert(1)'} )['contatti.html'].includes('mailto:'));
for(const name of ['index.html','servizi.html','contatti.html']){
 const html=files[name];assert(html.includes('viewport'));assert(html.includes('Content-Security-Policy'));
 for(const dest of ['index.html','servizi.html','contatti.html'])assert(html.includes('href="'+dest+'"'));
 assert(!html.includes('<script'));
}
const hostile=renderSiteProject({...base,title:'<script>alert(1)</script>',about:'<img src=x onerror=alert(1)>'});
assert(hostile['index.html'].includes('&lt;script&gt;'));assert(!hostile['index.html'].includes('<script>'));assert(!hostile['index.html'].includes('<img'));
assert.equal(inspectSiteProject({...files,'servizi.html':'<script>alert(1)</script>'}).passed,false);
assert.equal(inspectSiteProject({...files,'evil.js':'alert(1)'}).passed,false);
const bytes=siteProjectZip(files);
assert.equal(new DataView(bytes.buffer).getUint32(0,true),0x04034b50);
for(const name of ['index.html','servizi.html','contatti.html','README.txt'])assert(Buffer.from(bytes).includes(Buffer.from(name)));

execFileSync(process.execPath,['scripts/build-website-builder-candidate.mjs'],{stdio:'inherit'});
execFileSync(process.execPath,['--check','dist/jarvis-website-builder-candidate.mjs'],{stdio:'inherit'});
const worker=(await import(pathToFileURL(resolve('dist/jarvis-website-builder-candidate.mjs')).href)).default;
const projects=[],dbWrites=[];
let artificialFailure=false,aiCalls=0;
const db={prepare(sql){
 const args={values:[],bind(...v){this.values=v;return this},
 async first(){
  if(sql==='SELECT COUNT(*) AS n FROM site_projects')return {n:projects.length};
  if(sql.includes('SELECT files_json FROM site_projects'))return projects.find(x=>x.id===this.values[0])||null;
  if(sql.includes('FROM site_projects WHERE id=?'))return projects.find(x=>x.id===this.values[0])||null;
  throw Error('Unexpected query '+sql)
 },async all(){
  if(sql.includes('FROM site_projects ORDER BY'))return{results:projects.map(({id,title,brief,style,created_at})=>({id,title,brief,style,created_at}))};
  throw Error('Unexpected list '+sql)
 },async run(){
  dbWrites.push(sql);
  if(!sql.includes('INSERT INTO site_projects'))throw Error('Unexpected write');
  const [id,title,brief,style,contact_email,files_json,audit_json]=this.values;
  projects.push({id,title,brief,style,contact_email,files_json,audit_json,created_at:'2026-11-15'});
  return {meta:{changes:1}}
 }};
 return args;
}};
const env={DB:db,AI:{async run(){aiCalls++;if(artificialFailure&&aiCalls===1)return{response:'bad'};return{response:JSON.stringify(base)}}}};
async function hit(path,method='GET',body={},customEnv=env){
 const resp=await worker.fetch(new Request('https://protected.test'+path,{method,...(method==='POST'?{body:JSON.stringify(body),headers:{'Content-Type':'application/json'}}:{})}),customEnv,{waitUntil(){}});
 return resp;
}
let res=await hit('/api/site-projects','POST',{brief:'short'});assert.equal(res.status,400);assert.equal(aiCalls,0);
res=await hit('/api/site-projects','POST',{brief:'Crea sito multipagina per officina auto',style:'invalid'});
assert.equal(res.status,400);assert.equal(aiCalls,0);
res=await hit('/api/site-projects','POST',{brief:'Crea sito multipagina per officina auto',contactEmail:'not@ valid'});
assert.equal(res.status,400);assert.equal(aiCalls,0);
res=await hit('/api/site-projects','POST',{brief:'Crea sito multipagina per officina auto'});
assert.equal(res.status,201);
const generated=await res.json();
assert.equal(generated.status,'completed');assert.equal(generated.production_deployed,false);
assert.equal(generated.external_actions_executed,false);
assert.equal(generated.project.audit.passed,true);
assert.equal(generated.project.attempts,1);
assert.equal(projects.length,1);assert.equal(aiCalls,1);
assert.deepEqual(Object.keys(generated.project.files),['index.html','servizi.html','contatti.html','README.txt']);
res=await hit('/api/site-projects');
assert.equal(res.status,200);assert.equal((await res.json()).projects.length,1);
res=await hit('/api/site-projects/'+generated.project.id);
assert.equal(res.status,200);assert.equal((await res.json()).project.id,generated.project.id);
res=await hit('/api/site-projects/'+generated.project.id+'/export');
assert.equal(res.status,200);assert.equal(res.headers.get('content-type'),'application/zip');
const output=Buffer.from(await res.arrayBuffer());assert(output.includes(Buffer.from('servizi.html')));assert.equal(output.readUInt32LE(0),0x04034b50);
assert.equal((await hit('/api/site-projects/not-valid')).status,400);
assert.equal((await hit('/api/site-projects/not-valid/export')).status,404);
artificialFailure=true;aiCalls=0;
res=await hit('/api/site-projects','POST',{brief:'Crea sito multipagina per officina con tre pagine'});
assert.equal(res.status,201);assert.equal((await res.json()).project.attempts,2);
assert.equal(aiCalls,2);assert.equal(projects.length,2);
const noAi=await hit('/api/site-projects','POST',{brief:'Crea sito multipagina per officina auto'},{DB:db});assert.equal(noAi.status,503);
const noDb=await hit('/api/site-projects','POST',{brief:'Crea sito multipagina per officina auto'},{AI:env.AI});assert.equal(noDb.status,503);
assert(dbWrites.every(x=>x.startsWith('INSERT INTO site_projects')));
console.log('PASS: multipage renderer, escaping, internal links, ZIP, Cloud D1 persistence, bounded repair and no publishing.');
