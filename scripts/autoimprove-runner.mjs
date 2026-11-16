import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
import {runInNewContext} from 'node:vm';

// Deliberately small, auditable patch surface: only the noisy Italian ASR parser.
export const TARGET='cloudflare/ui/command-v4-unified.html';
export const GATEWAY='https://jarvis-autoimprove.jarvisproj3ct.workers.dev';
export const ALLOWED_REGION_START=' const noisyPrefix=input.match(';
export const ALLOWED_REGION_END=' if(noisyPrefix){';
const forbidden=/\b(?:fetch|XMLHttpRequest|WebSocket|Function|eval|import|require|localStorage|sessionStorage|document|window|globalThis|process|navigator|confirm|post|api|approve|deploy|publish|writeFile|exec|spawn|child_process)\b|(?:<script|<iframe|github_pat_|ghp_|sk-|Bearer\s+)/i;
export const hash=s=>createHash('sha256').update(s).digest('hex');

export function extractPatch(raw){
 let text=String(raw||'').trim().replace(/^```(?:json)?\s*/,'').replace(/\s*```$/,'');
 if(text.length>5000)throw Error('Proposal too long');
 const p=JSON.parse(text);
 if(!p||typeof p!=='object'||Array.isArray(p)||typeof p.reason!=='string')throw Error('Invalid proposal fields');
 // LLM chooses a catalogued, code-reviewed operation. The model does not get
 // permission to synthesize executable code. Unknown identifiers fail closed.
 if(typeof p.operation_id==='string'){
  if(p.operation_id!=='asr-acute-accent-v1')throw Error('Unknown improvement operation');
  const find=String.raw`mi\s*cr[eè]?\s*(?:è|e)?\s*`;
  const replace=String.raw`mi\s*cr[eè]?\s*(?:è|e|é)?\s*`;
  return {find,replace,reason:p.reason.slice(0,220),catalogue_id:p.operation_id};
 }
 if(typeof p.find!=='string'||typeof p.replace!=='string')throw Error('Invalid proposal fields');
 return p;
}
export function safePatch(original,p){
 assert.equal(typeof original,'string');
 if(!p.find||!p.replace)return {changed:false,reason:'AI found no safe change'};
 // Prefer atomic replacements. A 277-character ASR expression should not be
 // recopied by a small LLM: copying the whole expression caused the verified no_change.
 if(p.find.length<6||p.find.length>120||p.replace.length<2||p.replace.length>160)throw Error('Patch size outside atomic limits');
 if(p.find===p.replace)return {changed:false,reason:'No change'};
 if(forbidden.test(p.find)||forbidden.test(p.replace))throw Error('Forbidden operation in patch');
 if(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(p.find+p.replace))throw Error('Control characters rejected');
 const funStart=original.indexOf('function parseJarvisCoreCommand(message){');
 const funEnd=original.indexOf('function showSitePreviewInChat(',funStart);
 if(funStart<0||funEnd<=funStart)throw Error('Core parser anchors missing');
 const start=original.indexOf(ALLOWED_REGION_START,funStart);
 const end=original.indexOf(ALLOWED_REGION_END,start);
 if(start<funStart||end<=start||end>funEnd)throw Error('Permitted area missing');
 const slice=original.slice(start,end);
 if(!slice.includes(p.find)||slice.split(p.find).length!==2)throw Error('Patch does not match exactly once within permitted ASR region');
 if(original.split(p.find).length!==2)throw Error('Patch not unique across source');
 // The only mutable bytes are a contiguous substring *inside* the existing ASR regex.
 // Keep the complete parser expression, statement boundaries, and all adjacent logic.
 if(/[\r\n]/.test(p.find+p.replace))throw Error('Patch must not add lines');
 const patchedSlice=slice.replace(p.find,p.replace);
 const prefix=' const noisyPrefix=input.match(';const suffix='/i);\n';
 if(!patchedSlice.startsWith(prefix)||!patchedSlice.endsWith(suffix)||patchedSlice.split(prefix).length!==2||patchedSlice.split(suffix).length!==2)
  throw Error('ASR regex boundary changed');
 if(patchedSlice.length>slice.length+80||patchedSlice.length<slice.length-80)throw Error('ASR change exceeds local budget');
 const updated=original.slice(0,start)+patchedSlice+original.slice(end);
 if(updated===original)return {changed:false,reason:'No effective change'};
 const diffLen=Math.abs(updated.length-original.length);
 if(diffLen>80)throw Error('Too large ASR change');
 return {changed:true,source:updated,reason:p.reason.slice(0,250),original_sha256:hash(original),updated_sha256:hash(updated)};
}
function makeParser(html,vm){
 const start=html.indexOf('function parseJarvisCoreCommand(message){');
 const end=html.indexOf('function showSitePreviewInChat(',start);
 if(start<0||end<=start)throw Error('Parser source boundaries missing');
 return vm('let pendingVoiceAction=null;\n'+html.slice(start,end)+'\nparseJarvisCoreCommand;',{}, {timeout:1000});
}
export function verifyBehaviorChange(before,after){
 const a=makeParser(before,runInNewContext),b=makeParser(after,runInNewContext);
 const baseline=[
  'Hey Jarvis micr è un sito un sito web per un idraulico per piacere',
  'Hey Jarvis, creami un sito web per Pinco Pallo',
  'Jarvis, migliorati autonomamente',
  'e Jarvis migliorati autonomamente',
  'Jarvis è migliorati autonomamente',
  'Jarvis, stato automiglioramento',
  'Jarvis, riprova a migliorarti',
  'Jarvis, quanto costa un sito web per un idraulico?',
  'Ciao Jarvis mi crei un progetto per il sito di un elettricista',
  'Jarvis, apri l’ultimo sito multipagina'
 ];
 for(const utterance of baseline){
  if(JSON.stringify(a(utterance))!==JSON.stringify(b(utterance)))throw Error('Command regression: '+utterance);
 }
 const edge='Hey Jarvis micr é un sito web per un idraulico';
 const old=a(edge),now=b(edge);
 if(old?.kind==='website')throw Error('Edge case already supported');
 if(now?.kind!=='website'||!String(now.title).includes('idraulico'))throw Error('Patch does not improve the target ASR edge case');
 return {regressions_checked:baseline.length,new_case:edge};
}
export function validateParserWithNode(html){
 const open=html.indexOf('<script>"use strict";');
 const close=html.indexOf('</script>',open);
 if(open<0||close<=open)throw Error('UI JavaScript not found');
 const js=html.slice(open+'<script>'.length,close);
 execFileSync(process.execPath,['--check','-'],{input:js,encoding:'utf8',timeout:15000});
 return true;
}
function run(command,args,options={}){
 return execFileSync(command,args,{encoding:'utf8',timeout:540000,stdio:['ignore','pipe','pipe'],...options});
}
function tokenRequest(audience){
 const url=process.env.ACTIONS_ID_TOKEN_REQUEST_URL,token=process.env.ACTIONS_ID_TOKEN_REQUEST_TOKEN;
 if(!url||!token)throw Error('GitHub OIDC unavailable');
 return {url:url+(url.includes('?')?'&':'?')+'audience='+encodeURIComponent(audience),token};
}
async function getIdentity(){
 const {url,token}=tokenRequest('jarvis-autoimprove-v1');
 const r=await fetch(url,{headers:{authorization:'Bearer '+token},signal:AbortSignal.timeout(10000)});
 if(!r.ok)throw Error('OIDC token could not be obtained');
 const data=await r.json();if(typeof data.value!=='string')throw Error('OIDC response invalid');return data.value;
}
async function gateway(path,body,identity){
 const r=await fetch(GATEWAY+path,{method:'POST',headers:{Authorization:'Bearer '+identity,'Content-Type':'application/json'},body:JSON.stringify(body),signal:AbortSignal.timeout(25000)});
 const json=await r.json().catch(()=>({error:'Invalid JSON'}));
 if(!r.ok)throw Error('Gateway '+path+' HTTP '+r.status+': '+String(json.error||'error'));
 return json;
}
function report(details){
 mkdirSync('dist/autoimprove',{recursive:true});
 const redacted={...details,run_id:process.env.GITHUB_RUN_ID||'local',production_modified:false,requires_review:true};
 writeFileSync('dist/autoimprove/result.json',JSON.stringify(redacted,null,2)+'\n');
 const text=['## JARVIS AutoImprove', '', '- Stato: '+redacted.status,'- Motivo: '+String(redacted.reason||'—'),'- Tentativi: '+String(redacted.attempts||0),'- Modifiche dirette a produzione: nessuna','- Revisione umana necessaria prima dell’unione','',''];
 if(redacted.pull_request)text.push('- Revisione: '+redacted.pull_request);
 if(process.env.GITHUB_STEP_SUMMARY)writeFileSync(process.env.GITHUB_STEP_SUMMARY,text.join('\n'),{flag:'a'});
 console.log(text.join('\n'));
}
async function main(){
 if(process.env.CI!=='true'||process.env.GITHUB_REPOSITORY!=='brudah0-svg/jarvis-assistant'||process.env.GITHUB_REF!=='refs/heads/main')throw Error('Not a trusted main GitHub Actions execution');
 const identity=await getIdentity();
 const requested=String(process.env.AUTOIMPROVE_GOAL||'').slice(0,320);
 const claim=await gateway('/claim',{goal:requested},identity);
 if(claim.status!=='claimed'||!claim.job){report({status:claim.status||'idle',reason:claim.notice||'No jobs'});return}
 const id=claim.job.id,goal=claim.job.goal;
 const original=readFileSync(TARGET,'utf8');
 const sectionStart=original.indexOf(ALLOWED_REGION_START);
 const sectionEnd=original.indexOf(ALLOWED_REGION_END,sectionStart);
 if(sectionStart<0||sectionEnd<0)throw Error('No permitted ASR area');
 const context=original.slice(sectionStart,sectionEnd);
 // A concrete new ASR edge case: the accent 'é' is often transcribed instead of 'è'.
 // This is a test objective, not an AI instruction to change unrelated source.
 const targetUtterance='Hey Jarvis micr é un sito web per un idraulico';

 let feedback='',proposed=null,attempts=0,result='';
 try{
  for(let i=0;i<2;i++){
   attempts++;
   const generated=await gateway('/generate',{job_id:id,context,feedback},identity);
   try{
    const patch=extractPatch(generated.proposal);
    const outcome=safePatch(original,patch);
    if(!outcome.changed){result=outcome.reason;break}
    validateParserWithNode(outcome.source);
    const behavior=verifyBehaviorChange(original,outcome.source);
    writeFileSync(TARGET,outcome.source);
    // Contracts + Android simulation run without Cloudflare secrets, DB or network permissions.
    run('node',['tests/qa-guardian-contract.mjs']);
    run('npm',['test']);
    // The synthetic Android test must also pass; CI workflow installs Chromium first.
    run('node',['tests/unified-browser-android.mjs']);
    proposed={...outcome,attempts};break;
   }catch(e){feedback=String(e?.stderr||e?.message||e).slice(-700);writeFileSync(TARGET,original)}
  }
  if(!proposed){await gateway('/complete',{job_id:id,status:'no_change',result:'No safe verified patch. '+(feedback||result).slice(0,160)},identity);report({status:'no_change',reason:feedback||result,attempts});return}
  // No deployment; only a branch + PR. GitHub Actions GITHUB_TOKEN cannot trigger a second privileged workflow.
  const branch='jarvis/autoimprove-'+String(process.env.GITHUB_RUN_ID||'').replace(/\D/g,'').slice(0,15);
  run('git',['config','user.name','jarvis-autoimprove[bot]']);
  run('git',['config','user.email','41898282+github-actions[bot]@users.noreply.github.com']);
  run('git',['checkout','-b',branch]);
  run('git',['add','--',TARGET]);
  run('git',['commit','-m','fix(voice): guarded Italian ASR improvement ('+id.slice(0,8)+')']);
  run('git',['push','origin','HEAD:refs/heads/'+branch]);
  const message='JARVIS AutoImprove proposal (verified by QA Guardian).\n\nGoal: '+goal+'\n\nAI rationale: '+proposed.reason+'\n\nTests: npm test, QA Guardian contract, synthetic Android Chromium.\n\nRisk: generated change requires human review. **No automatic merge or production deployment.**\n\nJob: '+id;
  let pr='https://github.com/brudah0-svg/jarvis-assistant/compare/main...'+branch+'?expand=1';
  try{
   const r=run('gh',['pr','create','--draft','--base','main','--head',branch,'--title','JARVIS AutoImprove: guarded voice parser patch','--body',message]);
   const parsed=r.match(/https:\/\/github\.com\/brudah0-svg\/jarvis-assistant\/pull\/\d+/);
   if(parsed)pr=parsed[0];
  }catch(e){console.warn('PR creation unavailable; branch and comparison link retained')}
  await gateway('/complete',{job_id:id,status:'proposed',result:pr},identity);
  report({status:'proposed',reason:proposed.reason,attempts,pull_request:pr,branch});
 }catch(error){
  try{await gateway('/complete',{job_id:id,status:'failed',result:String(error?.message||error).slice(0,250)},identity)}catch{}
  report({status:'failed',reason:String(error?.message||error).slice(0,250),attempts});
  process.exitCode=1;
 }
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))main().catch(e=>{console.error('JARVIS AutoImprove failed safely: '+e.message);process.exitCode=1});
