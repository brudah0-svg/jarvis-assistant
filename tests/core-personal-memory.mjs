import {readFileSync} from 'node:fs';
async function runMemoryRegression(html){
 const p=html.slice(html.indexOf('function parseJarvisCoreCommand('),html.indexOf('function showSitePreviewInChat('));
 const start=html.indexOf('const personalMemoryCategories='),end=html.indexOf('async function runJarvisCoreCommand(');
 if(start<0||end<start)throw Error('Missing personal memory implementation');
 const make=new Function('api','post','loadAll','let pendingVoiceAction=null,pendingWebsiteBrief=null;\n'+p+'\n'+html.slice(start,end)+'\nreturn {parse:parseJarvisCoreCommand,run:runPersonalMemoryCommand};');
 let rows=[{id:'1',content:'Mi piace il caffè',category:'Preferenze'},{id:'2',content:'internal secret test fixture',category:'JARVIS_AUTOIMPROVE_TASK'}],writes=0,reads=0,failRead=false,badAck=false,failRefresh=false;
 const api=async path=>{if(path!=='/api/memory')throw Error('unexpected read');reads++;if(failRead)throw Error('offline');return {status:'ok',memories:rows.map(r=>({...r}))}};
 const post=async(path,data)=>{if(path!=='/api/memory'||data.category!=='Altro')throw Error('unexpected write');writes++;const memory={id:String(rows.length+1),...data};rows.push(memory);return {status:'created',memory:badAck?{...memory,content:'wrong'}:memory}};
 const checks=[];function check(name,v){if(!v)throw Error(name);checks.push(name)}
 const first=make(api,post,async()=>{if(failRefresh)throw Error('offline refresh')});
 const {parse,run}=first;
 check('explicit voice save recognized',parse('Jarvis, ricordati che preferisco il tè')?.kind==='memory-save');
 check('question does not authorize save',!parse('Ricorda che preferisco il tè?'));
 check('reminder routed to agenda, never memory',parse('Ricordami domani di chiamare Marco')?.kind==='agenda-save');
 check('ordinary statement does not save',!parse('Preferisco il tè'));
 check('explicit memory read recognized',parse('Cosa ricordi sul tè?')?.query==='tè'&&parse('Cosa ricordi su tè?')?.kind==='memory-recall');
 check('initial save confirmed by server', (await run(parse('Ricorda che preferisco il tè'))).includes('Memoria salvata')&&writes===1);
 const reopened=make(api,post,async()=>{});
 check('new session retrieves persisted record',(await reopened.run(reopened.parse('Cosa ricordi su te?'))).includes('preferisco il tè')&&writes===1);
 check('duplicate normalized by accent and case',(await run(parse('Ricorda che PREFERISCO IL TE'))).includes('duplicato')&&writes===1);
 check('internal queue excluded from personal reads',!(await run(parse('Cosa ricordi?'))).includes('internal secret'));
 check('no match is not fabricated',(await run(parse('Cosa ricordi su pianoforte?'))).includes('Non ho trovato'));
 const before=reads;check('oversized input rejected before network',(await run({kind:'memory-save',content:'a'.repeat(501)})).includes('500')&&reads===before);
 failRead=true;let rejected=false;try{await run(parse('Ricorda che bevo acqua'))}catch{rejected=true}check('unavailable read blocks write',rejected&&writes===1);failRead=false;
 badAck=true;rejected=false;try{await run(parse('Ricorda che bevo acqua'))}catch{rejected=true}check('mismatched acknowledgement not reported as saved',rejected&&writes===2);badAck=false;
 failRefresh=true;check('confirmed save survives refresh failure',(await run(parse('Ricorda che leggo libri'))).includes('Memoria salvata')&&writes===3);
 rows=Array.from({length:200},(_,i)=>({id:String(i),category:'Altro',content:'ricordo '+i}));
 check('limited history coverage disclosed',(await run(parse('Cosa ricordi?'))).includes('ultime 200'));
 check('read result limited with count',(await run(parse('Cosa ricordi?'))).includes('primi 5 di 200'));
 check('dispatcher connects memory handler',html.includes("if(command.kind==='memory-save'||command.kind==='memory-recall')return runPersonalMemoryCommand(command)"));
 return checks;
}
const checks=await runMemoryRegression(readFileSync('cloudflare/ui/command-v4-unified.html','utf8'));
console.log('PASS '+checks.length+' memory checks:',checks.join('; '));
