// Pure, dependency-free static site builder. All AI-originated content is escaped.
export function escapeSiteText(value,max=520){
 return String(value??'').slice(0,max).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}
export function parseSiteContent(raw){
 if(typeof raw!=='string'||raw.length>16000)throw Error('Invalid AI output');
 const str=raw.trim().replace(/^```(?:json)?\s*/i,'').replace(/\s*```$/,'');
 const start=str.indexOf('{'),end=str.lastIndexOf('}');
 if(start<0||end<start)throw Error('AI response missing JSON');
 let parsed;try{parsed=JSON.parse(str.slice(start,end+1))}catch{throw Error('Invalid AI JSON')}
 if(!parsed||typeof parsed!=='object'||Array.isArray(parsed))throw Error('Invalid content object');
 if(['title','subtitle','about','callToAction'].some(k=>typeof parsed[k]!=='string'||!parsed[k].trim()))throw Error('Incomplete AI content');
 if(!Array.isArray(parsed.services)||parsed.services.length<2||parsed.services.length>5||parsed.services.some(s=>!s||typeof s.title!=='string'||!s.title.trim()||typeof s.description!=='string'||!s.description.trim()))throw Error('Missing services');
 return parsed;
}
export function renderSiteHtml(content,opts={}){
 const esc=escapeSiteText;
 const title=esc(content?.title,110),subtitle=esc(content?.subtitle,340),about=esc(content?.about,1050),cta=esc(content?.callToAction,100);
 const services=Array.isArray(content?.services)?content.services.slice(0,5):[];
 if(!title||!subtitle||!about||!cta||services.length<2)throw Error('Incomplete site');
 const style=['notte','chiaro','energia'].includes(opts.style)?opts.style:'notte';
 const palettes={notte:['#07101f','#111f33','#eef8ff','#a3bed2','#69d6ff','#25445a'],chiaro:['#f4f8fc','#ffffff','#152c44','#4e6579','#125dc3','#d7e3ed'],energia:['#12111e','#221e34','#f8f5ff','#c7badb','#ffbb61','#433954']};
 const p=palettes[style];
 const email=typeof opts.contactEmail==='string'&&/^[a-zA-Z0-9._%+-]{1,64}@[a-zA-Z0-9.-]{1,180}\.[a-zA-Z]{2,24}$/.test(opts.contactEmail.trim())?opts.contactEmail.trim():'';
 const emailMarkup=email?'<a class="button" href="mailto:'+esc(email,250)+'">Scrivici una email</a>':'<p class="muted">Contatti da completare prima della pubblicazione.</p>';
 const cards=services.map((s,i)=>'<article class="service"><span class="num">0'+(i+1)+'</span><h3>'+esc(s.title,110)+'</h3><p>'+esc(s.description,450)+'</p></article>').join('\n');
 const css=[
  ":root{color-scheme:"+ (style==='chiaro'?'light':'dark') +";--bg:"+p[0]+";--surface:"+p[1]+";--ink:"+p[2]+";--muted:"+p[3]+";--accent:"+p[4]+";--line:"+p[5]+"}",
  "*{box-sizing:border-box}html{scroll-behavior:smooth}body{margin:0;background:var(--bg);color:var(--ink);font-family:system-ui,-apple-system,Segoe UI,sans-serif;line-height:1.6}a{color:inherit}",
  ".container{max-width:1080px;margin:auto;padding:0 24px}header{display:flex;align-items:center;justify-content:space-between;gap:20px;padding:24px 0;border-bottom:1px solid var(--line)}",
  ".brand{font-weight:850;letter-spacing:-.02em;font-size:20px}.nav{display:flex;gap:22px;font-size:13px;color:var(--muted);flex-wrap:wrap}.nav a{text-decoration:none}",
  ".hero{padding:100px 0 110px;position:relative;overflow:hidden}.hero:before{content:'';position:absolute;inset:-35% -20% auto auto;width:550px;height:550px;background:radial-gradient(circle,var(--accent),transparent 68%);opacity:.09;pointer-events:none}.eyebrow{font-weight:850;font-size:11px;letter-spacing:.2em;color:var(--accent);text-transform:uppercase}",
  "h1{font-size:clamp(40px,7vw,76px);line-height:1.06;letter-spacing:-.05em;max-width:850px;margin:22px 0 28px}h2{font-size:clamp(29px,4vw,44px);line-height:1.13;letter-spacing:-.04em;margin:14px 0 22px}p{margin:0}.lead{font-size:clamp(17px,2.2vw,21px);color:var(--muted);max-width:620px;margin-bottom:34px}",
  ".button{display:inline-flex;align-items:center;justify-content:center;min-height:48px;padding:12px 22px;border-radius:9px;background:var(--accent);color:var(--bg);text-decoration:none;font-weight:800}",
  "section.content{padding:78px 0;border-top:1px solid var(--line)}.section-copy{max-width:760px;color:var(--muted);font-size:17px}",
  ".services{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:16px;margin-top:35px}.service{background:var(--surface);border:1px solid var(--line);padding:28px;border-radius:16px;min-height:190px}.service h3{font-size:21px;line-height:1.25;margin:18px 0 10px}.service p{font-size:14px;color:var(--muted)}.num{font-size:13px;color:var(--accent);font-weight:800}",
  ".contact{padding:82px 0}.contact h2{max-width:650px}.muted{color:var(--muted);font-size:14px}footer{padding:27px 0;border-top:1px solid var(--line);color:var(--muted);font-size:12px}",
  "@media(max-width:690px){.hero{padding:75px 0 85px}.services{grid-template-columns:1fr}.service{min-height:0}.nav{gap:10px;font-size:12px}header{align-items:flex-start}.container{padding:0 18px}.contact{padding:60px 0}}"
 ].join('');
 const html=[
 '<!doctype html><html lang="it"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">',
 '<meta http-equiv="Content-Security-Policy" content="default-src &#39;none&#39;; style-src &#39;unsafe-inline&#39;; img-src data:; base-uri &#39;none&#39;; form-action &#39;none&#39;; object-src &#39;none&#39;">',
 '<meta name="referrer" content="no-referrer"><meta name="description" content="'+subtitle+'"><title>'+title+' | Sito dimostrativo</title><style>'+css+'</style></head><body><div class="container">',
 '<header><span class="brand">'+title+'</span><nav class="nav"><a href="#chi-siamo">Chi siamo</a><a href="#servizi">Servizi</a><a href="#contatti">Contatti</a></nav></header>',
 '<main><section class="hero"><div class="eyebrow">Il tuo partner di fiducia</div><h1>'+title+'</h1><p class="lead">'+subtitle+'</p><a class="button" href="#contatti">'+cta+'</a></section>',
 '<section class="content" id="chi-siamo"><span class="eyebrow">Chi siamo</span><h2>Professionalità e attenzione ai dettagli.</h2><p class="section-copy">'+about+'</p></section>',
 '<section class="content" id="servizi"><span class="eyebrow">Cosa facciamo</span><h2>Le nostre soluzioni</h2><div class="services">'+cards+'</div></section>',
 '<section class="contact" id="contatti"><span class="eyebrow">Parliamone</span><h2>Hai un progetto in mente?</h2><p class="lead">Raccontaci di cosa hai bisogno e troviamo insieme la soluzione giusta.</p>'+emailMarkup+'</section>',
 '</main><footer>© '+new Date().getUTCFullYear()+' '+title+'. Bozza da verificare prima della pubblicazione.</footer></div></body></html>'
 ].join('');
 if(html.length>70000)throw Error('Generated page too large');
 return html;
}
