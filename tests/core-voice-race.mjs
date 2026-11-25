import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../cloudflare/ui/command-v4-unified.html',import.meta.url),'utf8');
const extract=(a,b)=>{const i=source.indexOf(a),j=source.indexOf(b,i);assert(i>=0&&j>i);return source.slice(i,j)};
const core=extract('function cancelDialogueRecognition(){','function stopDialogue(')+extract('function listenDialogue(){','function jarvisSpeak(');
const begin=extract("chatRevision++;chatBusy=true;","$('chatInput').value='';");
const run=new Function('assert',core+`
let dialogueActive=true,dialogueListening=false,dialoguePending=false,dialogueSpeaking=false,dialogueRecognition=null,dialogueEpoch=1,dialogueErrors=0,chatBusy=false,chatRevision=0;
let submissions=0,resumes=0,stops=0,instances=[];const document={hidden:false};const input={value:'typed'};
const $=id=>id==='chatInput'?input:{requestSubmit(){submissions++}};
const dialogueStatus=()=>{},resumeDialogue=()=>{resumes++},stopDialogue=()=>{stops++};
const window={SpeechRecognition:class{constructor(){instances.push(this)}start(){}abort(){}}};
listenDialogue();const r=instances[0],lateResult=r.onresult,lateError=r.onerror,lateEnd=r.onend;
`+begin+`
assert(!dialogueListening&&dialogueRecognition===null,'typed submit must stop microphone');
lateResult({results:[[{transcript:'stale voice'}]]});
assert(input.value==='typed'&&submissions===0,'late ASR must not overwrite typed message');
chatBusy=false;dialoguePending=false;listenDialogue();const current=instances[1];
lateEnd();lateError({error:'not-allowed'});lateResult({results:[[{transcript:'late'}]]});
assert(dialogueRecognition===current&&dialogueListening&&stops===0&&resumes===0&&submissions===0,'stale callbacks must not affect newer recognition');
current.onresult({results:[[{transcript:'comando valido'}]]});
assert(input.value==='comando valido'&&submissions===1&&dialoguePending&&!dialogueListening,'valid speech must still submit');
`);
run(assert);
console.log('PASS: typed/voice isolation and stale recognition callbacks (simulated browser events)');
