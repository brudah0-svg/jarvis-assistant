import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const source=readFileSync('cloudflare/ui/command-v4.html','utf8');
const take=(start,end)=>{
 const a=source.indexOf(start),b=source.indexOf(end,a);
 assert(a>=0&&b>a,'Missing live UI block: '+start);
 return source.slice(a,b);
};
const history=take('async function loadChatHistory(){',"$('activeProject').onchange=render;");
const chat=take('let chatRevision=0;',"$('voiceBtn').onclick=()=>{");
const elements=new Map();
const $=id=>{
 if(!elements.has(id))elements.set(id,{
  value:'',disabled:false,children:[],
  replaceChildren(){this.children=[]},
  append(node){this.children.push(node)},
  querySelector(){return {disabled:false}}
 });
 return elements.get(id);
};
const seen=[];
const ctx={
 $,Promise,STATIC_PREVIEW:false,
 say:(content,role='jarvis')=>{$('conversation').append({textContent:content,role});seen.push([role,content])},
 api:async path=>{
  assert.equal(path,'/api/chat-history');
  return {messages:[
   {role:'user',content:'Messaggio salvato'},
   {role:'assistant',content:'Risposta salvata'},
   {role:'system',content:'Non esporre record non ammessi'}
  ]};
 },
 post:async(path,data)=>path==='/api/ai-chat'?{answer:'Nuova risposta'}:{status:'saved'}
};
vm.createContext(ctx);
vm.runInContext(history+'\n'+chat+'\nglobalThis.loadHistory=loadChatHistory;',ctx);
await ctx.loadHistory();
assert.deepEqual($('conversation').children.map(x=>x.textContent),['Messaggio salvato','Risposta salvata']);
assert.deepEqual($('conversation').children.map(x=>x.role),['user','jarvis']);
ctx.api=async()=>({messages:[]});
await ctx.loadHistory();
assert.equal($('conversation').children.length,2,'Empty backend history must not erase current conversation');

// A new message during the fetch must win: no asynchronous history overwrite.
let resolveHistory;
ctx.api=()=>new Promise(resolve=>{resolveHistory=resolve});
const pending=ctx.loadHistory();
$('chatInput').value='Nuovo messaggio';
await $('chatForm').onsubmit({preventDefault(){}});
resolveHistory({messages:[{role:'assistant',content:'Storico vecchio'}]});
await pending;
assert.equal($('conversation').children.at(-1).textContent,'Nuova risposta');
assert(!seen.some(([,content])=>content==='Storico vecchio'));
assert.equal($('conversation').children.length,4);

// An invalid response reports the problem rather than silently replacing the page.
ctx.api=async()=>({messages:'invalid'});
await ctx.loadHistory();
assert.match($('conversation').children.at(-1).textContent,/Cronologia cloud non disponibile/);
ctx.STATIC_PREVIEW=true;
let calls=0;
ctx.api=async()=>{calls++};
await ctx.loadHistory();
assert.equal(calls,0,'GitHub Pages must never request protected chat history');
console.log('Cloud v4 chat history checks passed: authenticated read, safe rendering, stale request race, malformed payload, static preview isolation.');
