# JARVIS v0.1 — prototipo web installabile

## Funzioni
- Interfaccia scura, blu e adattiva per Android.
- Chat testuale con cronologia locale.
- Sintesi vocale italiana tramite browser, quando supportata.
- Riconoscimento vocale tramite Web Speech API, quando supportato e autorizzato.
- Attività locali con completamento ed eliminazione.
- Diagnostica di base.
- Manifest PWA e service worker per cache offline di base.

## Limiti
Questa è una demo locale: **non contiene un modello AI collegato**, non esegue codice generato, non accede ad account o app esterne e non sincronizza dati. Il riconoscimento vocale può richiedere rete e può inviare audio al servizio vocale del browser. Non inserire dati sensibili.

## Avvio da Android
1. Estrai i file.
2. Carica i file nella cartella principale di un progetto statico su un hosting HTTPS compatibile.
3. Apri l'URL HTTPS con Chrome su Android.
4. Prova chat, attività, diagnostica e microfono.
5. Dal menu del browser scegli **Aggiungi a schermata Home** o **Installa app**, se disponibile.

Un server HTTPS è necessario per testare correttamente PWA e microfono (localhost è valido per test locali da computer).

## Test manuali
- Invia `comandi`: deve comparire l'elenco delle funzioni.
- Invia `esegui un controllo del sistema`: deve apparire il riepilogo delle API.
- Aggiungi un'attività, ricarica: deve rimanere nello stesso browser.
- Prova il microfono: se supportato, la trascrizione appare in chat.
- Prova una risposta: il browser dovrebbe leggerla se la sintesi vocale è disponibile.

## Fase successiva
Collegare un backend AI. Non inserire chiavi API segrete nel JavaScript del browser o nei file pubblici.
