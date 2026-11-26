import {readFileSync} from 'node:fs';
async function runSelfAuditRegression(html){
 const parser=html.slice(html.indexOf('function parseJarvisCoreCommand('),html.indexOf('function showSitePreviewInChat('));
 const source=html.slice(html.indexOf('async function runVerifiedSelfAudit('),html.indexOf('async function runJarvisCoreCommand('));
 if(!source||!parser)throw Error('Self audit source missing');
 const make=new Function('api','post','let pendingVoiceAction=null,pendingWebsiteBrief=null;\n'+parser+'\n'+source+'\nreturn {parse:parseJarvisCoreCommand,run:runVerifiedSelfAudit};');
 const runId='12345678-1234-4123-8123-123456789abc',proposalId='22345678-1234-4123-8123-123456789abc';
 const project={id:'p1',name:'JARVIS',status:'active'};
 const tools=['roadmap_coverage','task_hierarchy','approved_plans','duplicate_titles','project_alerts'];
 const fresh=()=>({status:'completed',run_id:runId,project_id:'p1',read_only:true,automatic_fix_applied:false,total_checks:5,passed:4,warnings:1});
 const report=()=>({status:'ok',run:{id:runId,project_id:'p1',status:'completed',total_checks:5,passed:4,warnings:1,completed_at:'2026-11-26'},checks:tools.map((tool,i)=>({tool,verdict:i===3?'warning':'pass',summary:'Controllo '+tool,details:'Evidenza'}))});
 const proposal=()=>({status:'ok',source_run_id:runId,warnings:1,automatic_changes:0,code_execution:false,isolated_tests_executed:false,rollback_executed:false,generated:1,proposals:[{id:proposalId,tool:'duplicate_titles',status:'draft',existing:false}]});
 const saved=()=>({status:'ok',scope:'planning_only',proposals:[{id:proposalId,project_id:'p1',source_run_id:runId,source_tool:'duplicate_titles',status:'draft',title:'Duplicati',diagnosis:'Duplicati trovati',suggested_change:'Revisione',test_plan:'Verifica copia',rollback_plan:'Ripristino copia',risk:'medium'}]});
 let projects=[project],started=fresh(),evidence=report(),prepared=proposal(),stored=saved(),runs=0,preps=0;
 const api=async path=>{if(path==='/api/projects')return {status:'ok',projects};if(path==='/api/executor/runs/'+runId)return evidence;if(path==='/api/self-improvement/proposals?project_id=p1')return stored;throw Error('unexpected read')};
 const post=async(path,body)=>{if(body.project_id!=='p1'||Object.keys(body).length!==1)throw Error('unexpected write');if(path==='/api/executor/run'){runs++;return started}if(path==='/api/self-improvement/prepare'){preps++;return prepared}throw Error('unexpected write')};
 const {parse,run}=make(api,post),checks=[];function check(n,v){if(!v)throw Error(n);checks.push(n)}
 async function rejects(n){let failed=false;try{await run()}catch{failed=true}check(n,failed)}
 check('explicit self analysis routed',parse('Jarvis, analizza il tuo codice')?.kind==='self-audit');
 check('question cannot queue improvement',!parse('Jarvis, migliorati?'));
 check('question cannot retry improvement',!parse('Jarvis, riprova a migliorarti?'));
 check('question cannot prepare changes',!parse('Jarvis, analizza il tuo codice?'));
 projects=[];check('missing project blocks audit',(await run()).includes('Nessuna diagnostica')&&runs===0);
 projects=[project,{...project,id:'p2'}];check('ambiguous JARVIS projects blocked',(await run()).includes('Nessuna diagnostica')&&runs===0);projects=[project];
 const ok=await run();check('complete audit verifies persisted proposal',ok.includes('Proposte verificate: 1')&&ok.includes('non correzioni applicate')&&runs===1&&preps===1);
 started={status:'already_requested',run_id:runId};check('existing audit not claimed as fresh',(await run()).includes('Ho recuperato e verificato'));
 evidence={status:'ok',run:{id:runId,project_id:'p1',status:'running'}};const count=preps;check('running diagnostic does not prepare fixes',(await run()).includes('già in corso')&&preps===count);
 evidence=report();evidence.run.project_id='wrong';await rejects('wrong project blocked before preparation');check('no proposal on wrong evidence',preps===count);
 evidence=report();evidence.run.passed=5;await rejects('invalid check totals rejected');
 evidence=report();evidence.run.passed=5;evidence.run.warnings=0;evidence.checks.forEach(x=>x.verdict='pass');check('no warnings means no proposal',(await run()).includes('Nessuna proposta necessaria')&&preps===count);
 evidence=report();started=fresh();prepared=proposal();prepared.source_run_id=proposalId;await rejects('unrelated source run rejected');
 prepared=proposal();prepared.isolated_tests_executed=true;await rejects('unexpected test claim rejected');
 prepared=proposal();prepared.generated=0;await rejects('false generation count rejected');
 prepared=proposal();stored=saved();stored.proposals[0].source_tool='task_hierarchy';await rejects('wrong saved proposal rejected');
 stored=saved();stored.proposals[0].rollback_plan='';await rejects('missing rollback plan rejected');
 stored=saved();check('valid retry reports review only',(await run()).includes('Nessun test di correzione in sandbox'));
 check('dispatcher connects self audit',html.includes("if(command.kind==='self-audit')return runVerifiedSelfAudit()"));
 return checks;
}
const checks=await runSelfAuditRegression(readFileSync('cloudflare/ui/command-v4-unified.html','utf8'));
console.log('PASS '+checks.length+' self-audit checks:',checks.join('; '));
