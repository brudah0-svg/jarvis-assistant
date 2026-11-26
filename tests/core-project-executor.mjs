import {readFileSync} from 'node:fs';
async function runExecutorRegression(html){
 const parser=html.slice(html.indexOf('function parseJarvisCoreCommand('),html.indexOf('function showSitePreviewInChat('));
 const source=html.slice(html.indexOf('async function runProjectDiagnostic('),html.indexOf('async function runJarvisCoreCommand('));
 if(!source||!parser)throw Error('Executor source missing');
 const make=new Function('api','post','let pendingVoiceAction=null,pendingWebsiteBrief=null;\n'+parser+'\n'+source+'\nreturn {parse:parseJarvisCoreCommand,run:runProjectDiagnostic};');
 const id='12345678-1234-4123-8123-123456789abc';
 const project={id:'p1',name:'Alfa',status:'active'};
 const types=['roadmap_coverage','task_hierarchy','approved_plans','duplicate_titles','project_alerts'];
 const checks=types.map((tool,i)=>({tool,verdict:i===3?'warning':'pass',summary:i===3?'Titoli duplicati':'Controllo superato',details:'Dati verificati'}));
 let projects=[project],posts=0,reads=0;
 const fresh=()=>({status:'completed',run_id:id,project_id:'p1',read_only:true,automatic_fix_applied:false,total_checks:5,passed:4,warnings:1});
 const verified=()=>({status:'ok',run:{id,project_id:'p1',status:'completed',total_checks:5,passed:4,warnings:1,completed_at:'2026-11-26'},checks:checks.map(x=>({...x}))});
 let start=fresh(),report=verified();
 const api=async path=>{if(path==='/api/projects')return{status:'ok',projects};if(path==='/api/executor/runs/'+id){reads++;return report}throw Error('unexpected read')};
 const post=async(path,body)=>{if(path!=='/api/executor/run'||body.project_id!=='p1'||Object.keys(body).length!==1)throw Error('unexpected write');posts++;return start};
 const {parse,run}=make(api,post);
 const cmd={kind:'project-diagnostic',projectName:'Alfa'};
 const results=[];function check(n,v){if(!v)throw Error(n);results.push(n)}
 async function rejects(n){let failed=false;try{await run(cmd)}catch{failed=true}check(n,failed)}
 check('explicit diagnosis routed',parse('Jarvis, esegui la diagnostica del progetto Alfa')?.projectName==='Alfa');
 check('short project check routed',parse('Controlla il progetto Alfa')?.kind==='project-diagnostic');
 check('question not an execution command',!parse('Controlla il progetto Alfa?'));
 check('unknown project does not execute',(await run({...cmd,projectName:'Beta'})).includes('Nessun controllo')&&posts===0);
 projects=[project,{...project,id:'p2'}];check('ambiguous project blocked',(await run(cmd)).includes('Nessun controllo')&&posts===0);projects=[project];
 const ok=await run(cmd);check('fresh execution verified by second read',ok.includes('Ho eseguito e verificato')&&ok.includes('4/5')&&posts===1&&reads===1);
 check('warnings are reported rather than concealed',ok.includes('Titoli duplicati')&&ok.includes('Nessuna correzione automatica'));
 start={status:'already_requested',run_id:id};check('existing report not claimed as newly executed',(await run(cmd)).includes('già richiesta'));
 report={status:'ok',run:{id,project_id:'p1',status:'running'}};check('running report not declared finished',(await run(cmd)).includes('Nessun risultato finale'));
 report={status:'ok',run:{id,project_id:'p1',status:'failed'}};check('failed report truthful',(await run(cmd)).includes('risulta fallita'));
 report=verified();report.run.project_id='other';await rejects('wrong project report rejected');
 report=verified();report.checks.pop();await rejects('missing check rejected');
 report=verified();report.checks[0].tool=report.checks[1].tool;await rejects('duplicate check rejected');
 report=verified();report.run.passed=5;await rejects('inconsistent counts rejected');
 report=verified();start=fresh();start.warnings=0;await rejects('start and persisted report must agree');
 start={...fresh(),automatic_fix_applied:true};await rejects('unapproved fix flag rejected');
 start={status:'completed',run_id:'bad'};await rejects('invalid run ID rejected');
 check('command dispatch reuses existing executor',html.includes("if(command.kind==='project-diagnostic')return runProjectDiagnostic(command)"));
 return results;
}
const checks=await runExecutorRegression(readFileSync('cloudflare/ui/command-v4-unified.html','utf8'));
console.log('PASS '+checks.length+' executor checks:',checks.join('; '));
