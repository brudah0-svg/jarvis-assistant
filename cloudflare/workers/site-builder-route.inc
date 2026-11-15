if(path==="/api/site-builder"&&method==="POST"){
      if(!env.AI)return json({error:"AI non configurata"},503,origin);
      try{
        const raw=await request.text();
        if(raw.length>4500)return json({error:"Richiesta troppo grande"},413,origin);
        let body;try{body=JSON.parse(raw)}catch{return json({error:"JSON non valido"},400,origin)}
        const brief=typeof body?.brief==='string'?body.brief.trim():'';
        const style=body?.style||'notte';
        const contactEmail=typeof body?.contactEmail==='string'?body.contactEmail.trim():'';
        if(brief.length<15||brief.length>1200)return json({error:"Descrivi il sito in 15-1200 caratteri"},400,origin);
        if(!['notte','chiaro','energia'].includes(style))return json({error:"Stile sconosciuto"},400,origin);
        if(contactEmail&&(!/^[a-zA-Z0-9._%+-]{1,64}@[a-zA-Z0-9.-]{1,180}\.[a-zA-Z]{2,24}$/.test(contactEmail)))return json({error:"Email non valida"},400,origin);
        const prompt="Sei il copywriter di JARVIS Website Builder. Crea contenuti per un sito aziendale italiano professionale basati ESCLUSIVAMENTE sul brief. Rispondi SOLO con un oggetto JSON valido senza markdown, codice HTML o commenti: {\"title\":\"titolo sito\",\"subtitle\":\"frase breve persuasiva\",\"about\":\"testo presentazione 2-3 frasi\",\"services\":[{\"title\":\"servizio 1\",\"description\":\"descrizione\"},{\"title\":\"servizio 2\",\"description\":\"descrizione\"},{\"title\":\"servizio 3\",\"description\":\"descrizione\"}],\"callToAction\":\"testo breve pulsante\"}. Non inventare recensioni, certificazioni, risultati garantiti, numeri di telefono, indirizzi, email o dettagli che non sono nel brief. Non includere link, istruzioni, codice, script o markup. Scrivi naturale, chiaro, professionale.";
        const model=await env.AI.run("@cf/meta/llama-3.1-8b-instruct-fp8",{messages:[{role:"system",content:prompt},{role:"user",content:brief}],max_tokens:1500,temperature:0.25});
        const response=typeof model?.response==='string'?model.response:model?.choices?.[0]?.message?.content;
        const content=parseSiteContent(response);
        const html=renderSiteHtml(content,{style,contactEmail});
        return json({status:"generated",format:"standalone-static-html",html,siteTitle:content.title,requires_publication_approval:true,production_deployed:false,operations_executed:false,notice:"Sito statico generato. Nessuna pubblicazione o modifica a progetti e database. Verifica i testi prima dell'uso."},200,origin);
      }catch(error){
        console.error("JARVIS website builder",String(error).slice(0,230));
        return json({error:"Generazione non riuscita. Riprova con un brief più preciso."},502,origin);
      }
    }

    