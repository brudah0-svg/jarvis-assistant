import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {pathToFileURL} from 'node:url';
import {resolve} from 'node:path';
import {randomUUID} from 'node:crypto';

// This is a local synthetic execution of the exact pinned source, NOT a remote Cloudflare run.
execFileSync(process.execPath,['scripts/build-v4-ui-next.mjs'],{stdio:'inherit'});
const worker=(await import(pathToFileURL(resolve('dist/jarvis-v4-ui-next.mjs')).href)).default;
const version='b27360b9-b467-4770-beeb-bf8f08629a6d';
const projects=[{id:'staging-project',name:'Fixture',description:'Synthetic',status:'active'}];
const tasks=[{id:'staging-task',project_id:'staging-project',title:'Fixture task',status:'pending'}];
const tables=['projects','tasks','memories'];
const db={
 prepare(sql){
  let args=[];
  const q={
   bind(...a){args=a;return this},
   async all(){
    if(sql.startsWith("SELECT name FROM sqlite_master"))return {results:tables.map(name=>({name}))};
    if(sql.startsWith('SELECT id FROM projects WHERE name=?'))return {results:projects.filter(p=>p.name===args[0]).map(p=>({id:p.id}))};
    if(sql.startsWith('SELECT id,name,description,status,created_at,updated_at FROM projects'))return {results:[...projects]};
    if(sql.startsWith('SELECT * FROM tasks WHERE project_id=?'))return {results:tasks.filter(t=>t.project_id===args[0])};
    if(sql.startsWith('SELECT * FROM tasks ORDER BY'))return {results:[...tasks]};
    throw Error('Unsupported synthetic all SQL: '+sql);
   },
   async first(){
    if(sql.startsWith('SELECT (SELECT COUNT(*) FROM projects)'))return {projects:projects.length,tasks:tasks.length};
    if(sql.startsWith('SELECT name FROM projects WHERE id=?'))return projects.find(p=>p.id===args[0])||null;
    if(sql.startsWith('SELECT id FROM projects WHERE id=?'))return projects.find(p=>p.id===args[0])||null;
    if(sql.startsWith('SELECT * FROM projects WHERE id=?'))return projects.find(p=>p.id===args[0])||null;
    if(sql.startsWith('SELECT * FROM tasks WHERE id=?'))return tasks.find(t=>t.id===args[0])||null;
    throw Error('Unsupported synthetic first SQL: '+sql);
   },
   async run(){
    if(sql.startsWith('INSERT INTO projects')){projects.push({id:args[0],name:args[1],description:args[2],status:'active'});return {meta:{changes:1}}}
    if(sql.startsWith('INSERT INTO tasks')){tasks.push({id:args[0],project_id:args[1],title:args[2],description:args[3],status:'pending'});return {meta:{changes:1}}}
    if(sql.startsWith('DELETE FROM tasks WHERE project_id=?')){const n=tasks.length;for(let i=tasks.length-1;i>=0;i--)if(tasks[i].project_id===args[0])tasks.splice(i,1);return {meta:{changes:n-tasks.length}}}
    if(sql.startsWith('DELETE FROM projects WHERE id=?')){const n=projects.length;for(let i=projects.length-1;i>=0;i--)if(projects[i].id===args[0]&&projects[i].name===args[1])projects.splice(i,1);return {meta:{changes:n-projects.length}}}
    throw Error('Unsupported synthetic run SQL: '+sql);
   }
  };
  return q;
 },
 async batch(commands){const out=[];for(const q of commands)out.push(await q.run());return out}
};
const env={DB:db,VERSION:{id:version}};
async function call(path,method='GET',data){
 const res=await worker.fetch(new Request('https://staging.example'+path,{
  method,headers:data?{'Content-Type':'application/json'}:{},body:data?JSON.stringify(data):undefined
 }),env,{waitUntil(){}});
 let body;try{body=await res.json()}catch{body=null}
 return {status:res.status,data:body};
}
const id=randomUUID(),projectName='JARVIS-REG-'+id,taskName='JARVIS-REG-TASK-'+id;
const checks=[];
const test=(name,ok)=>checks.push({name,passed:!!ok});
let projectId=null,cleaned=false;
try{
 const health=await call('/staging-check');
 test('staging_version_present',health.status===200&&health.data?.staging_version_id===version);
 const baseline=await call('/api/projects');
 test('baseline_read',baseline.status===200&&baseline.data?.projects?.length===1);
 const create=await call('/api/projects','POST',{name:projectName,description:'Staging regression temporary fixture'});
 projectId=create.data?.project?.id||null;
 test('project_create',create.status===201&&!!projectId);
 const all=await call('/api/projects');
 test('project_read',all.status===200&&all.data?.projects?.some(p=>p.id===projectId));
 const task=await call('/api/tasks','POST',{project_id:projectId,title:taskName,description:'Staging regression temporary fixture'});
 test('task_create',task.status===201&&!!task.data?.task?.id);
 const found=await call('/api/tasks?project_id='+encodeURIComponent(projectId));
 test('task_read',found.status===200&&found.data?.tasks?.some(t=>t.id===task.data.task.id));
 const deny=await call('/api/projects','POST',{name:'UNAUTHORIZED-REGRESSION',description:'Staging regression temporary fixture'});
 test('unapproved_write_block',deny.status===404);
 const patch=await call('/api/tasks/staging-task','PATCH',{title:'changed'});
 test('patch_block',patch.status===404);
}finally{
 const cleanup=await call('/staging-regression-cleanup','POST',{run_id:id});
 cleaned=cleanup.status===200&&cleanup.data?.fixture_restored===true;
 test('cleanup_and_restore',cleaned);
 const finalHealth=await call('/staging-check');
 test('staging_version_unchanged',finalHealth.status===200&&finalHealth.data?.staging_version_id===version);
}
assert.equal(checks.length,10);
assert.equal(checks.filter(x=>x.passed).length,10,JSON.stringify(checks.filter(x=>!x.passed)));
assert.equal(cleaned,true);
assert.equal(projects.length,1);
assert.equal(tasks.length,1);
console.log('OFFLINE synthetic staging regression passed 10/10 using the current pinned Worker implementation. Not a Cloudflare runtime regression.');
