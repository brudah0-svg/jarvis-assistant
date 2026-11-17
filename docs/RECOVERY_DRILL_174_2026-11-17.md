# JARVIS — Collaudo reale del backup 174 record (17 novembre 2026)

## Scopo
Verifica indipendente del ripristino dello snapshot D1 privato `3c941a96-8a73-404e-a089-9960cc9ff282`, senza modificare il database di produzione e senza inserire dati personali nel repository.

## Prova eseguita
- Snapshot creato il **2026-11-17 12:00:14 UTC**: `consistency_verified=1`, **39 tabelle**, **174 record**, **3 indici**.
- Recuperati dal database *privato* metadati, schema e record; nessun record o segreto è stato scritto in GitHub.
- Ricalcolati SHA-256 canonici dell'intero schema e di tutti i record: **entrambi corrispondono ai digest archiviati**.
- Creato un database D1 *temporaneo*, separato, con giurisdizione `eu`, senza binding al Worker di produzione.
- Ricostruite tutte le 39 tabelle e reinseriti i 174 record in ordine topologico secondo le dipendenze delle chiavi esterne. Ricreati i 3 indici.
- Lettura di ritorno di ogni tabella: **39/39** tabelle e **174/174** record corrispondenti esattamente, confrontando gli oggetti JSON serializzati (nessun valore riportato qui).
- `PRAGMA quick_check`: **ok**.
- `PRAGMA foreign_key_check`: **0 violazioni**.
- Il database temporaneo è stato **eliminato** e la sua assenza verificata con un nuovo elenco dei database dell'account.

## Tentativo preliminare
Un primo tentativo di inserimento senza ordinamento per chiavi esterne è stato respinto da D1 con un errore di vincolo FK. Anche quel database temporaneo è stato cancellato e l'assenza verificata. Il secondo tentativo, con ordinamento dipendenze, è passato interamente. Non è stata eseguita alcuna scrittura nel database applicativo o nell'archivio di backup.

## Confini della certificazione
- **Confermato:** questo snapshot interno da 174 record è coerente e realmente ripristinabile in isolamento.
- **Già verificato dall'utente su Android:** il corrispondente file cifrato `.jarvisbak` si scarica, si decifra e verifica localmente; la schermata mostra 39 tabelle e 174 record.
- **Non ancora confermato:** una seconda copia indipendente dell'archivio corrente, riscaricata e verificata su storage off-device.
- **Non ancora confermato:** ripristino dello snapshot *successivo* alle modifiche presenti nel database al momento dello screenshot (che indicava 178 record).
- `restore_test_verified=0` nel database di backup è rimasto **immutato intenzionalmente**. Questo documento registra il collaudo reale; non alterare lo storico per far passare un release gate.
- La correzione del bug tabelle/indici è già stata inserita nella PR #78, ma i vecchi risultati `failed` precedenti al suo deploy non provano un nuovo guasto. Attendere e verificare un ciclo di backup e verifica successivo.
- **Nessun ripristino in produzione, nessun rilascio, nessun costo autorizzato.**

## Azioni successive
1. Aspettare il successivo snapshot programmato e confermare verdict `passed` più `verify_passed` distinti, con contatori aggiornati.
2. Scaricare da Android un nuovo file `.jarvisbak`, verificarlo localmente e salvare una copia cifrata indipendente fuori dal dispositivo (password separata).
3. Testare il ripristino isolato del nuovo snapshot prima di considerare completato il recovery gate.
4. Per JARVIS GROUP tenere una singola interfaccia conversazionale con smistamento intenzioni, agenti, QA e autorizzazioni, evitando di confondere demo di voce+LLM con autonomia realizzata.
