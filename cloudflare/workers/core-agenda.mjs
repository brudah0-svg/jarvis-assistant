// Personal agenda stored in existing tasks; no AI, migrations, external calendars or push scheduling.
const agendaPrefix='JARVIS_AGENDA_V1:';
const agendaZone='Europe/Rome';
const agendaWeek=['domenica','lunedì','martedì','mercoledì','giovedì','venerdì','sabato'];
const agendaMonths=['gennaio','febbraio','marzo','aprile','maggio','giugno','luglio','agosto','settembre','ottobre','novembre','dicembre'];
const agendaFold=s=>s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
function agendaLocal(instant){
 const p=Object.fromEntries(new Intl.DateTimeFormat('en-GB',{timeZone:agendaZone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(instant).map(x=>[x.type,x.value]));
 return {date:p.year+'-'+p.month+'-'+p.day,time:p.hour+':'+p.minute};
}
function agendaDate(y,m,d){
 if(!Number.isInteger(y)||y<2000||y>2100||!Number.isInteger(m)||!Number.isInteger(d))return null;
 const x=new Date(Date.UTC(y,m-1,d));
 return x.getUTCFullYear()===y&&x.getUTCMonth()===m-1&&x.getUTCDate()===d?x.toISOString().slice(0,10):null;
}
function agendaAddDays(date,n){const x=new Date(date+'T00:00:00Z');x.setUTCDate(x.getUTCDate()+n);return x.toISOString().slice(0,10)}
function agendaResolveDate(raw,today){
 const s=agendaFold(raw.trim()),[y,m,d]=today.split('-').map(Number);
 if(s==='oggi')return today;
 if(s==='domani')return agendaAddDays(today,1);
 if(s==='dopodomani')return agendaAddDays(today,2);
 let match=s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
 if(match)return agendaDate(+match[1],+match[2],+match[3]);
 match=s.match(/^(\d{1,2})\/(\d{1,2})(?:\/(\d{4}))?$/);
 if(match){const z=agendaDate(match[3]?+match[3]:y,+match[2],+match[1]);return !match[3]&&z&&z<today?agendaDate(y+1,+match[2],+match[1]):z}
 const words=s.split(/\s+/),weekday=agendaWeek.map(agendaFold).indexOf(words[0]);
 if(weekday>=0){
  const day=words[1]?Number(words[1]):null;
  if(words.length>1&&!Number.isInteger(day))return null;
  if(day===null){for(let n=1;n<=7;n++){const z=agendaAddDays(today,n);if(new Date(z+'T00:00:00Z').getUTCDay()===weekday)return z}}
  else{
   if(day<1||day>31)return null;
   if(words[2]){const month=agendaMonths.indexOf(words[2])+1,year=words[3]?Number(words[3]):y;let z=agendaDate(year,month,day);if(!words[3]&&z&&z<today)z=agendaDate(year+1,month,day);return z&&new Date(z+'T00:00:00Z').getUTCDay()===weekday?z:null}
   // With weekday + day but no month, accept only a matching upcoming date in the next 31 days.
   for(let n=0;n<=31;n++){const z=agendaAddDays(today,n);const x=new Date(z+'T00:00:00Z');if(x.getUTCDate()===day&&x.getUTCDay()===weekday)return z}
   return null;
  }
 }
 match=s.match(/^(\d{1,2}) ([a-z]+)(?: (\d{4}))?$/);
 if(match){const month=agendaMonths.indexOf(match[2])+1;let z=agendaDate(match[3]?+match[3]:y,month,+match[1]);if(!match[3]&&z&&z<today)z=agendaDate(y+1,month,+match[1]);return z}
 return null;
}
function agendaValidInstant(date,time){
 // Italy uses UTC+1 or UTC+2; reject a skipped or repeated wall-clock time.
 const guessed=Date.parse(date+'T'+time+':00Z');
 if(!Number.isFinite(guessed))return false;
 return [1,2].filter(offset=>{const p=agendaLocal(new Date(guessed-offset*3600000));return p.date===date&&p.time===time}).length===1;
}
export function parseAgendaRequest(raw,now=new Date()){
 if(typeof raw!=='string'||raw.length>500||/[\x00-\x1f?？]/.test(raw))return null;
 let s=raw.trim().replace(/[.!]+$/,'');
 const explicit=/^(?:(?:aggiungi|registra|segna|metti|inserisci|crea)\s+(?:in agenda\s+)?(?:(?:un|una|il|la)\s+)?(?:appuntamento|promemoria|impegno)|ricordami(?:\s+di)?|appuntamento|promemoria)\b\s*/i;
 const hasExplicit=explicit.test(s);
 s=s.replace(explicit,'').trim();
 // A date-first utterance needs an explicit appointment marker.
 if(!hasExplicit&&!/\b(?:appuntamento|promemoria)\b/i.test(s))return null;
 const dateRE=/(?:^|\s)(oggi|dopodomani|domani|\d{4}-\d{2}-\d{2}|\d{1,2}\/\d{1,2}(?:\/\d{4})?|(?:luned[ìi]|marted[ìi]|mercoled[ìi]|gioved[ìi]|venerd[ìi]|sabato|domenica)(?:\s+\d{1,2}(?:\s+(?:gennaio|febbraio|marzo|aprile|maggio|giugno|luglio|agosto|settembre|ottobre|novembre|dicembre)(?:\s+\d{4})?)?)?|\d{1,2}\s+(?:gennaio|febbraio|marzo|aprile|maggio|giugno|luglio|agosto|settembre|ottobre|novembre|dicembre)(?:\s+\d{4})?)(?=\s|[,;.!]|$)/gi;
 const timeRE=/(?:^|\s)(?:alle(?:\s+ore)?|ore|h)\s*(\d{1,2})(?:[:.](\d{2}))?(?=\s|[,;!]|$)/gi;
 const dates=[...s.matchAll(dateRE)],times=[...s.matchAll(timeRE)];
 if(dates.length!==1||times.length!==1)return null;
 const current=agendaLocal(now),date=agendaResolveDate(dates[0][1],current.date),h=Number(times[0][1]),m=Number(times[0][2]||0);
 if(!date||h>23||m>59)return null;
 const time=String(h).padStart(2,'0')+':'+String(m).padStart(2,'0');
 if(date<current.date||(date===current.date&&time<=current.time)||!agendaValidInstant(date,time))return null;
 const title=s.replace(dateRE,' ').replace(timeRE,' ').replace(/^\s*(?:appuntamento|promemoria)\b\s*/i,'').replace(/^\s*(?:di|per)\s+/i,'').replace(/^[\s,;:]+|[\s,;:.!]+$/g,'').replace(/\s+/g,' ').trim();
 if(title.length<3||title.length>160||/^(?:annulla|non|aspetta|cancella|sposta|modifica|quanto|come|se)\b/i.test(title))return null;
 return {title,date,time,timezone:agendaZone};
}
export async function coreAgendaRoute(request,env,now=new Date(),uuid=()=>crypto.randomUUID()){
 const fail=(status,error)=>({status,data:{error,external_actions_executed:false}});
 if(!env?.DB)return fail(503,'Agenda non disponibile');
 try{
  const raw=await request.text();if(raw.length>2500)return fail(413,'Richiesta troppo lunga');
  let body;try{body=JSON.parse(raw)}catch{return fail(400,'Richiesta non valida')}
  if(!body||typeof body!=='object'||Array.isArray(body))return fail(400,'Richiesta non valida');
  if(body.action==='list'){
   if(Object.keys(body).some(k=>!['action','period'].includes(k))||!['today','tomorrow','week'].includes(body.period))return fail(400,'Periodo non valido');
   const today=agendaLocal(now).date,from=agendaAddDays(today,body.period==='tomorrow'?1:0),until=agendaAddDays(from,body.period==='week'?7:1);
   const r=await env.DB.prepare("SELECT id,title,due_date,description FROM tasks WHERE project_id IS NULL AND id LIKE 'agenda-%' AND description LIKE 'JARVIS_AGENDA_V1:%' AND status!='done' AND due_date>=? AND due_date<? ORDER BY due_date,description,id LIMIT 31").bind(from,until).all();
   if(r?.success!==true||!Array.isArray(r.results))return fail(503,'Lettura agenda non verificata');
   const entries=r.results.slice(0,30).map(x=>({id:x.id,title:x.title,date:x.due_date,time:String(x.description).slice(agendaPrefix.length),timezone:agendaZone}));
   if(entries.some(x=>typeof x.id!=='string'||typeof x.title!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(x.date)||!/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(x.time)))return fail(503,'Dati agenda non verificabili');
   return {status:200,data:{status:'listed',from,until,entries,truncated:r.results.length>30,external_actions_executed:false,push_scheduled:false}};
  }
  if(body.action!=='save'||Object.keys(body).some(k=>!['action','message','confirmed'].includes(k))||body.confirmed!==true)return fail(400,'Conferma esplicita richiesta');
  const entry=parseAgendaRequest(body.message,now);
  if(!entry)return fail(422,'Specifica titolo, una data futura e un orario preciso. Nessuna voce salvata.');
  const description=agendaPrefix+entry.time,id='agenda-'+uuid();
  // Atomic duplicate guard and readback. No project mutation or external action.
  const where="project_id IS NULL AND id LIKE 'agenda-%' AND title=? AND due_date=? AND description=?";
  const results=await env.DB.batch([
   env.DB.prepare("INSERT INTO tasks(id,project_id,title,description,status,due_date) SELECT ?,NULL,?,?,'pending',? WHERE NOT EXISTS(SELECT 1 FROM tasks WHERE "+where+")").bind(id,entry.title,description,entry.date,entry.title,entry.date,description),
   env.DB.prepare("SELECT id,title,due_date,description,status FROM tasks WHERE "+where+" LIMIT 2").bind(entry.title,entry.date,description)
  ]);
  const rows=results?.[1]?.results,changes=results?.[0]?.meta?.changes;
  if(!Array.isArray(results)||results.length!==2||results.some(x=>x?.success!==true)||![0,1].includes(changes)||!Array.isArray(rows)||rows.length!==1)return fail(503,'Salvataggio agenda non verificato');
  const stored=rows[0];
  if(typeof stored.id!=='string'||!stored.id.startsWith('agenda-')||stored.title!==entry.title||stored.due_date!==entry.date||stored.description!==description||stored.status!=='pending')return fail(409,'Voce già chiusa o non verificabile; nessuna nuova voce confermata');
  return {status:200,data:{status:'saved',created:changes===1,entry:{id:stored.id,...entry},external_actions_executed:false,push_scheduled:false}};
 }catch{return fail(503,'Agenda non verificabile; non considero la richiesta completata')}
}
