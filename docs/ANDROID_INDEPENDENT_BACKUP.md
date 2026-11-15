# JARVIS — backup indipendente verificabile da Android

Ultima verifica tecnica: 15 novembre 2026.

## Situazione accertata

- Copia privata interna verificata su Cloudflare: 35 tabelle, 96 record, creata alle 06:00:14 UTC del 15 novembre 2026. Il database di backup ha superato `PRAGMA quick_check`; hash e consistenza dello snapshot sono registrati come verificati.
- Lo snapshot più recente **non** è marcato come ripristinato in prova. Una copia precedente (33 tabelle, 87 record) ha superato un test di ripristino isolato.
- Nessuna copia cifrata esterna, salvata sul dispositivo o in un account indipendente, è stata verificata finora. Non cambiare questo stato sulla base del solo backup interno.
- Produzione e staging mantengono versioni e database separati.

## Operazione indispensabile sul dispositivo Android

1. Apri **solo dopo l'accesso Cloudflare**: https://jarvis-backend.jarvisproj3ct.workers.dev/recovery-download-v3
2. Controlla che la sezione **Stato della copia** riporti un backup verificato, e leggi se è indicato come precedente alle modifiche più recenti.
3. Inserisci una password lunga, unica e non riutilizzata nella sezione **Crea copia AES-256-GCM**. Non condividerla in chat o nel repository. Conservala separatamente dal file.
4. Premi **Verifica, cifra e salva backup**. Controlla che il browser abbia effettivamente salvato un file `.jarvisbak` nella cartella Download di Android.
5. Nella sezione **Verifica backup scaricato**, seleziona esattamente il file appena salvato, inserisci la password e premi **Verifica localmente il file**. Devi ottenere un messaggio con conteggi di tabelle e record coerenti. La semplice notifica «download avviato» non è una verifica del file.
6. Conserva una seconda copia del solo archivio **già cifrato** su una memoria o servizio non appartenente all'account Cloudflare. La password deve restare in luogo separato. Non caricare mai il JSON in chiaro su GitHub, ChatGPT o un servizio pubblico.

## Cosa non fare

Non inserire password nel repository, non condividere il file di backup in chat, non segnare `independent_backup_verified=1` senza prova reale di download, verifica locale e seconda copia fuori da Cloudflare.

Il rilascio in produzione richiede comunque la regressione remota completa **10/10 sulla versione attualmente distribuita**, provenienza del candidato, collaudo autenticato Android e autorizzazione esplicita.

La procedura usa la pagina esistente che impiega AES-256-GCM e PBKDF2-SHA256 con 310.000 iterazioni per cifrare localmente; la password non viene inviata al Worker. Verifica sempre il dominio prima dell'accesso.
