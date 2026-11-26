import {readFileSync} from 'node:fs';
async function runRegistrationRegression(core,planner,html,build){
 const route=new Function((planner+'\n'+core).replace(/^export /gm,'')+'\nreturn corePlanRegistrationRoute')();
 const token='12345678-1234-4123-8123-123456789abc';
 const steps=[{order:1,title:'Definire obiettivo',check:'Obiettivo verificato',depends_on:[]},{order:2,title:'Verificare risorse',check:'Risorse documentate',depends_on:[1]},{order:3,title:'Preparare risultato',check:'Risultato controllato',depends_on:[2]}];
 const body={project_id:'p1',registration_id:token,goal:'Organizzare un progetto',steps,assumptions:[],confirmed:true};
 let batches=0,stored=[],conflict=false,active=true,bad=false;
 const db={prepare(sql){return{sql,bind(...args){return{sql,args}}}},async batch([insert,read]){
  batches++;if(!insert.sql.startsWith('WITH incoming')||!read.sql.startsWith('SELECT id'))throw Error('unexpected SQL');
  const args=insert.args,project=args.at(-1),rows=[];
  for(let i=0;i<args.length-3;i+=3)rows.push({id:args[i],title:args[i+1],description:args[i+2],project_id:project,status:'pending'});
  let changes=0;if(active&&!conflict&&!stored.some(r=>rows.some(x=>x.id===r.id||x.title===r.title))){stored.push(...rows);changes=rows.length}
  return [{success:true,meta:{changes}},{success:true,results:bad?[]:stored.filter(r=>read.args.includes(r.id))}]
 }};
 const hit=b=>route({text:async()=>JSON.stringify(b)},{DB:db,AI:new Proxy({},{get(){throw Error('No AI calls')}})});
 const checks=[];function check(n,v){if(!v)throw Error(n);checks.push(n)}
 check('explicit confirmation required',(await hit({...body,confirmed:false})).status===400&&batches===0);
 check('invalid token rejected',(await hit({...body,registration_id:'wrong'})).status===400&&batches===0);
 check('unexpected execution flag rejected',(await hit({...body,execute:true})).status===400&&batches===0);
 check('invalid dependency rejected',(await hit({...body,steps:steps.map(s=>({...s,depends_on:[3]}))})).status===400&&batches===0);
 let r=await hit(body);check('all steps registered and verified',r.status===200&&r.data.created_tasks===3&&r.data.verified_tasks===3&&stored.length===3);
 check('task descriptions preserve dependency IDs',stored[2].description.includes(token+'-2'));
 check('no external work claim',r.data.external_actions_executed===false&&stored.every(x=>x.status==='pending'));
 r=await hit(body);check('retry is idempotent',r.status===200&&r.data.created_tasks===0&&stored.length===3);
 check('token cannot change goal',(await hit({...body,goal:'Cambiare obiettivo'})).status===409&&stored.length===3);
 check('token cannot change project',(await hit({...body,project_id:'p2'})).status===409&&stored.length===3);
 const next={...body,registration_id:'22345678-1234-4123-8123-123456789abc'};conflict=true;
 check('existing conflict blocks registration',(await hit(next)).status===409&&stored.length===3);
 conflict=false;active=false;check('inactive project blocked',(await hit(next)).status===409&&stored.length===3);
 active=true;bad=true;check('unverified readback never success',(await hit(body)).status===409);bad=false;
 check('missing DB unavailable',(await route({text:async()=>JSON.stringify(body)},{})).status===503);
 const parser=html.slice(html.indexOf('function parseJarvisCoreCommand('),html.indexOf('function showSitePreviewInChat('));
 const p=new Function('let pendingVoiceAction=null,pendingWebsiteBrief=null;\n'+parser+'\nreturn parseJarvisCoreCommand')();
 check('explicit named-project command routed',p('Jarvis, registra il piano nel progetto Alfa')?.projectName==='Alfa');
 check('question is not a registration command',!p('Registra il piano nel progetto Alfa?'));
 check('generic execution not routed as registration',!p('Esegui il piano'));
 check('candidate includes registration route',build.includes('corePlanRegistrationRoute(request,env)'));
 const source=html.slice(html.indexOf('async function runCorePlanRegistration('),html.indexOf('async function runJarvisCoreCommand('));
 let posts=0,now=1000;
 const plan={goal:body.goal,steps,assumptions:[],token,expiresAt:300000};
 const make=new Function('api','post','loadAll','Date','let lastCorePlan='+JSON.stringify(plan)+',pendingVoiceAction=null;\n'+source+'\nreturn {run:runCorePlanRegistration,pending:()=>pendingVoiceAction};');
 const control=make(async()=>({status:'ok',projects:[{id:'p1',name:'Alfa',status:'active'}]}),async(path,data)=>{posts++;return {status:'registered',project_id:'p1',registration_id:token,created_tasks:3,verified_tasks:3,external_actions_executed:false,task_ids:steps.map(s=>token+'-'+s.order)}},async()=>{}, {now:()=>now});
 await control.run({kind:'plan-register',projectName:'Alfa'});check('preview only, no write before confirmation',posts===0&&control.pending().command.registration.projectId==='p1');
 const confirmed={...control.pending().command,voiceConfirmed:true};
 check('confirmed exact draft registers tasks',(await control.run(confirmed)).includes('Ho registrato 3')&&posts===1);
 now=400000;check('expired confirmed draft cannot write',(await control.run(confirmed)).includes('scaduta')&&posts===1);
 return checks;
}
const checks=await runRegistrationRegression(readFileSync('cloudflare/workers/core-plan-registration.mjs','utf8'),readFileSync('cloudflare/workers/core-goal-planner.mjs','utf8'),readFileSync('cloudflare/ui/command-v4-unified.html','utf8'),readFileSync('scripts/build-unified-trusted-chat.mjs','utf8'));
console.log('PASS '+checks.length+' registration checks:',checks.join('; '));
