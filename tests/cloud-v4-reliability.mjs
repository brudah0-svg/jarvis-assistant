import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const source=readFileSync('cloudflare/ui/command-v4.html','utf8');
const take=(start,end)=>{
 const i=source.indexOf(start),j=source.indexOf(end,i);
 assert(i>=0&&j>i,'Missing actual Cloud v4 source block: '+start);
 return source.slice(i,j);
};
const render=take('function render(){','function enableStaticPreview(){');
const load=take('async function loadAll(){',"$('activeProject').onchange=render;");
const chat=take('let chatRevision=0;',"$('voiceBtn').onclick=()=>{");

function element(){
 return {
  textContent:'',innerHTML:'',disabled:false,value:'',className:'',
  children:[],options:[],
  replaceChildren(){this.children=[];this.options=[]},
  append(node){this.children.push(node);this.options.push(node)},
  querySelector(){return this.button||(this.button={disabled:false})}
 };
}
const elements=new Map();
const $=id=>{if(!elements.has(id))elements.set(id,element());return elements.get(id)};
const notices=[];
const messages=[];
const document={createElement:()=>element()};
const ctx={
 $,document,Promise,STATIC_PREVIEW:false,
 state:{projects:[],tasks:[],memories:[],proposals:[],connected:false,loading:false,
        availability:{projects:false,tasks:false,memories:false,proposals:false}},
 esc:text=>String(text??''),
 notice:(msg,kind)=>notices.push({msg,kind}),
 say:(...args)=>messages.push(args),
 api:async path=>{
  if(path==='/api/memory')throw Error('Synthetic memory outage');
  if(path==='/api/projects')return {projects:[{id:'p-test',name:'Synthetic',status:'active',description:'Demo'}]};
  if(path==='/api/tasks')return {tasks:[{id:'t-test',project_id:'p-test',title:'Task',status:'pending'}]};
  if(path==='/api/proposals')return {proposals:[{id:'a-test',title:'Review',status:'pending',kind:'create_task'}]};
  throw Error('Unexpected path '+path);
 }
};
vm.createContext(ctx);
vm.runInContext(render+'\n'+load+'\nglobalThis.doLoad=loadAll;',ctx);
await ctx.doLoad();
assert.equal(ctx.state.availability.projects,true);
assert.equal(ctx.state.availability.tasks,true);
assert.equal(ctx.state.availability.memories,false);
assert.equal(ctx.state.availability.proposals,true);
assert.equal($('projectCount').textContent,1);
assert.equal($('taskCount').textContent,1);
assert.equal($('approvalCount').textContent,1);
assert.equal($('memoryInput').disabled,true,'Failed memory API must block writes');
assert.equal($('addProject').disabled,false,'Projects remain operational during memory outage');
assert.match($('memories').innerHTML,/temporaneamente non disponibile/);
assert.equal(ctx.state.connected,false,'Partial failures must not be called fully online');
assert.match(notices.at(-1).msg,/memories/);

ctx.api=async path=>{
 if(path==='/api/projects')return {projects:[{id:'p-test',name:'Synthetic',status:'active'}]};
 if(path==='/api/tasks')return {tasks:[]};
 if(path==='/api/memory')return {memories:[{id:'m-test',content:'Safe memory',category:'Test'}]};
 if(path==='/api/proposals')return {proposals:[]};
 throw Error(path);
};
await ctx.doLoad();
assert.equal(ctx.state.connected,true);
assert.equal(ctx.state.availability.memories,true);
assert.equal($('memoryInput').disabled,false);
assert.equal($('memoryForm').querySelector('button[type="submit"]').disabled,false);
assert.equal($('approvalCount').textContent,0);
assert.equal($('taskCount').textContent,0);

const steps=[];
ctx.post=async (url,data)=>{
 steps.push([url,data.role||null]);
 if(url==='/api/ai-chat')return {answer:'Test answer'};
 if(url==='/api/chat-history'&&data.role==='user'){
  await new Promise(resolve=>setTimeout(resolve,1));
  steps.push(['user-saved',null]);
 }
 return {status:'saved'};
};
vm.runInContext(chat,ctx);
$('chatInput').value='Synthetic conversation';
await $('chatForm').onsubmit({preventDefault(){}});
assert.equal(steps[0][0],'/api/ai-chat');
assert.equal(steps[1][1],'user');
assert.equal(steps[2][0],'user-saved','User history save must finish before assistant entry');
assert.equal(steps[3][1],'assistant');
assert.equal($('chatForm').querySelector('.send').disabled,false);
assert(messages.some(([msg])=>msg==='Test answer'));

const before=steps.length;
ctx.post=async(url,data)=>{
 if(url==='/api/ai-chat')return {answer:'Another answer'};
 if(url==='/api/chat-history'&&data.role==='user')throw Error('Synthetic save failure');
 steps.push([url,data.role]);
};
$('chatInput').value='Second test';
await $('chatForm').onsubmit({preventDefault(){}});
assert.equal(steps.length,before,'Assistant history write must not follow a failed user write');
assert(messages.some(([msg])=>msg.includes('storico non è stato salvato completamente')));
console.log('Cloud v4 reliability tests passed: partial outage isolation, honest counters, disabled writes, ordered chat history, save failures.');
