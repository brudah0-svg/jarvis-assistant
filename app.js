(() => {
  "use strict";
  const $ = s => document.querySelector(s);
  const messagesEl = $("#messages"), input = $("#message-input"), mic = $("#mic-button");
  const STORAGE_CHAT = "jarvis.v01.chat", STORAGE_TASKS = "jarvis.v01.tasks";
  let recognition = null, listening = false;
  function read(key, fallback) { try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch (e) { console.warn(e); return fallback; } }
  function write(key, value) { try { localStorage.setItem(key, JSON.stringify(value)); return true; } catch (e) { console.error(e); setState("Memoria locale non disponibile"); return false; } }
  function setState(s) { $("#assistant-state").textContent = s.toUpperCase(); }
  function speak(text) {
    if (!("speechSynthesis" in window)) return;
    try { speechSynthesis.cancel(); const u = new SpeechSynthesisUtterance(text); u.lang = "it-IT"; u.rate = 1; u.pitch = .92; const v = speechSynthesis.getVoices().find(x => x.lang && x.lang.toLowerCase().startsWith("it")); if (v) u.voice = v; speechSynthesis.speak(u); }
    catch (e) { console.error("Sintesi vocale non riuscita", e); }
  }
  function renderMessage(role, text, save = true) {
    const el = document.createElement("div"); el.className = `message ${role}`;
    const who = document.createElement("span"); who.className = "who"; who.textContent = role === "assistant" ? "JARVIS // SYSTEM" : "UTENTE // INPUT";
    const body = document.createElement("div"); body.textContent = text; el.append(who, body); messagesEl.append(el); messagesEl.scrollTop = messagesEl.scrollHeight;
    if (save) { const chat = read(STORAGE_CHAT, []); chat.push({role, text, at: Date.now()}); write(STORAGE_CHAT, chat.slice(-60)); }
  }
  function say(text, voice = true) { renderMessage("assistant", text); setState("Risposta pronta"); if (voice) speak(text); }
  function tasks() { return read(STORAGE_TASKS, []); }
  function addTask(text) {
    const clean = text.trim(); if (!clean) return "Scrivi prima il testo dell'attività.";
    const list = tasks(); list.unshift({id: `${Date.now()}-${Math.random().toString(16).slice(2)}`, text: clean, done: false});
    write(STORAGE_TASKS, list); renderTasks(); return `Attività aggiunta: ${clean}`;
  }
  function renderTasks() {
    const list = tasks(); $("#task-count").textContent = String(list.filter(t => !t.done).length); $("#task-list").replaceChildren();
    list.forEach(task => {
      const li = document.createElement("li"); li.className = "task-item" + (task.done ? " done" : "");
      const cb = document.createElement("input"); cb.type = "checkbox"; cb.checked = !!task.done; cb.setAttribute("aria-label", "Segna attività completata");
      cb.addEventListener("change", () => { write(STORAGE_TASKS, tasks().map(t => t.id === task.id ? {...t, done: cb.checked} : t)); renderTasks(); });
      const label = document.createElement("span"); label.textContent = task.text;
      const del = document.createElement("button"); del.type = "button"; del.className = "delete-task"; del.textContent = "×"; del.setAttribute("aria-label", "Elimina attività");
      del.addEventListener("click", () => { if (confirm("Eliminare questa attività?")) { write(STORAGE_TASKS, tasks().filter(t => t.id !== task.id)); renderTasks(); } });
      li.append(cb, label, del); $("#task-list").append(li);
    });
  }
  function reply(raw) {
    const t = raw.trim(), l = t.toLocaleLowerCase("it");
    if (/^(ciao|buongiorno|buonasera|salve)\b/.test(l)) return "Buonasera. JARVIS è operativo in modalità prototipo locale. Quale obiettivo vuoi trasformare in un piano?";
    if (l.includes("comand")) return "Comandi disponibili: “aiutami a pianificare un progetto”, “aggiungi attività [testo]”, “mostra attività”, “esegui un controllo del sistema” e “che ore sono?”. Non è ancora collegato un modello AI.";
    if (l.includes("controllo") || l.includes("diagnostic")) {
      const checks = [`JavaScript: ${typeof window !== "undefined" ? "OK" : "ERRORE"}`, `Memoria locale: ${write("jarvis.v01.selftest", {ok:true, at:Date.now()}) ? "OK" : "NON DISPONIBILE"}`, `Sintesi vocale: ${"speechSynthesis" in window ? "DISPONIBILE" : "NON SUPPORTATA"}`, `Riconoscimento vocale: ${(window.SpeechRecognition || window.webkitSpeechRecognition) ? "DISPONIBILE" : "NON RILEVATO"}`, `Connessione: ${navigator.onLine ? "ONLINE" : "OFFLINE"}`];
      return "Controllo locale completato:\\n• " + checks.join("\\n• ") + "\\nQuesti controlli verificano API di base, non certificano la sicurezza dell'intero sistema.";
    }
    if (l.includes("che ore") || l.includes("ora sono")) return `L'orario del dispositivo è ${new Date().toLocaleTimeString("it-IT", {hour:"2-digit", minute:"2-digit"})}.`;
    if (l.includes("mostra attività") || l.includes("mostrami le attività") || l.includes("lista attività")) { const open = tasks().filter(x => !x.done); return open.length ? "Attività ancora aperte:\\n• " + open.map(x => x.text).join("\\n• ") : "Non ci sono attività aperte. Puoi aggiungerne una nel pannello Attività locali."; }
    const match = t.match(/^(?:jarvis[, ]*)?(?:aggiungi attività|crea attività|ricorda di)\\s+(.+)$/i);
    if (match) return addTask(match[1]);
    if (l.includes("pianificare") || l.includes("pianifica") || l.includes("progetto")) return "Impostiamo il progetto in modo concreto. Scrivi il risultato desiderato, la scadenza e i vincoli. Questa versione non ha ancora un modello AI collegato, ma puoi salvare le azioni nella lista.";
    return "Richiesta ricevuta e registrata. Questa versione non è ancora collegata a un modello AI: non può ragionare liberamente né eseguire azioni esterne. Scrivi “comandi” per le funzioni locali.";
  }
  function handle(text) { const clean = text.trim(); if (!clean) return; renderMessage("user", clean); input.value = ""; input.style.height = "auto"; setState("Elaborazione locale"); try { say(reply(clean)); } catch (e) { console.error(e); say("Ho rilevato un errore nella gestione della richiesta. Prova di nuovo o avvia il controllo del sistema."); } }
  $("#chat-form").addEventListener("submit", e => { e.preventDefault(); handle(input.value); });
  input.addEventListener("input", () => { input.style.height = "auto"; input.style.height = `${Math.min(input.scrollHeight, 100)}px`; });
  document.querySelectorAll("[data-command]").forEach(b => b.addEventListener("click", () => handle(b.dataset.command)));
  $("#clear-chat").addEventListener("click", () => { if (confirm("Cancellare la cronologia di questa conversazione su questo dispositivo?")) { write(STORAGE_CHAT, []); messagesEl.replaceChildren(); say("Cronologia locale pulita. Le attività non sono state cancellate.", false); } });
  $("#task-form").addEventListener("submit", e => { e.preventDefault(); const v = $("#task-input"); if (v.value.trim()) { const r = addTask(v.value); v.value = ""; setState(r.startsWith("Attività aggiunta") ? "Attività aggiornata" : "In attesa di comando"); } });
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (SR) {
    recognition = new SR(); recognition.lang = "it-IT"; recognition.interimResults = false; recognition.maxAlternatives = 1;
    recognition.onstart = () => { listening = true; mic.classList.add("listening"); mic.textContent = "■"; setState("Ascolto attivo"); $("#voice-note").textContent = "Ti ascolto. Parla chiaramente in italiano."; };
    recognition.onresult = e => { const transcript = e.results?.[0]?.[0]?.transcript || ""; if (transcript.trim()) handle(transcript); };
    recognition.onerror = e => { const map = {"not-allowed":"Accesso al microfono negato.","no-speech":"Non ho rilevato parole.","network":"Errore di rete nel riconoscimento vocale.","audio-capture":"Microfono non disponibile."}; $("#voice-note").textContent = map[e.error] || `Riconoscimento vocale non riuscito (${e.error}). Puoi scrivere il messaggio.`; };
    recognition.onend = () => { listening = false; mic.classList.remove("listening"); mic.textContent = "◉"; setState("In attesa di comando"); };
    mic.addEventListener("click", () => { try { if (listening) recognition.stop(); else recognition.start(); } catch(e) { console.warn(e); $("#voice-note").textContent = "Impossibile avviare l'ascolto. Attendi un momento e riprova."; } });
  } else { mic.disabled = true; mic.title = "Riconoscimento vocale non supportato"; $("#voice-note").textContent = "Riconoscimento vocale non supportato in questo browser. Puoi comunque scrivere e ascoltare le risposte, se la sintesi vocale è disponibile."; }
  const old = read(STORAGE_CHAT, []); old.slice(-30).forEach(m => renderMessage(m.role === "user" ? "user" : "assistant", m.text, false));
  if (!old.length) say("Sistema inizializzato. Sono pronto a ricevere un comando. Scrivi “comandi” per vedere le funzioni disponibili.", false);
  renderTasks();
  function clock() { $("#clock").textContent = new Date().toLocaleTimeString("it-IT", {hour:"2-digit",minute:"2-digit",second:"2-digit"}); } clock(); setInterval(clock, 1000);
  if ("serviceWorker" in navigator && location.protocol.startsWith("http")) addEventListener("load", () => navigator.serviceWorker.register("./sw.js").catch(console.warn));
  addEventListener("online", () => $("#system-status").textContent = "ONLINE LOCALE"); addEventListener("offline", () => $("#system-status").textContent = "OFFLINE");
})();