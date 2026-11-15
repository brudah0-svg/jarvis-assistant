import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {pathToFileURL} from 'node:url';
import {resolve} from 'node:path';
execFileSync(process.execPath,['scripts/build-website-builder-candidate.mjs'],{stdio:'inherit'});
execFileSync(process.execPath,['--check','dist/jarvis-website-builder-candidate.mjs'],{stdio:'inherit'});
const worker=(await import(pathToFileURL(resolve('dist/jarvis-website-builder-candidate.mjs')).href)).default;
const drafts=[];
let aiCalls=0,writes=0;
const copy=()=>drafts.map(d=>({...d}));
const htmlData={title:'Pinco Pallo Impianti',subtitle:'Impianti per abitazioni e imprese.',about:'Progettiamo impianti funzionali e curati nei dettagli.',services:[{title:'Impianti',description:'Sistemi elettrici per aziende.'},{title:'Manutenzione',description:'Manutenzione di impianti.'}],callToAction:'Contattaci'};
const db={prepare(sql){
 const q={values:[],
  bind(...values){this.values=values;return this},
  async first(){
   if(sql==='SELECT COUNT(*) AS n FROM site_drafts')return{n:drafts.length};
   if(sql.startsWith('SELECT id,title,brief,style,contact_email,html,created_at FROM site_drafts WHERE id=?'))return drafts.find(d=>d.id===this.values[0])||null;
   throw Error('Unexpected read '+sql)
  },
  async all(){
   if(sql.startsWith('SELECT id,title,brief,style,created_at FROM site_drafts ORDER BY'))return{results:copy().sort((a,b)=>b.created_at.localeCompare(a.created_at)).map(({id,title,brief,style,created_at})=>({id,title,brief,style,created_at}))};
   throw Error('Unexpected list '+sql)
  },
  async run(){
   if(!sql.startsWith('INSERT INTO site_drafts('))throw Error('Only additive writes are allowed');
   writes++;
   const[id,title,brief,style,contact_email,html]=this.values;
   drafts.push({id,title,brief,style,contact_email,html,created_at:'2026-11-15 15:00:00'});
   return{success:true,meta:{changes:1}}
  }};
 return q
}};
const env={DB:db,AI:{async run(){aiCalls++;return{response:JSON.stringify(htmlData)}}}};
const hit=async(method,path,data,environment=env)=>{
 const req=new Request('https://example.invalid'+path,{method,headers:method==='POST'?{'Content-Type':'application/json'}:{},...(method==='POST'?{body:JSON.stringify(data)}:{})});
 const res=await worker.fetch(req,environment,{waitUntil(){}});
 return{status:res.status,data:await res.json()};
};
const brief='Un sito per un elettricista di quartiere con installazione e manutenzione';
const unsaved=await hit('POST','/api/site-builder',{brief,style:'notte',saveDraft:false});
assert.equal(unsaved.status,200);
assert.equal(unsaved.data.saved,false);
assert.equal(drafts.length,0);
const result=await hit('POST','/api/site-builder',{brief,style:'chiaro',saveDraft:true});
assert.equal(result.status,200);
assert.equal(result.data.saved,true);
assert.equal(result.data.production_deployed,false);
assert.equal(result.data.requires_publication_approval,true);
assert.match(result.data.draftId,/^[0-9a-f-]{36}$/);
assert.equal(drafts.length,1);
assert.equal(writes,1);
assert.equal(aiCalls,2);
const list=await hit('GET','/api/site-drafts');
assert.equal(list.status,200);
assert.equal(list.data.drafts.length,1);
assert(!('html' in list.data.drafts[0]),'Listing must not send full HTML');
const recovered=await hit('GET','/api/site-drafts/'+result.data.draftId);
assert.equal(recovered.status,200);
assert.equal(recovered.data.draft.html,result.data.html,'Saved preview must survive independent read-back');
assert.equal(recovered.data.draft.brief,brief);
assert.equal((await hit('GET','/api/site-drafts/malformed')).status,400);
assert.equal((await hit('GET','/api/site-drafts/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa')).status,404);
const countBefore=drafts.length;
const invalid=await hit('POST','/api/site-builder',{brief:'short',saveDraft:true});
assert.equal(invalid.status,400);
assert.equal(drafts.length,countBefore);
const withoutDB=await hit('POST','/api/site-builder',{brief,saveDraft:true},{AI:env.AI});
assert.equal(withoutDB.status,200,'Site still available when DB is temporarily unavailable');
assert.equal(withoutDB.data.saved,false);
assert(withoutDB.data.saveError.includes('scarica'));
for(let i=1;i<30;i++)drafts.push({...drafts[0],id:'synthetic'+i});
const full=await hit('POST','/api/site-builder',{brief,saveDraft:true});
assert.equal(full.status,200);
assert.equal(full.data.saved,false);
assert.equal(drafts.length,30);
assert.equal(writes,1);
assert((await hit('GET','/api/site-drafts')).data.drafts.length===30);
const ui=await worker.fetch(new Request('https://example.invalid/jarvis-unified'),{},{waitUntil(){}});
const page=await ui.text();
for(const marker of ['id="siteSaveDraft"','id="siteDraftsList"','id="siteRefreshDrafts"','loadSiteDrafts()','sandbox=""'])assert(page.includes(marker),marker);
assert.equal(ui.status,200);
console.log('PASS: generated site save opt-in, private D1 list, exact read-back, invalid IDs, 30-draft cap, no auto publication, no original-data changes.');
