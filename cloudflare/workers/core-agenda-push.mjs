// Dedicated agenda tick; reuses existing D1 and explicitly opted-in Web Push.
export const agendaPushCron='*/5 * * * *';
const agendaPushPrefix='JARVIS_AGENDA_V1:';
function agendaPushWall(instant){
 const p=Object.fromEntries(new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/Rome',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(instant).map(x=>[x.type,x.value]));
 return p.year+'-'+p.month+'-'+p.day+'T'+p.hour+':'+p.minute;
}
export function agendaPushWindow(now){
 const ms=Math.floor(now.getTime()/60000)*60000;
 if(!Number.isFinite(ms))throw Error('Invalid clock');
 const slots=new Map();
 for(let n=0;n<=9;n++){
  const at=new Date(ms-n*60000),wall=agendaPushWall(at),guess=Date.parse(wall+':00Z');
  // A repeated autumn wall time is ambiguous; a skipped spring time cannot appear.
  const candidates=[1,2].filter(offset=>agendaPushWall(new Date(guess-offset*3600000))===wall);
  if(candidates.length===1)slots.set(wall,at.toISOString().slice(0,19).replace('T',' '));
 }
 return slots;
}
function agendaPushEndpoint(raw){
 try{const u=new URL(raw);return u.protocol==='https:'&&!u.username&&!u.password&&!u.port&&(['fcm.googleapis.com','updates.push.services.mozilla.com','web.push.apple.com'].includes(u.hostname)||u.hostname.endsWith('.push.apple.com'))?u:null}catch{return null}
}
async function agendaPushSend(endpoint,env){
 const b64=bytes=>{let s='';for(const x of new Uint8Array(bytes))s+=String.fromCharCode(x);return btoa(s).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/g,'')};
 const encode=o=>b64(new TextEncoder().encode(JSON.stringify(o)));
 const jwt=encode({typ:'JWT',alg:'ES256'})+'.'+encode({aud:endpoint.origin,exp:Math.floor(Date.now()/1000)+1800,sub:'https://jarvis-backend.jarvisproj3ct.workers.dev/'});
 const key=await crypto.subtle.importKey('jwk',JSON.parse(env.VAPID_PRIVATE_JWK),{name:'ECDSA',namedCurve:'P-256'},false,['sign']);
 const signature=b64(await crypto.subtle.sign({name:'ECDSA',hash:'SHA-256'},key,new TextEncoder().encode(jwt)));
 // No appointment text, secrets or personal payload in lock-screen notifications.
 return fetch(endpoint.href,{method:'POST',headers:{TTL:'60',Authorization:'vapid t='+jwt+'.'+signature+', k='+env.VAPID_PUBLIC_KEY},body:null,redirect:'manual',signal:AbortSignal.timeout(10000)});
}
export async function runAgendaPushTick(env,now=new Date(),send=agendaPushSend,uuid=()=>crypto.randomUUID()){
 const report={events:0,accepted:0,failed:0,attempted:0};
 if(!env?.DB||!env.VAPID_PRIVATE_JWK||!env.VAPID_PUBLIC_KEY)return report;
 const db=env.DB,slots=agendaPushWindow(now),keys=[...slots.keys()];
 if(!keys.length)return report;
 // Do not read appointments at all when there are no enabled automatic subscriptions.
 const opt=await db.prepare("SELECT 1 AS allowed FROM push_subscriptions s JOIN push_auto_optins o ON o.subscription_id=s.id WHERE s.enabled=1 AND o.enabled=1 LIMIT 1").first();
 if(!opt?.allowed)return report;
 const rows=await db.prepare("SELECT id,title,due_date,description FROM tasks WHERE project_id IS NULL AND id LIKE 'agenda-%' AND status!='done' AND description LIKE 'JARVIS_AGENDA_V1:%' AND (due_date||'T'||substr(description,?)) IN ("+keys.map(()=>'?').join(',')+") ORDER BY due_date,description,id LIMIT 20").bind(agendaPushPrefix.length+1,...keys).all();
 if(rows?.success!==true||!Array.isArray(rows.results))throw Error('Agenda read failed');
 for(const row of rows.results){
  if(report.attempted>=5)break;
  const due=slots.get(row.due_date+'T'+String(row.description).slice(agendaPushPrefix.length));
  if(!due||typeof row.id!=='string'||!/^agenda-[a-zA-Z0-9_-]{1,100}$/.test(row.id)||typeof row.title!=='string')continue;
  const eventKey='agenda-due:'+row.id+':'+due;
  // A task cancelled after the read must not create a new event.
  const inserted=await db.prepare("INSERT OR IGNORE INTO monitoring_events(id,event_key,kind,severity,project_id,task_id,title) SELECT ?,?,'agenda_due','medium',NULL,id,? FROM tasks WHERE id=? AND project_id IS NULL AND status!='done' AND due_date=? AND description=?").bind(uuid(),eventKey,('Promemoria agenda: '+row.title).slice(0,240),row.id,row.due_date,row.description).run();
  if(inserted?.success!==true)throw Error('Agenda event not verified');
  report.events+=Number(inserted.meta?.changes||0);
  const jobs=await db.prepare("SELECT e.id AS event_id,s.id AS subscription_id,s.endpoint FROM monitoring_events e JOIN tasks t ON t.id=e.task_id CROSS JOIN push_subscriptions s JOIN push_auto_optins o ON o.subscription_id=s.id WHERE e.event_key=? AND e.kind='agenda_due' AND e.status='open' AND t.status!='done' AND t.due_date=? AND t.description=? AND s.enabled=1 AND o.enabled=1 AND o.activated_at<? AND NOT EXISTS(SELECT 1 FROM push_auto_deliveries d WHERE d.event_id=e.id AND d.subscription_id=s.id) ORDER BY s.id LIMIT ?").bind(eventKey,row.due_date,row.description,due,5-report.attempted).all();
  if(jobs?.success!==true||!Array.isArray(jobs.results))throw Error('Push eligibility not verified');
  for(const job of jobs.results){
   if(report.attempted>=5)break;
   const endpoint=agendaPushEndpoint(job.endpoint);
   if(!endpoint)continue;
   // Reserve atomically with a fresh opt-in, unchanged appointment and active device.
   const reserve=await db.prepare("INSERT OR IGNORE INTO push_auto_deliveries(id,event_id,subscription_id,status,attempts) SELECT ?,e.id,s.id,'reserved',1 FROM monitoring_events e JOIN tasks t ON t.id=e.task_id CROSS JOIN push_subscriptions s JOIN push_auto_optins o ON o.subscription_id=s.id WHERE e.id=? AND e.event_key=? AND e.status='open' AND t.status!='done' AND t.due_date=? AND t.description=? AND s.id=? AND s.endpoint=? AND s.enabled=1 AND o.enabled=1 AND o.activated_at<?").bind(uuid(),job.event_id,eventKey,row.due_date,row.description,job.subscription_id,job.endpoint,due).run();
   if(reserve?.success!==true)throw Error('Push reservation failed');
   if(reserve.meta?.changes!==1)continue;
   report.attempted++;
   // At-most-once attempt: if acceptance is unknown do not resend automatically.
   try{
    const response=await send(endpoint,env);
    const accepted=response?.ok===true,status=Number.isInteger(response?.status)?response.status:null;
    await db.prepare("UPDATE push_auto_deliveries SET status=?,http_status=?,updated_at=CURRENT_TIMESTAMP WHERE event_id=? AND subscription_id=?").bind(accepted?'accepted':'failed',status,job.event_id,job.subscription_id).run();
    if(status===404||status===410)await db.prepare("UPDATE push_subscriptions SET enabled=0 WHERE id=?").bind(job.subscription_id).run();
    if(accepted)report.accepted++;else report.failed++;
   }catch{
    report.failed++;
    try{await db.prepare("UPDATE push_auto_deliveries SET status='failed',error_type='unknown_delivery',updated_at=CURRENT_TIMESTAMP WHERE event_id=? AND subscription_id=?").bind(job.event_id,job.subscription_id).run()}catch{}
   }
  }
 }
 return report;
}
