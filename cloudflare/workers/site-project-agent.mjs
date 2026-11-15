// JARVIS: local-only three-page site renderer and static quality gate. No external execution.
export const SITE_PAGE_NAMES=['index.html','servizi.html','contatti.html'];
export function siteText(s,max=1800){return String(s??'').slice(0,max).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
export function parseSiteProjectPlan(raw){
 if(typeof raw!=='string'||raw.length>15000)throw Error('AI response too large');
 const i=raw.indexOf('{'),j=raw.lastIndexOf('}');
 if(i<0||j<i)throw Error('JSON object absent');
 let d;try{d=JSON.parse(raw.slice(i,j+1))}catch{throw Error('Malformed JSON')}
 if(!d||typeof d!=='object'||Array.isArray(d))throw Error('Invalid project plan');
 for(const key of ['title','tagline','about','contactIntro','cta']){
  if(typeof d[key]!=='string'||d[key].trim().length<4||d[key].length>1800)throw Error('Missing or oversized '+key);
 }
 if(!Array.isArray(d.services)||d.services.length<2||d.services.length>5)throw Error('Services count invalid');
 for(const s of d.services)if(!s||typeof s.title!=='string'||s.title.trim().length<3||s.title.length>180||
  typeof s.description!=='string'||s.description.trim().length<8||s.description.length>1200)throw Error('Service invalid');
 return {title:d.title.trim(),tagline:d.tagline.trim(),about:d.about.trim(),
  contactIntro:d.contactIntro.trim(),cta:d.cta.trim(),services:d.services.map(x=>({title:x.title.trim(),description:x.description.trim()}))};
}
export function renderSiteProject(plan,opts={}){
 const esc=siteText,style=['notte','chiaro','energia'].includes(opts.style)?opts.style:'notte';
 const palettes={notte:['#071320','#112339','#edf7ff','#a8bfd0','#69d3ff'],chiaro:['#f4f8fc','#fff','#162b44','#52687b','#165cbe'],energia:['#15111c','#241c32','#faf5ff','#c7bbd5','#ffc06a']};
 const p=palettes[style];
 const title=esc(plan.title,120),tagline=esc(plan.tagline,400),about=esc(plan.about),intro=esc(plan.contactIntro),cta=esc(plan.cta,120);
 if(!title||!tagline||!about||!intro||!cta||!Array.isArray(plan.services)||plan.services.length<2||plan.services.length>5)throw Error('Missing plan fields');
 const css=':root{color-scheme:'+(style==='chiaro'?'light':'dark')+';--bg:'+p[0]+';--card:'+p[1]+';--ink:'+p[2]+';--muted:'+p[3]+';--accent:'+p[4]+'}'+
 '*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--ink);font:16px/1.65 system-ui,sans-serif}a{color:inherit}.shell{max-width:1000px;margin:auto;padding:0 24px}'+
 'header{display:flex;justify-content:space-between;align-items:center;gap:20px;padding:24px 0;border-bottom:1px solid #789abc44}.brand{font-size:20px;font-weight:800}'+
 '.nav{display:flex;gap:16px;flex-wrap:wrap}.nav a{text-decoration:none;font-size:14px}.nav a[aria-current]{color:var(--accent);font-weight:800}'+
 'main{min-height:60vh;padding:82px 0}h1{font-size:clamp(37px,7vw,66px);line-height:1.12;letter-spacing:-.04em;margin:16px 0}h2{font-size:clamp(22px,4vw,32px)}p{max-width:770px;color:var(--muted)}'+
 '.eyebrow{font-size:12px;letter-spacing:.18em;text-transform:uppercase;color:var(--accent);font-weight:800}'+
 '.cards{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:18px;margin:34px 0}.card{background:var(--card);border:1px solid #789abc44;padding:24px;border-radius:15px}.card h2{font-size:21px;margin:0 0 12px}'+
 '.button{display:inline-block;background:var(--accent);color:var(--bg);text-decoration:none;font-weight:800;border-radius:8px;padding:12px 20px;margin:18px 0}footer{border-top:1px solid #789abc44;padding:24px 0;color:var(--muted);font-size:12px}'+
 '@media(max-width:690px){header{flex-direction:column;align-items:flex-start}.cards{grid-template-columns:1fr}main{padding:56px 0}.shell{padding:0 18px}}';
 const labels=[['index.html','Home'],['servizi.html','Servizi'],['contatti.html','Contatti']];
 function build(name,body){
  const nav=labels.map(([f,label])=>'<a href="'+f+'"'+(f===name?' aria-current="page"':'')+'>'+label+'</a>').join('');
  const pageTitle=labels.find(x=>x[0]===name)[1];
  const html='<!doctype html><html lang="it"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">'+
  '<meta http-equiv="Content-Security-Policy" content="default-src &#39;none&#39;; style-src &#39;unsafe-inline&#39;; img-src data:; base-uri &#39;none&#39;; form-action &#39;none&#39;; object-src &#39;none&#39;">'+
  '<meta name="referrer" content="no-referrer"><meta name="description" content="'+tagline.slice(0,200)+'"><title>'+pageTitle+' | '+title+'</title><style>'+css+'</style></head>'+
  '<body><div class="shell"><header><span class="brand">'+title+'</span><nav class="nav" aria-label="Menu principale">'+nav+'</nav></header><main>'+
  body+'</main><footer>© '+new Date().getUTCFullYear()+' '+title+' — bozza da verificare prima della pubblicazione.</footer></div></body></html>';
  if(html.length>35000)throw Error('HTML page too large');
  return html;
 }
 const cards=plan.services.map(s=>'<article class="card"><h2>'+esc(s.title,180)+'</h2><p>'+esc(s.description,1200)+'</p></article>').join('');
 const email=typeof opts.contactEmail==='string'?opts.contactEmail.trim():'';
 const safeEmail=/^[a-zA-Z0-9._%+-]{1,64}@[a-zA-Z0-9.-]{1,180}\.[a-zA-Z]{2,24}$/.test(email)?email:'';
 const pages={
  'index.html':build('index.html','<p class="eyebrow">Benvenuti</p><h1>'+title+'</h1><p>'+tagline+'</p><a class="button" href="servizi.html">'+cta+'</a><h2>Chi siamo</h2><p>'+about+'</p>'),
  'servizi.html':build('servizi.html','<p class="eyebrow">Le nostre soluzioni</p><h1>Servizi</h1><div class="cards">'+cards+'</div><a class="button" href="contatti.html">'+cta+'</a>'),
  'contatti.html':build('contatti.html','<p class="eyebrow">Contattaci</p><h1>Parliamone</h1><p>'+intro+'</p>'+(safeEmail?'<a class="button" href="mailto:'+esc(safeEmail,250)+'">Scrivici via email</a>':'<p>Recapiti verificati da inserire prima della pubblicazione.</p>')+'<p><a href="index.html">Torna alla Home</a></p>')
 };
 pages['README.txt']='JARVIS sito multipagina: Home, Servizi, Contatti.\nApri index.html o carica tutti e tre i file su hosting statico dopo la revisione.\nNon esegue script e non pubblica automaticamente il sito.\n';
 return pages;
}
export function inspectSiteProject(files){
 const issues=[];if(!files||typeof files!=='object')return{passed:false,issues:['Files missing'],pages_checked:0};
 for(const name of SITE_PAGE_NAMES){
  const html=files[name];
  if(typeof html!=='string'||html.length<700||html.length>35000){issues.push(name+': invalid size');continue}
  if(!html.startsWith('<!doctype html>')||!html.endsWith('</html>'))issues.push(name+': malformed HTML');
  if(!html.includes('Content-Security-Policy'))issues.push(name+': missing CSP');
  if(/<(?:script|iframe|form|object|embed)\b/i.test(html)||/\son(?:click|load|error|mouseover)\s*=/i.test(html))issues.push(name+': executable markup');
  if(/https?:\/\//i.test(html))issues.push(name+': external network link');
  for(const link of SITE_PAGE_NAMES)if(!html.includes('href="'+link+'"'))issues.push(name+': missing '+link);
 }
 if(Object.keys(files).some(name=>!SITE_PAGE_NAMES.includes(name)&&name!=='README.txt'))issues.push('Unexpected filename');
 return{passed:issues.length===0,issues,pages_checked:SITE_PAGE_NAMES.length,checks:['html','csp','no-script','internal-links','size']};
}
export function siteProjectZip(files){
 const enc=new TextEncoder(),parts=[],central=[];let offset=0;
 const entries=Object.entries(files);
 if(entries.length<3||entries.length>4)throw Error('ZIP file count invalid');
 const put16=(x,o,v)=>new DataView(x.buffer).setUint16(o,v,true);
 const put32=(x,o,v)=>new DataView(x.buffer).setUint32(o,v>>>0,true);
 const cat=list=>{const out=new Uint8Array(list.reduce((n,x)=>n+x.length,0));let off=0;for(const x of list){out.set(x,off);off+=x.length}return out};
 function crc32(data){let c=0xffffffff;for(const byte of data){c^=byte;for(let n=0;n<8;n++)c=c&1?(c>>>1)^0xedb88320:c>>>1}return(c^0xffffffff)>>>0}
 for(const [name,value] of entries){
  if(!SITE_PAGE_NAMES.includes(name)&&name!=='README.txt')throw Error('Invalid ZIP filename');
  if(typeof value!=='string')throw Error('Invalid ZIP content');
  const fn=enc.encode(name),data=enc.encode(value);if(data.length>50000)throw Error('ZIP content too large');
  const crc=crc32(data),header=new Uint8Array(30+fn.length);
  put32(header,0,0x04034b50);put16(header,4,20);put16(header,6,0x0800);
  put32(header,14,crc);put32(header,18,data.length);put32(header,22,data.length);put16(header,26,fn.length);header.set(fn,30);
  const dir=new Uint8Array(46+fn.length);
  put32(dir,0,0x02014b50);put16(dir,4,20);put16(dir,6,20);put16(dir,8,0x0800);
  put32(dir,16,crc);put32(dir,20,data.length);put32(dir,24,data.length);put16(dir,28,fn.length);put32(dir,42,offset);dir.set(fn,46);
  parts.push(header,data);central.push(dir);offset+=header.length+data.length;
 }
 const directory=cat(central),end=new Uint8Array(22);
 put32(end,0,0x06054b50);put16(end,8,entries.length);put16(end,10,entries.length);put32(end,12,directory.length);put32(end,16,offset);
 const zip=cat([...parts,directory,end]);if(zip.length>200000)throw Error('ZIP too large');
 return zip;
}
