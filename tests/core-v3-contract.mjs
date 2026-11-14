import assert from 'node:assert/strict';
import worker from '../cloudflare/workers/jarvis-backend.mjs';

// Contract tests invoke the actual deployed Worker source against an in-memory
// D1 fixture. No network, Cloudflare account, real records, or deployment.
const projectId='fixture-project';
const state={
  projects:[{id:projectId,name:'Synthetic Project',description:'Synthetic test context',status:'active'}],
  tasks:[{id:'task-1',project_id:projectId,title:'Synthetic existing task',parent_task_id:null,status:'pending'}],
  milestones:[{id:'m1',title:'Connected milestone',task_id:'task-1',linked_task_id:'task-1'}],
  planRecords:[],
  planSteps:[],
  runs:[],
  results:[],
  proposals:[],
  audit:[],
  alerts:[]
};
let writes=0;

function query(sql,params=[]){
 const starts=(p)=>sql.startsWith(p);
 const first=async()=>{
  if(starts("SELECT id,name FROM projects WHERE id=")||starts("SELECT id,name,description FROM projects WHERE id="))return state.projects.find(p=>p.id===params[0]&&p.status==='active')||null;
  if(starts("SELECT id,status,completed_at FROM executor_runs WHERE project_id="))return [...state.runs].reverse().find(r=>r.project_id===params[0])||null;
  if(starts("SELECT id FROM executor_runs WHERE run_key="))return state.runs.find(r=>r.run_key===params[0])||null;
  if(starts("SELECT id,project_id,status,total_checks,passed,warnings,created_at,completed_at FROM executor_runs WHERE id="))return state.runs.find(r=>r.id===params[0])||null;
  if(starts("SELECT id,status FROM improvement_proposals WHERE source_run_id="))return state.proposals.find(x=>x.source_run_id===params[0]&&x.source_tool===params[1])||null;
  if(starts("SELECT id,status FROM improvement_proposals WHERE id="))return state.proposals.find(x=>x.id===params[0])||null;
  if(starts("SELECT id,project_id,status,parent_task_id FROM ai_plans WHERE id="))return state.planRecords.find(x=>x.id===params[0])||null;
  if(starts("SELECT * FROM ai_plans WHERE id="))return state.planRecords.find(x=>x.id===params[0])||null;
  if(starts("SELECT id,title,description,status FROM tasks WHERE id="))return state.tasks.find(t=>t.id===params[0]&&t.project_id===params[1]&&t.status!=='done')||null;
  throw Error('Unhandled first SQL: '+sql);
 };
 const all=async()=>{
  if(starts("SELECT m.id,m.title,l.task_id"))return {results:state.milestones};
  if(starts("SELECT id,title,parent_task_id,status FROM tasks"))return {results:state.tasks.filter(t=>t.project_id===params[0])};
  if(starts("SELECT p.id AS plan_id,p.status,s.id AS step_id"))return {results:state.planSteps.map(s=>({plan_id:s.plan_id,status:state.planRecords.find(p=>p.id===s.plan_id)?.status,step_id:s.id,task_id:s.task_id,linked_task_id:state.tasks.find(t=>t.id===s.task_id)?.id||null}))};
  if(starts("SELECT lower(trim(title)) AS normalized"))return {results:[]};
  if(starts("SELECT kind,severity,title FROM monitoring_events"))return {results:state.alerts};
  if(starts("SELECT tool,verdict,summary,details FROM executor_check_results WHERE run_id="))return {results:state.results.filter(x=>x.run_id===params[0]&&x.verdict==='warning').map(x=>({tool:x.tool,verdict:x.verdict,summary:x.summary,details:x.details}))};
  if(starts("SELECT tool,verdict,summary,details,created_at FROM executor_check_results"))return {results:state.results.filter(x=>x.run_id===params[0])};
  if(starts("SELECT id,project_id,status,total_checks,passed,warnings,created_at,completed_at FROM executor_runs"))return {results:state.runs.filter(x=>!params.length||x.project_id===params[0])};
  if(starts("SELECT id,project_id,source_run_id,source_tool,title,diagnosis,suggested_change"))return {results:state.proposals.filter(x=>!params.length||x.project_id===params[0])};
  if(starts("SELECT title,status FROM tasks WHERE project_id="))return {results:state.tasks.filter(t=>t.project_id===params[0]).map(({title,status})=>({title,status}))};
  if(starts("SELECT id,title,description,status,phase FROM roadmap_milestones"))return {results:[]};
  if(starts("SELECT p.id,p.project_id,p.goal,p.status,p.created_at"))return {results:state.planRecords.map(p=>({...p,step_count:state.planSteps.filter(s=>s.plan_id===p.id).length}))};
  if(starts("SELECT id,ordinal AS position,title,description,check_criteria AS verification,task_id FROM ai_plan_steps"))return {results:state.planSteps.filter(x=>x.plan_id===params[0]).map(x=>({id:x.id,position:x.ordinal,title:x.title,description:x.description,verification:x.check_criteria,task_id:x.task_id||null}))};
  if(starts("SELECT title FROM tasks WHERE project_id="))return {results:state.tasks.filter(x=>x.project_id===params[0]&&x.status!=='done').map(x=>({title:x.title}))};
  if(starts("SELECT id,title,description,check_criteria AS verification FROM ai_plan_steps"))return {results:state.planSteps.filter(x=>x.plan_id===params[0]).map(x=>({id:x.id,title:x.title,description:x.description,verification:x.check_criteria}))};
  throw Error('Unhandled all SQL: '+sql);
 };
 const run=async()=>{
  if(starts("INSERT OR IGNORE INTO executor_runs")){
   if(state.runs.some(r=>r.run_key===params[2]))return {meta:{changes:0}};
   state.runs.push({id:params[0],project_id:params[1],run_key:params[2],status:'running',total_checks:0,passed:0,warnings:0,created_at:'2026-11-14 00:00:00'});
   writes++;return {meta:{changes:1}};
  }
  if(starts("INSERT INTO executor_check_results")){
   state.results.push({id:params[0],run_id:params[1],tool:params[2],verdict:params[3],summary:params[4],details:params[5]});writes++;return {meta:{changes:1}};
  }
  if(starts("UPDATE executor_runs SET status='completed'")){
   const r=state.runs.find(x=>x.id===params[3]&&x.status==='running');
   if(!r)return {meta:{changes:0}};
   Object.assign(r,{status:'completed',total_checks:params[0],passed:params[1],warnings:params[2],completed_at:'2026-11-14 00:00:01'});writes++;return {meta:{changes:1}};
  }
  if(starts("UPDATE executor_runs SET status='failed'"))return {meta:{changes:0}};
  if(starts("INSERT OR IGNORE INTO improvement_proposals")){
   const [id,project_id,source_run_id,source_tool,title,diagnosis,suggested_change,test_plan,rollback_plan,risk]=params;
   if(state.proposals.some(x=>x.source_run_id===source_run_id&&x.source_tool===source_tool))return {meta:{changes:0}};
   state.proposals.push({id,project_id,source_run_id,source_tool,title,diagnosis,suggested_change,test_plan,rollback_plan,risk,status:'draft'});writes++;return {meta:{changes:1}};
  }
  if(starts("INSERT INTO improvement_audit")){state.audit.push({id:params[0],proposal_id:params[1],action:params[2],note:params[3]});writes++;return {meta:{changes:1}}}
  if(starts("UPDATE improvement_proposals SET status=")){
   const rec=state.proposals.find(p=>p.id===params[1]&&p.status==='draft');
   if(!rec)return {meta:{changes:0}};
   rec.status=params[0];writes++;return {meta:{changes:1}};
  }
  if(starts("UPDATE ai_plans SET status='rejected'")){
   const rec=state.planRecords.find(p=>p.id===params[0]&&p.status==='pending');
   if(!rec)return {meta:{changes:0}};
   rec.status='rejected';writes++;return {meta:{changes:1}};
  }
  throw Error('Unhandled run SQL: '+sql);
 };
 return {bind:(...vals)=>query(sql,vals),first,all,run,sql,params};
}
const DB={
  prepare:sql=>query(sql),
  async batch(commands){
   const results=[];
   for(const cmd of commands){
    if(cmd.sql.startsWith("INSERT INTO ai_plans(")){
     state.planRecords.push({id:cmd.params[0],project_id:cmd.params[1],goal:cmd.params[2],status:'pending',parent_task_id:cmd.params[3]});writes++;results.push({meta:{changes:1}});
    }else if(cmd.sql.startsWith("INSERT INTO ai_plan_steps(")){
     state.planSteps.push({id:cmd.params[0],plan_id:cmd.params[1],ordinal:cmd.params[2],title:cmd.params[3],description:cmd.params[4],check_criteria:cmd.params[5]});writes++;results.push({meta:{changes:1}});
    }else results.push(await cmd.run());
   }
   return results;
  }
};
const validPlan={
 steps:[
  {title:'Prepare synthetic fixture',description:'Create isolated test inputs for contract validation',verification:'Verify fixture schema and records'},
  {title:'Execute synthetic tests',description:'Run safe checks against an in-memory database',verification:'Verify all expected contract responses'},
  {title:'Review synthetic outcomes',description:'Document discrepancies without modifying production',verification:'Confirm all test assertions passed'}
 ]
};
const AI={run:async()=>({response:JSON.stringify(validPlan)})};
async function call(path,{method='GET',payload,env={DB,AI},origin,contentType='application/json'}={}){
 const headers={};
 if(origin)headers.Origin=origin;
 if(payload!==undefined&&contentType)headers['content-type']=contentType;
 const body=payload===undefined?undefined:typeof payload==='string'?payload:JSON.stringify(payload);
 const response=await worker.fetch(new Request('https://jarvis.example'+path,{method,headers,body}),env,{waitUntil:()=>{}});
 let data;
 try{data=await response.json()}catch{data=null}
 return {code:response.status,data};
}
const nothing={DB};
assert.equal((await call('/api/executor/tools',{env:{}})).code,200);
const tools=(await call('/api/executor/tools',{env:{}})).data;
assert.equal(tools.mode,'diagnostics_only');
assert.equal(tools.tools.length,5);
assert(tools.tools.every(t=>t.risk==='read_only'&&t.writes_business_data===false));
assert.equal((await call('/api/executor/runs',{env:{}})).code,503);
assert.equal((await call('/api/executor/runs?project_id=bad!',{env:nothing})).code,400);
assert.equal((await call('/api/executor/runs/not-an-id',{env:nothing})).code,400);
assert.equal((await call('/api/executor/run',{method:'POST',payload:'{',env:nothing})).code,400);
assert.equal((await call('/api/executor/run',{method:'POST',payload:{project_id:projectId,other:true},env:nothing})).code,400);
assert.equal((await call('/api/executor/run',{method:'POST',payload:{project_id:projectId},env:nothing,contentType:'text/plain'})).code,415);
assert.equal((await call('/api/executor/tools',{env:{},origin:'https://unexpected.example'})).code,403);
const beforeTasks=state.tasks.length;
const diagnostics=await call('/api/executor/run',{method:'POST',payload:{project_id:projectId},env:nothing});
assert.equal(diagnostics.code,200,JSON.stringify(diagnostics));
assert.equal(diagnostics.data.status,'completed');
assert.equal(diagnostics.data.total_checks,5);
assert.equal(diagnostics.data.passed,5);
assert.equal(diagnostics.data.warnings,0);
assert.equal(diagnostics.data.read_only,true);
assert.equal(state.tasks.length,beforeTasks);
const repeat=await call('/api/executor/run',{method:'POST',payload:{project_id:projectId},env:nothing});
assert.equal(repeat.code,200);
assert.equal(repeat.data.status,'already_requested');
assert.equal(state.runs.length,1,'run claim should deduplicate within one minute');
const runDetails=await call('/api/executor/runs/'+diagnostics.data.run_id,{env:nothing});
assert.equal(runDetails.code,200);
assert.equal(runDetails.data.checks.length,5);

