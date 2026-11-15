import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
const hash=s=>createHash('sha256').update(s).digest('hex');
const original=readFileSync('cloudflare/workers/jarvis-backend.mjs','utf8');
assert.equal(hash(original),'15f9b6ca957c2999208efd65ce5918e9579bc7d6006faf2035410d796acfee17');
const html=readFileSync('cloudflare/ui/command-v4-unified.html','utf8');
const manifest=readFileSync('cloudflare/ui/jarvis-app.webmanifest','utf8');
assert(html.includes('result.operations_executed===false'));
const anchor='if (path === "/jarvis" && method === "GET")';
assert.equal(original.split(anchor).length,2);
const headers={"Content-Type":"text/html; charset=utf-8","Cache-Control":"no-store","X-Content-Type-Options":"nosniff","Content-Security-Policy":"default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; connect-src 'self'; img-src 'self' data:; base-uri 'none'; frame-ancestors 'none'; form-action 'self'"};
const newRoute='if(path==="/jarvis-unified"&&method==="GET")return new Response('+JSON.stringify(html)+',{headers:'+JSON.stringify(headers)+'});\n    ';
const manifestRoute='if(path==="/jarvis-app.webmanifest"&&method==="GET")return new Response('+JSON.stringify(manifest)+',{headers:{"Content-Type":"application/manifest+json; charset=utf-8","Cache-Control":"no-store","X-Content-Type-Options":"nosniff"}});\n    ';
let candidate=original.replace(anchor,newRoute+manifestRoute+anchor);
const oldRead=`const [memory,projects,tasks]=await Promise.all([
          env.DB.prepare("SELECT content,category FROM memories ORDER BY created_at DESC LIMIT 12").all(),
          env.DB.prepare("SELECT name,description,status FROM projects ORDER BY created_at DESC LIMIT 12").all(),
          env.DB.prepare("SELECT title,status FROM tasks ORDER BY created_at DESC LIMIT 15").all()
        ]);
        const context=JSON.stringify({memories:memory.results,projects:projects.results,tasks:tasks.results}).slice(0,5500);`;
const newRead=`const [memory,projects,tasks,approvals]=await Promise.all([
          env.DB.prepare("SELECT content,category FROM memories ORDER BY created_at DESC LIMIT 12").all(),
          env.DB.prepare("SELECT name,description,status FROM projects ORDER BY created_at DESC LIMIT 12").all(),
          env.DB.prepare("SELECT title,status FROM tasks ORDER BY created_at DESC LIMIT 15").all(),
          env.DB.prepare("SELECT COUNT(*) AS n FROM action_proposals WHERE status='pending'").first()
        ]);
        const pendingProposals=Number(approvals?.n);
        if(!Number.isSafeInteger(pendingProposals)||pendingProposals<0)return json({error:"Approval status unavailable"},503,origin);
        const context=JSON.stringify({memories:memory.results,projects:projects.results,tasks:tasks.results,verified_approval_state:{pending_proposals:pendingProposals,chat_is_read_only:true,approved_by_chat:false,executed_by_chat:false}}).slice(0,5500);`;
assert.equal(candidate.split(oldRead).length,2);
candidate=candidate.replace(oldRead,newRead);
const oldLine='const system="Sei JARVIS, assistente personale italiano.';
const newLine='const system="Sei JARVIS, assistente personale italiano. Lo stato delle proposte in attesa proviene dal database; questa chat NON ha verificato approvazioni pregresse. Non dichiarare piani approvati o azioni eseguite senza una prova esplicita. Se un utente chiede se hai eseguito qualcosa, rispondi che non puoi farlo da questa chat. ';
const i=candidate.indexOf(oldLine),j=candidate.indexOf(oldLine,i+1);
assert(i>=0&&j===-1);
candidate=candidate.replace(oldLine,newLine);
const oldReturn='return json({status:"ok",model:"@cf/meta/llama-3.1-8b-instruct-fp8",answer,read_only:true},200,origin);';
assert.equal(candidate.split(oldReturn).length,2);
candidate=candidate.replace(oldReturn,'return json({status:"ok",model:"@cf/meta/llama-3.1-8b-instruct-fp8",answer,read_only:true,operations_executed:false,approval_granted_by_chat:false,pending_proposals:pendingProposals},200,origin);');
mkdirSync('dist',{recursive:true});
writeFileSync('dist/jarvis-unified-trusted-chat.mjs',candidate);
console.log('Unified Worker candidate SHA-256:',hash(candidate),'(build only)');
