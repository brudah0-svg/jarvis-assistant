// Register an explicitly approved plan as pending tasks only. No model or external tools.
export async function corePlanRegistrationRoute(request,env){
 const fail=(status,error)=>({status,data:{error,external_actions_executed:false}});
 try{
  const raw=await request.text();if(raw.length>12000)return fail(413,'Request too large');
  let body;try{body=JSON.parse(raw)}catch{return fail(400,'Invalid JSON')}
  if(!body||Object.keys(body).some(k=>!['project_id','registration_id','goal','steps','assumptions','confirmed'].includes(k))||body.confirmed!==true||
    typeof body.project_id!=='string'||!/^[a-zA-Z0-9_-]{1,100}$/.test(body.project_id)||
    typeof body.registration_id!=='string'||!/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/.test(body.registration_id)||
    typeof body.goal!=='string'||body.goal.trim().length<5||body.goal.trim().length>900)return fail(400,'Invalid registration');
  let plan;try{plan=parseCoreGoalPlan(JSON.stringify({steps:body.steps,assumptions:body.assumptions}))}catch{return fail(400,'Invalid plan')}
  if(!env?.DB||typeof env.DB.batch!=='function')return fail(503,'Database unavailable');
  const project=body.project_id,token=body.registration_id;
  const rows=plan.steps.map(s=>({id:token+'-'+s.order,title:s.title,description:'Obiettivo: '+body.goal.trim()+' | Verifica: '+s.check+' | Dipendenze: '+(s.depends_on.map(n=>token+'-'+n).join(', ')||'nessuna')+' | Solo attività da svolgere; nessuna spesa autorizzata.'}));
  // A single INSERT SELECT either registers all tasks or none. A repeat with the
  // same token is read back, not inserted again. Existing titles block registration.
  const values=rows.map(()=>'(?,?,?)').join(',');
  const sql='WITH incoming(id,title,description) AS (VALUES '+values+') INSERT INTO tasks(id,project_id,title,description,status) SELECT i.id,?,i.title,i.description,\'pending\' FROM incoming i WHERE EXISTS(SELECT 1 FROM projects WHERE id=? AND status=\'active\') AND NOT EXISTS(SELECT 1 FROM tasks t JOIN incoming x ON t.id=x.id OR (t.project_id=? AND lower(trim(t.title))=lower(trim(x.title))) )';
  const read='SELECT id,project_id,title,description,status FROM tasks WHERE id IN ('+rows.map(()=>'?').join(',')+')';
  const results=await env.DB.batch([
   env.DB.prepare(sql).bind(...rows.flatMap(r=>[r.id,r.title,r.description]),project,project,project),
   env.DB.prepare(read).bind(...rows.map(r=>r.id))
  ]);
  if(!Array.isArray(results)||results.length!==2||results.some(r=>r?.success!==true))return fail(503,'Registration outcome not verified');
  const inserted=results[0]?.meta?.changes,stored=results[1]?.results;
  if(!Number.isInteger(inserted)||!Array.isArray(stored)||![0,rows.length].includes(inserted))return fail(503,'Registration outcome not verified');
  if(stored.length!==rows.length||!rows.every(r=>stored.some(t=>t.id===r.id&&t.project_id===project&&t.title===r.title&&t.description===r.description)))return fail(409,'Project inactive, conflicting tasks, or token mismatch; registration not confirmed');
  return {status:200,data:{status:'registered',project_id:project,registration_id:token,created_tasks:inserted,verified_tasks:rows.length,external_actions_executed:false,task_ids:rows.map(r=>r.id)}};
 }catch{return fail(503,'Registration unavailable or outcome unknown; retry with same token')}
}
