import {readFileSync} from 'node:fs';
function runContextRegression(html){
 const p=html.slice(html.indexOf('function parseJarvisCoreCommand('),html.indexOf('function showSitePreviewInChat('));
 if(!p)throw Error('Parser missing');
 const core=new Function('Date','let pendingVoiceAction=null,pendingWebsiteBrief=null;\n'+p+'\nreturn {parse:parseJarvisCoreCommand,setAction:v=>pendingVoiceAction=v,setBrief:v=>pendingWebsiteBrief=v};');
 let now=1000;const ctx=core({now:()=>now}),parse=ctx.parse;
 const checks=[];function check(name,ok){if(!ok)throw Error(name);checks.push(name)}
 const action=()=>ctx.setAction({command:{kind:'project',title:'Alfa'},expiresAt:now+90000});
 const brief=()=>ctx.setBrief({expiresAt:now+90000});
 action();check('question cannot approve a project',parse('Jarvis, sì?')?.kind==='voice-confirm-clarify');
 check('explicit confirmation preserves original target',parse('Sì, confermo')?.title==='Alfa');
 check('confirmation is consumed',!parse('Sì, confermo'));
 action();check('ambiguous assent asks for confirmation',parse('Va bene')?.kind==='voice-confirm-clarify');
 check('explicit cancel works',parse('No, annulla')?.kind==='voice-cancel');
 action();now+=90001;check('expired confirmation is not sent to advisory AI',parse('Confermo')?.kind==='voice-confirm-expired');
 action();parse('Come stai?');check('unrelated question clears pending approval',!parse('Confermo'));
 check('incomplete site request is recognized',parse('Jarvis, creami un sito')?.kind==='website-clarify');
 brief();const resolved=parse('Per un idraulico, grazie.');check('short follow-up resumes website request',resolved?.kind==='website'&&resolved.title==='un idraulico');
 check('website clarification consumed once',!parse('Per un negozio'));
 brief();check('site question is not an order',!parse('Per un idraulico?'));
 check('question clears website context',!parse('Per un negozio'));
 brief();parse('Come va?');check('unrelated question clears website context',!parse('Per un idraulico'));
 brief();now+=90001;check('expired website context does not execute',!parse('Per un idraulico'));
 brief();check('cancel website clarification',parse('Annulla')?.kind==='voice-cancel');
 check('standalone recipient never starts a job',!parse('Per un idraulico'));
 check('complete site command unchanged',parse('Jarvis, creami un sito web per un elettricista')?.kind==='website');
 check('informational website question stays advisory',!parse('Come si crea un sito web per un elettricista?'));
 check('existing project command unchanged',parse('Crea un progetto Alfa')?.kind==='project');
 check('existing self-check unchanged',parse('Jarvis, autocontrollati')?.kind==='health-status');
 check('clarification handler arms context',html.includes('pendingWebsiteBrief={expiresAt:Date.now()+90000}'));
 check('dialogue stop clears context',html.includes('pendingVoiceAction=null;pendingWebsiteBrief=null;dialoguePending=false'));
 return checks;
}
const checks=runContextRegression(readFileSync('cloudflare/ui/command-v4-unified.html','utf8'));
console.log('PASS '+checks.length+' dialogue context checks:',checks.join('; '));