const cleanProposal=await call('/api/self-improvement/prepare',{method:'POST',payload:{project_id:projectId},env:nothing});
assert.equal(cleanProposal.code,200);
assert.equal(cleanProposal.data.generated,0);
assert.equal(cleanProposal.data.automatic_changes,0);
assert.equal((await call('/api/self-improvement/prepare',{method:'POST',payload:{project_id:projectId,auto_apply:true},env:nothing})).code,400);
assert.equal((await call('/api/self-improvement/prepare',{method:'POST',payload:{project_id:'other-project'},env:nothing})).code,409);
assert.equal((await call('/api/self-improvement/proposals/'+diagnostics.data.run_id+'/deploy',{method:'POST',env:nothing})).code,400);

// A synthetic warning run must produce proposals, not business data mutations.
const warningId='b6e13b5d-20b8-49c0-8560-17c55f090011';
state.runs.push({id:warningId,project_id:projectId,status:'completed',created_at:'2026-11-14 00:01:00'});
state.results.push({run_id:warningId,tool:'task_hierarchy',verdict:'warning',summary:'Synthetic orphan parent',details:'No real task affected'});
const improvement=await call('/api/self-improvement/prepare',{method:'POST',payload:{project_id:projectId},env:nothing});
assert.equal(improvement.code,200,JSON.stringify(improvement));
assert.equal(improvement.data.generated,1);
assert.equal(improvement.data.automatic_changes,0);
assert.equal(state.tasks.length,beforeTasks);
const duplicate=await call('/api/self-improvement/prepare',{method:'POST',payload:{project_id:projectId},env:nothing});
assert.equal(duplicate.data.generated,0);
assert.equal(state.proposals.length,1);
const proposalId=state.proposals[0].id;
const reviewed=await call('/api/self-improvement/proposals/'+proposalId+'/approve-review',{method:'POST',env:nothing});
assert.equal(reviewed.code,200);
assert.equal(reviewed.data.production_changes,false);
assert.equal(reviewed.data.requires_separate_deployment_approval,true);
assert.equal(state.tasks.length,beforeTasks);
assert.equal((await call('/api/self-improvement/proposals/'+proposalId+'/approve-review',{method:'POST',env:nothing})).code,409);

