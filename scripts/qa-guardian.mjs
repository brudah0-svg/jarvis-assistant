import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {mkdirSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';

export const SUITES=Object.freeze({
  contracts:{command:'npm',args:['test'],timeoutMs:540000,description:'Contratti, sicurezza, memoria, Core AI, persistenza e regressioni'},
  android:{command:process.execPath,args:['tests/unified-browser-android.mjs'],timeoutMs:540000,description:'Browser Android simulato: dialogo, conferme vocali, siti e recupero Cloud'}
});

export function redactLog(source){
  return String(source||'').replace(/\x1b\[[0-9;]*m/g,'')
    .replace(/(ghp_|github_pat_|sk-)[A-Za-z0-9_-]{18,}/g,'[REDACTED_TOKEN]')
    .replace(/Bearer\s+[A-Za-z0-9_.-]{20,}/gi,'Bearer [REDACTED]')
    .replace(/-----BEGIN [^-]*PRIVATE KEY-----[\s\S]*?-----END [^-]*PRIVATE KEY-----/g,'[REDACTED_KEY]')
    .slice(-12000);
}

export function diagnoseFailure(source,{timedOut=false}={}){
  const log=redactLog(source);
  if(/potential credential|private key|secret.*expos|unsafe write|unapproved_write_block/i.test(log))
    return {category:'security',priority:'critical',recommendation:'Bloccare il rilascio; verificare credenziali e permessi. Nessuna correzione automatica in produzione.'};
  if(timedOut||/timeout|timed out|waiting for selector|waiting for function/i.test(log))
    return {category:'timeout',priority:'high',recommendation:'Riprodurre il test isolato e controllare attese, microfono simulato, rete di prova e risorse.'};
  if(/AssertionError|ERR_ASSERTION|Expected values|assert\(/i.test(log))
    return {category:'regression',priority:'high',recommendation:'Confrontare il risultato atteso con quello ottenuto; preparare una patch sul ramo di sviluppo e ripetere la suite.'};
  if(/Cannot find module|ERR_MODULE_NOT_FOUND|npm ERR|installation failed|failed to launch/i.test(log))
    return {category:'environment',priority:'medium',recommendation:'Controllare dipendenze e ambiente GitHub Actions; non modificare dati reali.'};
  return {category:'unknown',priority:'high',recommendation:'Ispezionare il log completo del job, riprodurre la prova e bloccare il rilascio finché non passa.'};
}

export function markdownReport(report){
  const flag=report.passed?'PASS':'FAIL';
  const diagnosis=report.diagnosis;
  const lines=[
    '# JARVIS QA Guardian — '+flag,
    '',
    '- Suite: `'+report.suite+'`',
    '- Commit: `'+report.commit+'`',
    '- Esito: **'+flag+'**',
    '- Durata: '+report.duration_seconds+' secondi',
    '- Ambiente: GitHub Actions / dati sintetici',
    '- Mutazioni su produzione: **nessuna**',
    '- Auto-deployment: **disabilitato**',
    '',
    diagnosis?'## Diagnosi preliminare':'## Verifica automatica',
    diagnosis?'- Classe: `'+diagnosis.category+'` · Priorità: **'+diagnosis.priority+'**':'- Tutti i controlli previsti dalla suite sono stati superati.',
    diagnosis?'- Prossima azione: '+diagnosis.recommendation:'- Un risultato positivo non certifica il microfono fisico Android né la qualità del modello AI reale.',
    ''
  ];
  if(!report.passed)lines.push('## Log estratto (sanificato)','', '```text',report.log_excerpt,'```','');
  return lines.join('\n');
}

export function runSuite(suite,{cwd=process.cwd(),env=process.env}={}){
  const cfg=SUITES[suite];
  assert(cfg,'Unknown QA suite: '+suite);
  const started=Date.now();
  const run=spawnSync(cfg.command,cfg.args,{
    cwd,encoding:'utf8',timeout:cfg.timeoutMs,maxBuffer:8*1024*1024,
    env:{...env,CI:'true'},windowsHide:true
  });
  const timedOut=run.error?.code==='ETIMEDOUT';
  const passed=run.status===0&&!run.error;
  const logs=redactLog([run.stdout,run.stderr,run.error?.message].filter(Boolean).join('\n'));
  const report={
    format:'jarvis-qa-guardian-v1',suite,description:cfg.description,
    commit:String(env.GITHUB_SHA||'local').slice(0,64),
    checked_at:new Date().toISOString(),duration_seconds:Math.round((Date.now()-started)/1000),
    passed,exit_code:run.status,diagnosis:passed?null:diagnoseFailure(logs,{timedOut}),
    log_excerpt:passed?'':logs.slice(-1800),
    production_modified:false,external_actions_executed:false,requires_human_approval_for_deploy:true
  };
  return report;
}

function main(){
  const arg=process.argv.find(x=>x.startsWith('--suite='));
  const suite=arg?.split('=')[1];
  if(!Object.hasOwn(SUITES,suite||'')){
    console.error('Usage: node scripts/qa-guardian.mjs --suite=contracts|android');
    process.exitCode=2;return;
  }
  const report=runSuite(suite);
  mkdirSync('dist/qa',{recursive:true});
  const basename=resolve('dist/qa/'+suite);
  writeFileSync(basename+'.json',JSON.stringify(report,null,2)+'\n');
  const md=markdownReport(report);
  writeFileSync(basename+'.md',md+'\n');
  if(process.env.GITHUB_STEP_SUMMARY)writeFileSync(process.env.GITHUB_STEP_SUMMARY,md+'\n',{flag:'a'});
  console.log(md);
  if(!report.passed)process.exitCode=1;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href)main();
