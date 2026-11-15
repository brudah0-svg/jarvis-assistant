# JARVIS unico — piano di transizione senza perdita dei dati locali

**Scelta architetturale:** Un solo centro di comando Cloudflare sotto `/jarvis-unified` sullo stesso host protetto delle API. Dashboard, progetti, attività, memoria e chat Workers AI nella stessa pagina; i moduli avanzati aprono altri percorsi **sullo stesso dominio autenticato**, non siti diversi.

L'app GitHub Pages resta temporaneamente come archivio locale, perché il suo `localStorage` non è leggibile da Cloudflare senza un'azione esplicita dell'utente. Non usiamo iframe tra domini: Cloudflare Access e Content Security Policy devono continuare a proteggere l'app.

## Migrazione una sola volta, solo dopo il rilascio autorizzato

1. Nella vecchia pagina GitHub Pages usare **Esporta dati locali** per salvare un JSON `jarvis-local-data-v1` sul proprio Android.
2. Aprire il nuovo `/jarvis-unified` **dopo l'accesso Cloudflare** e premere **Importa dati locali**.
3. Scegliere il file JSON e confermare il riepilogo. Il sistema importerà soltanto i nuovi progetti, le attività e i ricordi, senza cancellare gli originali.
4. Le richieste di approvazione locali restano nel JSON e **non vengono trasferite o eseguite automaticamente**. La migrazione non attiva acquisti, pubblicazioni o email.
5. Verificare manualmente i dati importati; solo allora scegliere la pagina Cloud come accesso preferito da Android.

Il file resta sul dispositivo; il trasferimento è verso le API same-origin protette ed è autorizzato tramite conferma dell'utente. Importazioni interrotte non effettuano rollback automatico; il tool evita i duplicati più comuni e segnala quali elementi sono stati creati.

Il nuovo script `scripts/build-v4-unified-production-candidate.mjs` usa un hash dell'attuale Worker di produzione verificato direttamente su Cloudflare e genera un **candidato separato** in `dist`, senza distribuire. Nessuna modifica su produzione, D1 o autenticazione è applicata da questa PR.

**Release gate:** richiede verifica mobile autenticata, integrità dei backup, test regressione aggiornati rispetto al codice da rilasciare e **approvazione esplicita** prima di sostituire o aggiungere il route reale in produzione. Il prototipo GitHub Pages non va reindirizzato automaticamente finché la migrazione dei dati non è stata offerta e verificata. L'installazione su Android andrà verificata nel browser reale.