assert.equal((await call('/api/ai-plan',{method:'POST',payload:{project_id:projectId,goal:'Build safe tests'},env:nothing})).code,503);
assert.equal((await call('/api/ai-plan',{method:'POST',payload:{project_id:projectId,goal:'bad'},env:{DB,AI}})).code,400);
assert.equal((await call('/api/ai-plan',{method:'POST',payload:{project_id:'missing-project',goal:'Create a testable safe plan'},env:{DB,AI}})).code,404);
const draft=await call('/api/ai-plan',{method:'POST',payload:{project_id:projectId,goal:'Create isolated and reversible validation workflow'},env:{DB,AI}});
assert.equal(draft.code,201,JSON.stringify(draft));
assert.equal(draft.data.status,'pending');
assert.equal(draft.data.requires_approval,true);
assert.equal(draft.data.actions_executed,false);
assert.equal(draft.data.steps.length,3);
assert.equal(state.tasks.length,beforeTasks);
const planId=draft.data.plan_id;
const preview=await call('/api/ai-plans/'+planId,{env:nothing});
assert.equal(preview.code,200,JSON.stringify(preview));
assert.equal(preview.data.steps.length,3);
assert.equal((await call('/api/ai-plans/'+planId+'/deploy',{method:'POST',env:nothing})).code,400);
// Simulate a matching existing business task: approval must be blocked.
state.tasks.push({id:'synthetic-duplicate',project_id:projectId,title:validPlan.steps[0].title,status:'pending'});
const approval=await call('/api/ai-plans/'+planId+'/approve',{method:'POST',env:nothing});
assert.equal(approval.code,409,JSON.stringify(approval));
assert.equal(approval.data.code,'duplicate_task');
assert.equal(state.tasks.length,beforeTasks+1);
const rejected=await call('/api/ai-plans/'+planId+'/reject',{method:'POST',env:nothing});
assert.equal(rejected.code,200);
assert.equal(rejected.data.status,'rejected');
assert.equal((await call('/api/ai-plans/'+planId+'/reject',{method:'POST',env:nothing})).code,409);
assert.equal(state.tasks.length,beforeTasks+1);
assert(writes>0,'fixture audit writes should have been recorded in memory');
console.log('Core v3 tests passed: Executor 5 checks, idempotency, Self-Improvement review/duplicate safety, Planner drafts and approval guard.');
