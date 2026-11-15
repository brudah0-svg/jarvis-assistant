if(path==="/api/site-drafts"&&method==="GET"){
      if(!env.DB)return json({error:"Archivio bozze non disponibile"},503,origin);
      try{
        const records=await env.DB.prepare("SELECT id,title,brief,style,created_at FROM site_drafts ORDER BY created_at DESC,id DESC LIMIT 30").all();
        return json({status:"ok",drafts:records.results||[]},200,origin);
      }catch{return json({error:"Impossibile leggere le bozze Cloud"},503,origin)}
    }
    if(path.startsWith("/api/site-drafts/")&&method==="GET"){
      if(!env.DB)return json({error:"Archivio bozze non disponibile"},503,origin);
      const id=path.slice("/api/site-drafts/".length);
      if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id))return json({error:"ID bozza non valido"},400,origin);
      try{
        const draft=await env.DB.prepare("SELECT id,title,brief,style,contact_email,html,created_at FROM site_drafts WHERE id=?").bind(id).first();
        if(!draft)return json({error:"Bozza non trovata"},404,origin);
        return json({status:"ok",draft},200,origin);
      }catch{return json({error:"Errore recupero bozza"},503,origin)}
    }

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
        let saved=false,draftId=null,saveError=null;
        if(body.saveDraft===true){
          if(!env.DB)saveError="Archivio bozze non disponibile, scarica il file HTML.";
          else try{
            const rows=await env.DB.prepare("SELECT COUNT(*) AS n FROM site_drafts").first();
            if(!Number.isSafeInteger(Number(rows?.n))||Number(rows.n)>=30)throw Error("Limite di 30 bozze raggiunto");
            draftId=crypto.randomUUID();
            await env.DB.prepare("INSERT INTO site_drafts(id,title,brief,style,contact_email,html) VALUES (?,?,?,?,?,?)").bind(draftId,content.title.slice(0,110),brief,style,contactEmail,html).run();
            saved=true;
          }catch(e){draftId=null;saveError=e?.message==="Limite di 30 bozze raggiunto"?"Archivio pieno (30 bozze). Scarica HTML e contatta l'amministratore per la gestione delle bozze.":"Impossibile salvare nel Cloud: scarica l'HTML prima di chiudere la pagina.";}
        }
        return json({status:"generated",format:"standalone-static-html",html,siteTitle:content.title,saved,draftId,saveError,requires_publication_approval:true,production_deployed:false,operations_executed:false,notice:"Sito statico generato senza pubblicazione. Bozza nel Cloud solo se il salvataggio è confermato."},200,origin);
      }catch(error){
        console.error("JARVIS website builder",String(error).slice(0,230));
        return json({error:"Generazione non riuscita. Riprova con un brief più preciso."},502,origin);
      }
    }

    