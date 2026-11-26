import {readFileSync} from 'node:fs';
function runVoiceRegression(html){
 const section=html.slice(html.indexOf('let voiceOutputEnabled=false;'),html.indexOf('async function api('));
 const handler=html.slice(html.indexOf("$('voiceBtn').onclick=()=>{"),html.indexOf('// User-initiated import'));
 if(!section||!handler)throw Error('Missing voice source');
 // new Function closes over no variables: pass browser mocks as explicit parameters.
 const factory=new Function('$','window','document','SpeechSynthesisUtterance','setTimeout','clearTimeout','chatBusy',section+'\n'+handler+'\nreturn {speak:jarvisSpeak,setBusy:v=>chatBusy=v,cancel:stopDialogue};');
 const nodes=new Map(),recognizers=[],utterances=[],listeners={};let submissions=0;
 const $=id=>{if(!nodes.has(id))nodes.set(id,{value:'',setAttribute(){},append(){},requestSubmit(){submissions++}});return nodes.get(id)};
 class SR{constructor(){recognizers.push(this)}start(){this.started=true}abort(){this.aborted=true}}
 const speech={speaking:false,pending:false,cancel(){this.speaking=false;this.pending=false},speak(u){utterances.push(u);this.speaking=true}};
 const win={SpeechRecognition:SR,speechSynthesis:speech};
 const doc={hidden:false,createElement:()=>({}),addEventListener:(name,fn)=>{listeners[name]=fn}};
 const control=factory($,win,doc,class{constructor(t){this.text=t}},()=>0,()=>{},false);
 const checks=[];function check(name,v){if(!v)throw Error(name);checks.push(name)}
 const click=()=>$('voiceBtn').onclick(),result=t=>({results:[[{transcript:t}]]});
 click();const first=recognizers[0],late=first.onresult;
 click();check('double tap starts only one recognizer',recognizers.length===1);
 first.onresult(result('Ciao Jarvis'));check('abort before submit',first.aborted&&submissions===1&&$('chatInput').value==='Ciao Jarvis');
 late(result('voce tardiva'));check('stale callback rejected',submissions===1);
 control.setBusy(true);click();check('busy chat blocks microphone',recognizers.length===1);control.setBusy(false);
 click();const second=recognizers[1],secondLate=second.onresult;control.speak('Risposta di Jarvis');
 check('speech aborts single recognizer',second.aborted&&speech.speaking);
 secondLate(result('Risposta di Jarvis'));click();check('speech blocks new mic and echo callback',recognizers.length===2&&submissions===1);
 speech.speaking=false;speech.pending=true;click();check('queued speech blocks mic',recognizers.length===2);
 speech.pending=false;click();const third=recognizers[2];doc.hidden=true;listeners.visibilitychange();check('hidden tab aborts mic',third.aborted);
 click();check('hidden page blocks mic',recognizers.length===3);
 doc.hidden=false;click();const fourth=recognizers[3];fourth.onend();click();check('recognizer can restart after end',recognizers.length===5);
 return checks;
}
const checks=runVoiceRegression(readFileSync('cloudflare/ui/command-v4-unified.html','utf8'));
console.log('PASS '+checks.length+' voice isolation regression checks:', checks.join('; '));
