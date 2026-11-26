# Mordheim – appunti per lavorare sull'app

App in italiano per comporre bande di Mordheim, calcolare le probabilità di
combattimento contro un bersaglio e cercare la banda migliore. Pagine statiche
(niente build, niente librerie), pubblicate su GitHub Pages dal repo
`darthmanfro.github.io`. Leggi questo file prima di aprire il codice.

## Regole fisse

- **Deve funzionare con il doppio clic su `index.html` (file://)**: niente
  `fetch`/XHR. I dati sono file `.js` con `registraDati("nome", { ...JSON... });`
  caricati con tag `<script>` da `js/dati.js`.
- **Stili solo nei file di `css/`**: mai `<style>`, `style="..."` o
  `element.style` da JS. Gli stati si cambiano con classi (es. `.nascosto`).
- Codice, nomi, commenti e testi in **italiano**, con i termini del regolamento
  italiano (Flagello, Mazzafrusto, Abilità di combattimento...).
- Commit: uno per funzionalità, oggetto `Mordheim: ...`, codice e
  `istruzioni.html` aggiornati insieme.
- Fonte delle regole: `C:\Users\manfroni\Documents\privato\mordheim\mordheim.pdf`
  (bande pp. 68-97, armi 41-52, corpo a corpo 35-38, tiro 30-34; testo con
  `pdftotext -enc UTF-8 -f N -l N`). Non usare `Impero in Fiamme.pdf` né le
  liste introduttive della stessa cartella.

## File

| File | Cosa contiene |
|---|---|
| `index.html` | Pagina unica con 3 schede: Banda, Probabilità, Ottimizzatore. Ordine degli script importante. |
| `istruzioni.html` | Istruzioni per l'utente: aggiornarle quando cambia il comportamento. |
| `dati/regole.js` | Tabelle: colpire in corpo a corpo, tiro, ferire, penalità TA per Forza, ferite gravi, critici. |
| `dati/equipaggiamento.js` | Oggetti (`tipo`: corpo, tiro, armatura, scudo, elmo) con i flag letti dal motore (spiegati nella `_nota`). |
| `dati/bersagli.js` | Bersagli di riferimento (sono anche l'avversario che attacca i tuoi modelli). |
| `dati/bande/indice.js` + un file per banda | Reikland, Middenheim, Marienburg, Posseduti, Cacciatori di Streghe, Sorelle Sigmarite, Nonmorti, Skaven. Banda: `corone`, `maxModelli`, `maxEroi`, `liste` (prezzi per lista), `eroi`/`truppe` con `costo`, `min`, `max`, `profilo`, `lista`, `animale`, `grosso`, `vieta`, `maxGruppo`. |
| `js/dati.js` | Caricamento dati, `tipoDi`, `oggettiAcquistabili`, `modelloPerMotore`, `formatta`, `escapeHtml`. |
| `js/motore.js` | Calcolo esatto (niente simulazioni) di un turno di corpo a corpo e del tiro. `valutaModello(modello, bersaglio, opzioni)` → `{ attacco, subito, rapporto, tiro }`, con memoria nel bersaglio. |
| `js/banda.js` | Stato della banda a mano (`statoBanda`), costi, `controllaBanda`, salvataggio in localStorage (`mordheim-banda-v1`); `unitaValide` controlla le unità salvate, importate o negli slot. |
| `js/bersaglio.js` | `impostazioni` (bersaglio, turno, opzioni di tiro, obiettivo, pesi...) salvate in `mordheim-impostazioni-v1`; `controllaObiettivo`; `bersagliOttimizzatore()` = bersagli dell'Ottimizzatore (il bersaglio in alto, oppure con `avversari: 'misti'` i bersagli di riferimento in `bersagliMisti`). |
| `js/banda-vista.js` | Disegno della scheda Banda (riepilogo con attacco/resistenza/indice). |
| `js/probabilita.js` | Scheda Probabilità: confronto passo per passo di due gruppi contro il bersaglio. |
| `js/ottimizzatore.js` | Ricerca della banda migliore (vedi sotto). |
| `js/ottimizzatore-vista.js` | Scheda Ottimizzatore: menu `OBIETTIVI`, `PESI_TIRO`, `PESI_CAMPAGNA`, proposte salvate (`mordheim-proposte-v1`), confronto con la banda fatta a mano; `righeConRendimento`, `tabellaUnita` usate anche dal confronto bande. |
| `js/spiegazioni.js` | Testi delle icone "i" (chiavi come `obiettivo`, `valoriProposta`, `indiciBanda`). |
| `js/esporta.js` | Esporta/importa bande, impostazioni e proposte in un `.json`. |
| `js/app.js` | Avvio, collegamento dei comandi (`data-azione`), `aggiornaTutto()`. |
| `js/confronto-bande.js` | Scheda Confronto bande: `impostazioni.slotConfronto` (2 slot `{ bandaId, corone, origine, unita }`), pulsanti `pulsantiSlot` (scheda Banda e proposte), tabella con il migliore in verde; calcola con `valoriBanda` e le scelte dell'Ottimizzatore. |
| `prove/ottimizza.js` | Prova dell'ottimizzatore da riga di comando con Node (vedi sotto). |

## Ottimizzatore (`js/ottimizzatore.js`)

0. **Bersagli**: `ottimizzaBanda` e `valoriBanda` ricevono un elenco di bersagli.
   Ogni candidato ha i valori per bersaglio (`att[k]`, `pAbb[k]`, `vivo[k]`,
   `res[k]`, vedi `completaCandidato`); `valutaGruppi` calcola l'indice contro
   ogni bersaglio e fa la media. La frontiera tiene un candidato se nessun altro
   lo batte contro *tutti* i bersagli, quindi con più bersagli i candidati sono
   molti di più (Reikland: 720 con 1, 3523 con 7) e il calcolo è più lento
   (~9 s a banda con 7 bersagli).
1. **Candidati per tipo di modello**: tutte le combinazioni di equipaggiamento
   (fino a 2 armi da corpo a corpo, 1 da tiro, armatura, scudo/brocchiere,
   elmo); si tengono solo quelle non battute su costo, attacco e resistenza
   (`frontiera`). Animali: solo armi naturali.
2. **Valori di un modello** contro il bersaglio. Si conta **abbattuto** =
   a terra, stordito o fuori combattimento (`pAbbattuto`, `abbattutiPerTurno` in
   js/motore.js): per l'utente conta ferire, quale dei tre esiti esca è
   fortuna e chi è a terra o stordito lo finisce un altro modello (p. 38).
   Gli esiti sono pesati poco diversi (`PESI_ESITI` in js/motore.js: fuori 1,
   stordito 0,9, a terra 0,8, scelti con l'utente il 2026-11-26) per premiare
   un po' chi fa più male: così contano lo stordimento di mazze/martelli e
   l'elmo (con pesi uguali non contavano niente). *attacco* = probabilità di abbattere il bersaglio in un
   turno + `pesoTiro` × abbattuti al tiro; *pAbbattuto* = probabilità di essere
   abbattuto in un turno di attacchi del bersaglio; *resistenza* = 1 / pAbbattuto, al massimo
   `TURNI_PARTITA` (10). Il bonus campagna moltiplica attacco e resistenza dei
   non animali.
3. **Indice** (`indiceObiettivo`), secondo `opzioni.obiettivo`:
   - `duelli` (predefinito, "Uno contro uno in una partita"):
     `abbattutiInPartita` = bersagli abbattuti in media in 10 turni, modello
     contro modello; ogni modello resta in piedi con probabilità
     (1 − pFuori)^t; **test di rotta** (regolamento p. 39): da quando almeno il
     25% dei modelli è fuori combattimento (`Math.ceil(n × 0,25)`, calcolato
     esatto sui modelli indipendenti), a ogni turno si supera con
     P(2D6 ≤ Cd del comandante), altrimenti la partita finisce. Così i modelli
     quasi invulnerabili (Rattorco) non dominano e le bande piccole fuggono prima.
     Non è additivo: `valutaStato` e `valoriBanda` lo calcolano sulla banda intera.
   - `massa` (era `equilibrio`): attacco totale × resistenza totale. Cresce col
     quadrato dei modelli → porta quasi sempre al massimo dei modelli (era il
     difetto segnalato dall'utente). Senza rotta.
   - `attacco`: solo attacco totale.
4. **Ricerca**: ricottura simulata (16 partenze × 15000 passi, seme fisso →
   risultati ripetibili; mosse: aggiungi, togli, cambia un modello, cambia
   l'equipaggiamento di tutto un gruppo), poi `salitaLocale` (prova tutte le
   modifiche vicine: un modello in più o in meno, un gruppo intero con un altro
   equipaggiamento, un modello che diventa un altro; tiene la migliore finché
   migliora), poi `rifinisci`: stesso equipaggiamento per le truppe
   dello stesso tipo (se l'indice cala < 1%), toglie i modelli che valgono
   meno dello 0,5% dell'indice, aggiunge modelli con le corone avanzate solo
   se migliorano l'indice di almeno lo 0,5% (`SOGLIA_MENO_MODELLI`).
   La salita locale parte solo dalle `RIFINITE` (5) migliori ricerche diverse:
   è la parte più lenta.
5. **Proposte**: fino a 3; ordinate per indice, ma tra proposte quasi pari
   (scarto ≤ 0,5%) viene prima quella con meno modelli.

L'utente vuole **il risultato migliore, non il numero massimo di modelli**:
a parità di risultato meno modelli è meglio.

`valoriBanda` calcola gli stessi valori per una banda fatta a mano (scheda
Banda e "La tua banda" nell'Ottimizzatore): se cambi i conti, cambiali in
entrambi i posti.

## Come provare

- Ottimizzatore senza browser:
  `node mordheim/prove/ottimizza.js skaven,posseduti duelli umano`
  (bersaglio: un id, più id separati da virgola o `tutti` per la media)
  (bande vuote o `tutte` = tutte; obiettivo `duelli|massa|attacco`; ~3 s a banda).
  La ricerca non è perfetta: con una ricerca molto più lunga si trova al
  massimo un 2-3% in più (il terreno è a scatti per la soglia di rotta).
- Pagina: aprire `file:///.../mordheim/index.html` con Edge headless
  (`"/c/Program Files (x86)/Microsoft/Edge/Application/msedge.exe" --headless=new --virtual-time-budget=5000 --dump-dom <url>`)
  e controllare che `#errore-caricamento` resti `nascosto`.
- Interfaccia (clic veri): copiare `index.html`, `css/`, `js/`, `dati/` in una
  cartella temporanea; nella copia di `index.html` mettere prima di `js/dati.js` uno
  script che riempie `localStorage` (`mordheim-banda-v1`, `mordheim-impostazioni-v1`)
  e prima di `</body>` uno script che clicca (`[data-azione=...]`) con dei
  `setTimeout` e scrive i risultati in un `<pre>`; aprire con Edge headless
  `--virtual-time-budget` alto (il calcolo dell'Ottimizzatore richiede tempo vero)
  e leggere il `<pre>` dal `--dump-dom`. Scrivere questi script con il Write tool:
  con gli heredoc della shell gli `
` dentro le stringhe si rompono.
- `node --check mordheim/js/*.js` per la sintassi. Python non è installato.

Le proposte salvate hanno nella chiave `VERSIONE_CALCOLO` (in
`js/ottimizzatore-vista.js`): **aumentala quando cambi i conti**, così le
proposte vecchie non si mostrano come attuali.

Risultati di riferimento (bersaglio "umano", corone della banda, obiettivo
`duelli`, calcolo versione 4, pesi 1/0,9/0,8): Reikland 10 modelli (indice
10,30), Middenheim 11 (10,78), Marienburg 13 (12,20), Posseduti 9 (10,64),
Cacciatori 12 (9,45), Sorelle 15 (12,63), Nonmorti 13 (9,68), Skaven 20 (11,02;
10 Ratti giganti, niente Rattorco). Con `massa` quasi tutte al massimo.

Confronto con liste di giocatori trovate sul web (2026-11-26; Dakka Dakka e
Reddit non si leggono in automatico): Skaven del forum EEFL (13 modelli, eroi
con spade) −10% rispetto alla proposta 1; Middenheim del blog Mordheim Treasure
Hunters (13 modelli con alabarda, trombone, archi) −18%; Posseduti "tanti
cultisti" del wiki 2d4chan (Magister in armatura pesante + 10 cultisti con
ascia e scudo) −32% (calcolo versione 4). Le liste dei giocatori non sono per
forza migliori: servono a capire dove guardare. I giocatori comprano oggetti che rendono poco nei conti
(alabarda, trombone, archi senza arma da mischia, armature pesanti) e
considerano cose non calcolate (malapietra, incantesimi, movimento).
