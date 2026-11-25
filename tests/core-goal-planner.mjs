import {readFileSync} from 'node:fs';
async function runCorePlannerRegression(core,html,build){
 const make=new Function(core.replace(/^export /gm,'')+'\nreturn {parse:parseCoreGoalPlan,route:coreGoalPlanRoute};');
 const {parse,route}=make();
 const valid={steps:[{order:1,title:'Definire il percorso',check:'Lista delle mete verificata',depends_on:[]},{order:2,title:'Verificare i trasporti',check:'Orari e costi controllati',depends_on:[1]},{order:3,title:'Preparare itinerario',check:'Itinerario coerente e fattibile',depends_on:[1,2]}],assumptions:['Partenza da definire']};
 let calls=0,messages,output=JSON.stringify(valid);
 const env={AI:{async run(model,p){calls++;messages=p.messages;return {response:output}}},DB:new Proxy({},{get(){throw Error('No DB access allowed')}})};
 const hit=(body,e=env)=>route({text:async()=>JSON.stringify(body)},e);
 const checks=[];function check(name,ok){if(!ok)throw Error(name);checks.push(name)}
 function rejects(name,v){let failed=false;try{parse(JSON.stringify(v))}catch{failed=true}check(name,failed)}
 let r=await hit({goal:'Organizzare un viaggio gratuito'});check('AI proposal has validated dependencies',r.status===200&&r.data.steps[2].depends_on.length===2&&r.data.steps.every(s=>s.status==='pending'));
 check('one inference and no database access',calls===1);
 check('goal is supplied as user data',messages[1].role==='user'&&messages[1].content==='Organizzare un viaggio gratuito');
 check('zero spend and independent assistant in instructions',messages[0].content.includes('Budget zero')&&messages[0].content.includes('Non usare agenti esterni'));
 check('proposal cannot certify execution or approval',r.data.operations_executed===false&&r.data.requires_approval===true&&r.data.saved===false);
 check('invalid short goal rejected before inference',(await hit({goal:'a'})).status===400&&calls===1);
 check('extra execution flag rejected',(await hit({goal:'Pianifica una vacanza',execute:true})).status===400&&calls===1);
 check('missing AI returns explicit unavailability',(await hit({goal:'Pianifica una vacanza'},{})).status===503);
 rejects('forward dependency rejected',{...valid,steps:valid.steps.map((s,i)=>i===0?{...s,depends_on:[2]}:s)});
 rejects('duplicate dependencies rejected',{...valid,steps:valid.steps.map((s,i)=>i===2?{...s,depends_on:[1,1]}:s)});
 rejects('duplicate titles rejected',{...valid,steps:valid.steps.map((s,i)=>i===2?{...s,title:valid.steps[0].title}:s)});
 rejects('missing verification rejected',{...valid,steps:valid.steps.map((s,i)=>i===1?{...s,check:''}:s)});
 rejects('oversized step list rejected',{...valid,steps:Array(7).fill(valid.steps[0])});
 output='non JSON';check('invalid model output fails closed',(await hit({goal:'Pianifica una vacanza'})).status===502&&calls===2);
 output=JSON.stringify({...valid,operations_executed:true,saved:true});r=await hit({goal:'Pianifica una vacanza'});check('model cannot override server flags',r.data.operations_executed===false&&r.data.saved===false);
 check('UI uses AI planning endpoint',html.includes("post('/api/core-plan',{goal:command.title})")&&html.includes("result.operations_executed!==false"));
 check('candidate adds route and retains old planner',build.includes('coreGoalPlanRoute(request,env)')&&build.includes('plannerAnchor')&&build.includes('candidate.replace(plannerAnchor'));
 return checks;
}
const checks=await runCorePlannerRegression(readFileSync('cloudflare/workers/core-goal-planner.mjs','utf8'),readFileSync('cloudflare/ui/command-v4-unified.html','utf8'),readFileSync('scripts/build-unified-trusted-chat.mjs','utf8'));
console.log('PASS '+checks.length+' planner checks:',checks.join('; '));
