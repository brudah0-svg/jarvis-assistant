import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {pathToFileURL} from 'node:url';
import {resolve} from 'node:path';

execFileSync(process.execPath,['scripts/build-v4-staging-isolation-fix.mjs'],{stdio:'inherit'});
const staging=(await import(pathToFileURL(resolve('dist/jarvis-v4-staging-isolation-fix.mjs')).href)).default;
const prod=readFileSync('cloudflare/workers/jarvis-backend.mjs','utf8');
const start=prod.indexOf("if(path==='/api/staging/verify' && method==='GET'){");
const end=prod.indexOf("if(path==='/api/staging/auto-status'&&method==='GET'){",start);
assert(start>=0&&end>start,'Expected private staging verifier route');
const verifier=prod.slice(start,end);
for(const url of ['/staging-check','/api/projects','/api/tasks?project_id=staging-project','/api/tasks']){
 assert(verifier.includes('https://jarvis-staging.internal'+url),'Verifier route contract changed: '+url);
}
assert(verifier.includes('blocked.status===404'));
assert(verifier.includes('readApisPass'));
assert(verifier.includes('database_counts_distinct'));
const projects=[{id:'staging-project',name:'Synthetic project',status:'active'}];
const tasks=[{id:'staging-task',project_id:'staging-project',title:'Synthetic task',status:'pending'}];
const db={prepare(sql){let args=[];return{bind(...values){args=values;return this},async first(){
 if(sql.startsWith('SELECT (SELECT COUNT(*) FROM projects)'))return{projects:1,tasks:1};
 if(sql.startsWith('SELECT name FROM projects WHERE id=?'))return projects.find(p=>p.id===args[0])||null;
 throw Error('Unexpected SQL first '+sql);
},async all(){
 if(sql.includes('sqlite_master'))return{results:[{name:'projects'},{name:'tasks'},{name:'memories'}]};
 if(sql.startsWith('SELECT id,name,description,status,created_at,updated_at FROM projects'))return{results:[...projects]};
 if(sql.startsWith('SELECT * FROM tasks WHERE project_id=?'))return{results:tasks.filter(t=>t.project_id===args[0])};
 if(sql.startsWith('SELECT * FROM tasks ORDER BY'))return{results:[...tasks]};
 throw Error('Unexpected SQL all '+sql);
}}}};
const env={DB:db,VERSION:{id:'80077801-2762-4ed3-8581-42b806032c4a'}};
async function send(path,method='GET'){
 const response=await staging.fetch(new Request('https://jarvis-staging.internal'+path,{method}),env,{waitUntil(){}});
 let body=null;try{body=await response.json()}catch{}
 return{status:response.status,ok:response.ok,contentType:response.headers.get('content-type')||'',body};
}
const [health,projectResponse,taskResponse,denied]=await Promise.all([
 send('/staging-check'),send('/api/projects'),send('/api/tasks?project_id=staging-project'),send('/api/tasks','POST')
]);
assert.equal(health.status,200);
assert.match(health.contentType,/application\/json/);
assert.equal(health.body?.worker,'jarvis-staging');
assert.equal(health.body?.environment,'staging');
assert.equal(health.body?.guard_version,2);
assert.equal(health.body?.staging_version_id,env.VERSION.id);
assert.equal(health.body?.production_data_access,false);
assert.equal(health.body?.ai_binding_available,false);
assert.equal(health.body?.push_secret_available,false);
assert.equal(health.body?.isolated_database?.projects,1);
assert.equal(health.body?.isolated_database?.tasks,1);
assert.equal(health.body?.synthetic_suite?.total,5);
assert.equal(health.body?.synthetic_suite?.passed,5);
assert.equal(health.body?.ok,true);
assert.equal(projectResponse.status,200);
assert.deepEqual(projectResponse.body?.projects?.map(x=>x.id),['staging-project']);
assert.equal(taskResponse.status,200);
assert.deepEqual(taskResponse.body?.tasks?.map(x=>x.id),['staging-task']);
assert.equal(denied.status,404,'No-body POST must be blocked as expected by private verifier');
const prodCounts={projects:7,tasks:12};
assert(prodCounts.projects!==health.body.isolated_database.projects||prodCounts.tasks!==health.body.isolated_database.tasks);
assert.equal(projects.length,1);
assert.equal(tasks.length,1);
console.log('Private staging verifier offline contract PASS: all 4 requests, guards, synthetic reads and isolated counts. Not authenticated Cloudflare runtime evidence.');
