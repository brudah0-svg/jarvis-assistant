import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
import {resolve} from 'node:path';
import {DatabaseSync} from 'node:sqlite';
import {randomUUID} from 'node:crypto';
// Execute the actual full build, with SQLite in memory and a deterministic model.
// No production resources, network, paid inference or staging credentials.
execFileSync(process.execPath,['scripts/build-website-builder-candidate.mjs'],{stdio:'inherit'});
const path=resolve('dist/jarvis-website-builder-candidate.mjs');
execFileSync(process.execPath,['--check',path],{stdio:'inherit'});
const worker=(await import(pathToFileURL(path).href)).default;
const db=new DatabaseSync(':memory:');
db.exec("PRAGMA foreign_keys=ON; CREATE TABLE projects(id TEXT PRIMARY KEY,status TEXT NOT NULL); CREATE TABLE tasks(id TEXT PRIMARY KEY,project_id TEXT NOT NULL REFERENCES projects(id),title TEXT NOT NULL,description TEXT NOT NULL,status TEXT NOT NULL); INSERT INTO projects VALUES('alpha','active'),('inactive','archived'),('beta','active');");
let batches=0,aiCalls=0;
const DB={
 prepare(sql){return{bind(...params){return{sql,params}}}},
 async batch(statements){
  batches++;db.exec('BEGIN IMMEDIATE');
  try{const results=statements.map(({sql,params})=>{
   const stmt=db.prepare(sql);
   if(/^SELECT/i.test(sql))return{success:true,results:stmt.all(...params)};
   return{success:true,meta:{changes:Number(stmt.run(...params).changes)}};
  });db.exec('COMMIT');return results}
  catch(error){db.exec('ROLLBACK');throw error}
 }
};
const steps=[
 {order:1,title:'Raccogliere requisiti',check:'Requisiti documentati',depends_on:[]},
 {order:2,title:'Preparare prototipo',check:'Prototipo verificato',depends_on:[1]},
 {order:3,title:'Collaudare risultato',check:'Rapporto di prova salvato',depends_on:[1,2]}
];
const AI={async run(model,options){aiCalls++;assert.equal(options.messages.at(-1).role,'user');return{response:JSON.stringify({steps,assumptions:[]})}}};
const ctx={waitUntil(){throw Error('Unexpected background task')}};
async function request(route,body,env={AI,DB}){
 const response=await worker.fetch(new Request('https://isolated.test'+route,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}),env,ctx);
 return {status:response.status,data:await response.json()};
}
const count=()=>Number(db.prepare('SELECT count(*) AS n FROM tasks').get().n);
const goal='Costruire una piccola applicazione';
try{
 const page=await worker.fetch(new Request('https://isolated.test/jarvis-unified'),{},ctx);
 assert.equal(page.status,200);const html=await page.text();
 assert.equal(html,readFileSync('cloudflare/ui/command-v4-unified.html','utf8'));
 assert(html.includes("post('/api/core-plan'")&&html.includes("post('/api/core-plan/register'"));
 const proposal=await request('/api/core-plan',{goal});
 assert.equal(proposal.status,200);assert.equal(proposal.data.engine,'core-ai-v1');
 assert.equal(proposal.data.operations_executed,false);assert.equal(aiCalls,1);assert.equal(batches,0);assert.equal(count(),0);
 const draft={project_id:'alpha',registration_id:randomUUID(),goal,steps:proposal.data.steps,assumptions:proposal.data.assumptions,confirmed:true};
 const denied=await request('/api/core-plan/register',{...draft,confirmed:false});
 assert.equal(denied.status,400);assert.equal(count(),0);assert.equal(batches,0);
 const registered=await request('/api/core-plan/register',draft);
 assert.equal(registered.status,200);assert.equal(registered.data.created_tasks,3);assert.equal(count(),3);
 const actual=db.prepare('SELECT * FROM tasks ORDER BY id').all();
 assert(actual.every(x=>x.status==='pending'&&x.project_id==='alpha'));
 assert(actual[2].description.includes(draft.registration_id+'-2'));
 const replay=await request('/api/core-plan/register',draft);
 assert.equal(replay.status,200);assert.equal(replay.data.created_tasks,0);assert.equal(count(),3);
 const conflict=await request('/api/core-plan/register',{...draft,registration_id:randomUUID()});
 assert.equal(conflict.status,409);assert.equal(count(),3);
 const inactive=await request('/api/core-plan/register',{...draft,project_id:'inactive',registration_id:randomUUID()});
 assert.equal(inactive.status,409);assert.equal(count(),3);
 const differentGoal=await request('/api/core-plan/register',{...draft,goal:'Un altro obiettivo'});
 assert.equal(differentGoal.status,409);assert.equal(count(),3);
 const differentProject=await request('/api/core-plan/register',{...draft,project_id:'beta'});
 assert.equal(differentProject.status,409);assert.equal(count(),3);
 const noAI=await request('/api/core-plan',{goal},{DB});
 assert.equal(noAI.status,503);assert.equal(aiCalls,1);assert.equal(count(),3);
 console.log('PASS: complete Worker UI, planner route, real SQLite registration, retry, conflict, inactive project, token integrity and unavailable AI. No production actions.');
}finally{db.close()}
