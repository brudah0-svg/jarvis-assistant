import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {pathToFileURL} from 'node:url';
import {resolve} from 'node:path';

// Two actual Worker implementations, one synthetic isolated fixture for each DB.
// No Cloudflare network request, production data, deployment, or credential access.
execFileSync(process.execPath,['scripts/build-v4-staging-isolation-fix.mjs'],{stdio:'inherit'});
const production=(await import(pathToFileURL(resolve('cloudflare/workers/jarvis-backend.mjs')).href)).default;
const staging=(await import(pathToFileURL(resolve('dist/jarvis-v4-staging-isolation-fix.mjs')).href)).default;
const stagingVersion='80077801-2762-4ed3-8581-42b806032c4a';
const fixtureProjects=[{id:'staging-project',name:'Progetto sintetico',status:'active'}];
const fixtureTasks=[{id:'staging-task',project_id:'staging-project',title:'Attività sintetica',status:'pending'}];
const isolatedDb={
 prepare(sql){let args=[];return{
  bind(...values){args=values;return this},
  async first(){
   if(sql.startsWith('SELECT (SELECT COUNT(*) FROM projects)'))return {projects:fixtureProjects.length,tasks:fixtureTasks.length};
   if(sql.startsWith('SELECT name FROM projects WHERE id=?'))return fixtureProjects.find(p=>p.id===args[0])||null;
   throw Error('Unexpected staging SQL first '+sql);
  },
  async all(){
   if(sql.includes('sqlite_master'))return {results:[{name:'projects'},{name:'tasks'}]};
   if(sql.startsWith('SELECT id,name,description,status,created_at,updated_at FROM projects'))return {results:fixtureProjects};
   if(sql.startsWith('SELECT * FROM tasks WHERE project_id=?'))return {results:fixtureTasks.filter(t=>t.project_id===args[0])};
   if(sql.startsWith('SELECT * FROM tasks ORDER BY'))return {results:fixtureTasks};
   throw Error('Unexpected staging SQL all '+sql);
  }
 }}
};
const productionDb={
 prepare(sql){return{
  bind(){return this},
  async first(){
   if(sql.startsWith('SELECT (SELECT COUNT(*) FROM projects)'))return {projects:3,tasks:8};
   throw Error('Unexpected production SQL in synthetic verify route: '+sql);
  },
  async all(){throw Error('Unexpected production SQL all '+sql)},
  async run(){throw Error('Writes must never run during verification')}
 }}
};
let stagingCalls=[];
const service={
 async fetch(url,init={}){
  const request=new Request(url,init);
  stagingCalls.push({path:new URL(request.url).pathname,method:request.method});
  return staging.fetch(request,{DB:isolatedDb,VERSION:{id:stagingVersion}},{waitUntil(){}});
 }
};
const request=()=>new Request('https://jarvis-backend.example/api/staging/verify',{method:'GET'});
async function verify(env){
 const res=await production.fetch(request(),env,{waitUntil(){}});
 return {status:res.status,body:await res.json()};
}
const env={DB:productionDb,STAGING_SERVICE:service,VERSION:{id:'synthetic-production-version'}};
const healthy=await verify(env);
assert.equal(healthy.status,200,JSON.stringify(healthy.body));
assert.equal(healthy.body.status,'passed');
assert.equal(healthy.body.private_service_binding,true);
assert.equal(healthy.body.production_changes,false);
assert.equal(healthy.body.normal_api_routes_blocked,true);
assert.equal(healthy.body.staging_api_guard,true);
assert.equal(healthy.body.read_only_api_smoke?.passes,true);
assert.equal(healthy.body.read_only_api_smoke?.projects_http,200);
assert.equal(healthy.body.read_only_api_smoke?.tasks_http,200);
assert.equal(healthy.body.read_only_api_smoke?.write_blocked,true);
assert.equal(healthy.body.synthetic_suite?.passed,5);
assert.equal(healthy.body.synthetic_suite?.total,5);
assert.equal(healthy.body.database_counts_distinct,true);
assert.deepEqual(stagingCalls.slice().sort((a,b)=>(a.path+':'+a.method).localeCompare(b.path+':'+b.method)),[
 {path:'/staging-check',method:'GET'},
 {path:'/api/projects',method:'GET'},
 {path:'/api/tasks',method:'POST'},
 {path:'/api/tasks',method:'GET'}
].sort((a,b)=>(a.path+':'+a.method).localeCompare(b.path+':'+b.method)));
assert.equal(fixtureProjects.length,1);
assert.equal(fixtureTasks.length,1);
assert.equal((await verify({DB:productionDb,VERSION:env.VERSION})).status,503,'Missing private binding must fail closed');
const badService={fetch:async(url,init)=>{
 const response=await service.fetch(url,init);
 if(init.method==='POST'&&new URL(url).pathname==='/api/tasks')return new Response(JSON.stringify({error:'blocked'}),{status:400,headers:{'Content-Type':'application/json'}});
 return response;
}};
const blocked=await verify({...env,STAGING_SERVICE:badService});
assert.equal(blocked.status,502,'Wrong denied HTTP status must fail closed');
assert.equal(blocked.body.status,'failed');
const sameCountsDb={prepare:sql=>({async first(){
 if(sql.startsWith('SELECT (SELECT COUNT(*) FROM projects)'))return {projects:1,tasks:1};
 throw Error('Unexpected SQL '+sql);
}})};
const notIsolated=await verify({...env,DB:sameCountsDb});
assert.equal(notIsolated.status,502,'Indistinguishable production/staging fixture counts must fail closed');
assert.equal(notIsolated.body.database_counts_distinct,false);
console.log('Two-Worker private verifier PASS: actual production bridge + pinned staging Worker, 200 healthy and correct 503/502 failures, zero writes. OFFLINE synthetic only.');
