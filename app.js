const $=id=>document.getElementById(id);
const load=(key,fallback)=>{try{return JSON.parse(localStorage.getItem(key))??fallback}catch{return fallback}};
let projects=load('jarvis_projects',[]);
let tasks=load('jarvis_tasks',[]);
let approvals=load('jarvis_approvals',[]);
let memories=load('jarvis_memories',[]);
let autoMemory=load('jarvis_auto_memory',true);
function save(){localStorage.setItem('jarvis_projects',JSON.stringify(projects));localStorage.setItem('jarvis_tasks',JSON.stringify(tasks));localStorage.setItem('jarvis_approvals',JSON.stringify(approvals));localStorage.setItem('jarvis_memories',JSON.stringify(memories));render()}
function esc(s){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function render(){
 $('autoMemory').checked=autoMemory;
 $('projectCount').textContent=projects.length;
 $('taskCount').textContent=tasks.filter(t=>!t.done).length;
 $('approvalCount').textContent=approvals.length;
 const q=($('memorySearch')?.value||'').toLowerCase();
 const shown=memories.filter(m=>(m.text+' '+m.category).toLowerCase().includes(q));
 $('memories').className='stack'+(shown.length?'':' empty');
 $('memories').innerHTML=shown.length?shown.map(m=>`<div class="item"><div><strong>${esc(m.text)}</strong><div class="memory-meta">${esc(m.category)} · ${new Date(m.created).toLocaleDateString('it-IT')}</div></div><div class="item-actions"><button class="memory-delete" data-memory-delete="${memories.indexOf(m)}">Elimina</button></div></div>`).join(''):'Nessun ricordo trovato.';
 $('projects').className='stack'+(projects.length?'':' empty');
 $('projects').innerHTML=projects.length?projects.map((p,i)=>`<div class="item"><div><strong>${esc(p.name)}</strong><small>${esc(p.note||'Progetto attivo')}</small></div><div class="item-actions"><button data-project="${i}">Elimina</button></div></div>`).join(''):'Nessun progetto. Creane uno per iniziare.';
 $('tasks').className='stack'+(tasks.length?'':' empty');
 $('tasks').innerHTML=tasks.length?tasks.map((t,i)=>`<div class="item"><div><strong>${esc(t.title)}</strong><small>${t.done?'Completata':'Da completare'}</small></div><div class="item-actions"><button data-task="${i}">${t.done?'Riapri':'Completa'}</button><button data-task-delete="${i}">×</button></div></div>`).join(''):'Nessuna attività in programma.';
 $('approvals').className='stack'+(approvals.length?'':' empty');
 $('approvals').innerHTML=approvals.length?approvals.map((a,i)=>`<div class="item"><div><strong>${esc(a.title)}</strong><small>${esc(a.detail||'Richiede revisione umana')}</small></div><div class="item-actions"><button data-approve="${i}">Approva</button><button data-reject="${i}">Rifiuta</button></div></div>`).join(''):'Nessuna operazione in attesa.';
}
function say(msg,who='jarvis'){const el=document.createElement('div');el.className='bubble '+who;el.textContent=msg;$('conversation').append(el);$('conversation').scrollTop=$('conversation').scrollHeight}
$('memoryForm').onsubmit=e=>{e.preventDefault();const text=$('memoryInput').value.trim();if(!text)return;memories.unshift({text,category:$('memoryCategory').value,created:new Date().toISOString()});$('memoryInput').value='';save();say('Ricordo salvato nella memoria locale.');};
$('memorySearch').oninput=render;
$('autoMemory').onchange=e=>{autoMemory=e.target.checked;localStorage.setItem('jarvis_auto_memory',JSON.stringify(autoMemory));say(autoMemory?'Memoria automatica attivata.':'Memoria automatica disattivata.');};
$('exportMemory').onclick=()=>{const data={format:'jarvis-memory-v1',exportedAt:new Date().toISOString(),memories};const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='jarvis-memory-backup.json';a.click();URL.revokeObjectURL(a.href);say('Backup della memoria esportato.');};
$('importMemory').onclick=()=>$('memoryFile').click();
$('memoryFile').onchange=async e=>{const file=e.target.files[0];if(!file)return;try{const data=JSON.parse(await file.text());if(data.format!=='jarvis-memory-v1'||!Array.isArray(data.memories))throw new Error('Formato non valido');if(confirm('Importare '+data.memories.length+' ricordi? I ricordi attuali verranno mantenuti e i duplicati evitati.')){const keys=new Set(memories.map(m=>m.text+'|'+m.category));for(const m of data.memories){if(m&&typeof m.text==='string'&&!keys.has(m.text+'|'+m.category)){memories.push({text:m.text.slice(0,500),category:String(m.category||'Altro'),created:m.created||new Date().toISOString()});}}save();say('Backup importato.');}}catch(err){alert('File non valido o danneggiato.');}e.target.value='';};
$('addProject').onclick=()=>{const name=prompt('Nome del progetto:');if(name?.trim()){projects.push({name:name.trim(),note:'Creato '+new Date().toLocaleDateString('it-IT')});save();say('Progetto registrato: '+name.trim())}};
$('addTask').onclick=()=>{const title=prompt('Descrivi l’attività:');if(title?.trim()){tasks.push({title:title.trim(),done:false});save();say('Attività aggiunta: '+title.trim())}};
document.addEventListener('click',e=>{
 const d=e.target.dataset;
 if(d.memoryDelete!==undefined){if(confirm('Eliminare questo ricordo?')){memories.splice(+d.memoryDelete,1);save()}}
 if(d.project!==undefined){projects.splice(+d.project,1);save()}
 if(d.task!==undefined){tasks[+d.task].done=!tasks[+d.task].done;save()}
 if(d.taskDelete!==undefined){tasks.splice(+d.taskDelete,1);save()}
 if(d.approve!==undefined){const a=approvals.splice(+d.approve,1)[0];save();say('Approvazione registrata per: '+a.title+'. In questa versione è solo una registrazione, non viene eseguita alcuna azione esterna.')}
 if(d.reject!==undefined){const a=approvals.splice(+d.reject,1)[0];save();say('Richiesta rifiutata: '+a.title)}
});
$('chatForm').onsubmit=e=>{e.preventDefault();const value=$('chatInput').value.trim();if(!value)return;say(value,'user');$('chatInput').value='';const lower=value.toLowerCase();
 const autoPatterns=[
   {re:/^(?:ricorda|memorizza|tieni a mente)[: ,]+(.+)/i,cat:'Altro'},
   {re:/^(?:il mio obiettivo è|il mio obiettivo e|il mio obiettivo:|voglio che jarvis ricordi)[: ,]+(.+)/i,cat:'Obiettivi'},
   {re:/^(?:preferisco|da ora in poi preferisco|mi piace)[: ,]+(.+)/i,cat:'Preferenze'},
   {re:/^(?:ho deciso che|decisione:|abbiamo deciso che)[: ,]+(.+)/i,cat:'Decisioni'}
 ];
 if(autoMemory){
   const match=autoPatterns.map(p=>({m:value.match(p.re),cat:p.cat})).find(x=>x.m);
   if(match && match.m[1].trim()){
     const text=match.m[1].trim();
     const exists=memories.some(m=>m.text.toLowerCase()===text.toLowerCase());
     if(!exists){memories.unshift({text,category:match.cat,created:new Date().toISOString(),source:'chat-auto'});save();say('Ho riconosciuto un’informazione da conservare e l’ho salvata nella memoria locale.');}
     else say('Questa informazione è già presente nella memoria.');
     return;
   }
 }
 if(lower.startsWith('aggiungi progetto ')){const name=value.slice(18).trim();if(name){projects.push({name,note:'Aggiunto dalla chat'});save();say('Fatto: ho registrato il progetto '+name+'.') }else say('Scrivi: aggiungi progetto seguito dal nome.')}
 else if(lower.startsWith('aggiungi attività ')||lower.startsWith('aggiungi attivita ')){const title=value.slice(value.indexOf(' ')+1).trim();tasks.push({title,done:false});save();say('Attività registrata.')}
 else if(lower.startsWith('proponi approvazione ')){const title=value.slice(21).trim();approvals.push({title,detail:'Proposta inserita manualmente; verifica prima di approvare.'});save();say('Ho inserito la proposta nella coda di approvazione. Non verrà eseguita alcuna azione esterna.')}
 else if(lower.startsWith('ricorda ')){const text=value.slice(8).trim();if(text){memories.unshift({text,category:'Altro',created:new Date().toISOString()});save();say('Ho salvato questo ricordo nella memoria locale.')}}
 else if(lower.includes('cosa ricordi')||lower.includes('mostra memoria'))say(memories.length?`Ho ${memories.length} ricordi salvati. Li trovi nell’Archivio di JARVIS.`:'La memoria è ancora vuota.')
 else if(lower.includes('riepilogo'))say(`Hai ${projects.length} progetti, ${tasks.filter(t=>!t.done).length} attività aperte e ${approvals.length} proposte in approvazione.`);
 else say('Per ora posso registrare elementi. Prova: “aggiungi progetto VoltaNido AI”, “aggiungi attività prepara portfolio” oppure “riepilogo”. Il collegamento a un modello AI arriverà in una fase successiva.');
};
$('voiceBtn').onclick=()=>{const SR=window.SpeechRecognition||window.webkitSpeechRecognition;if(!SR){say('La dettatura vocale non è supportata da questo browser. Puoi usare la tastiera.');return}const r=new SR();r.lang='it-IT';r.onresult=e=>{$('chatInput').value=e.results[0][0].transcript};r.onerror=()=>say('Non sono riuscito a ricevere la dettatura.');r.start()};
function tick(){$('clock').textContent=new Date().toLocaleTimeString('it-IT',{hour:'2-digit',minute:'2-digit'})}tick();setInterval(tick,30000);render();
