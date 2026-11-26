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
| `js/banda.js` | Stato della banda a mano (`statoBanda`), costi, `controllaBanda`, salvataggio in localStorage (`mordheim-banda-v1`). |
| `js/bersaglio.js` | `impostazioni` (bersaglio, turno, opzioni di tiro, obiettivo, pesi...) salvate in `mordheim-impostazioni-v1`; `controllaObiettivo`. |
| `js/banda-vista.js` | Disegno della scheda Banda (riepilogo con attacco/resistenza/indice). |
| `js/probabilita.js` | Scheda Probabilità: confronto passo per passo di due gruppi contro il bersaglio. |
| `js/ottimizzatore.js` | Ricerca della banda migliore (vedi sotto). |
| `js/ottimizzatore-vista.js` | Scheda Ottimizzatore: menu `OBIETTIVI`, `PESI_TIRO`, `PESI_CAMPAGNA`, proposte salvate (`mordheim-proposte-v1`), confronto con la banda fatta a mano. |
| `js/spiegazioni.js` | Testi delle icone "i" (chiavi come `obiettivo`, `valoriProposta`, `indiciBanda`). |
| `js/esporta.js` | Esporta/importa bande, impostazioni e proposte in un `.json`. |
| `js/app.js` | Avvio, collegamento dei comandi (`data-azione`), `aggiornaTutto()`. |
| `prove/ottimizza.js` | Prova dell'ottimizzatore da riga di comando con Node (vedi sotto). |

## Ottimizzatore (`js/ottimizzatore.js`)

1. **Candidati per tipo di modello**: tutte le combinazioni di equipaggiamento
   (fino a 2 armi da corpo a corpo, 1 da tiro, armatura, scudo/brocchiere,
   elmo); si tengono solo quelle non battute su costo, attacco e resistenza
   (`frontiera`). Animali: solo armi naturali.
2. **Valori di un modello** contro il bersaglio: *attacco* = probabilità di
   metterlo fuori combattimento in un turno + `pesoTiro` × fuori combattimento
   al tiro; *resistenza* = 1 / probabilità di finire fuori combattimento in un
   turno di attacchi del bersaglio (massimo 50). Il bonus campagna moltiplica
   i valori dei non animali.
3. **Indice** (`indiceObiettivo`), secondo `opzioni.obiettivo`:
   - `duelli` (predefinito dal 2026-11-26): Σ attacco × resistenza per
     modello = bersagli abbattuti prima di cadere, uno contro uno. Non premia
     il numero di modelli di per sé.
   - `massa` (era `equilibrio`): attacco totale × resistenza totale. Cresce col
     quadrato dei modelli → porta quasi sempre al massimo dei modelli (era il
     difetto segnalato dall'utente).
   - `attacco`: solo attacco totale.
4. **Ricerca**: ricottura simulata (8 partenze × 6000 passi, seme fisso →
   risultati ripetibili), poi `rifinisci`: stesso equipaggiamento per le truppe
   dello stesso tipo (se l'indice cala < 1%), toglie i modelli che valgono
   meno dello 0,5% dell'indice, aggiunge modelli con le corone avanzate solo
   se migliorano l'indice di almeno lo 0,5% (`SOGLIA_MENO_MODELLI`).
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
  (bande vuote o `tutte` = tutte; obiettivo `duelli|massa|attacco`; ~0,5 s a banda).
- Pagina: aprire `file:///.../mordheim/index.html` con Edge headless
  (`"/c/Program Files (x86)/Microsoft/Edge/Application/msedge.exe" --headless=new --virtual-time-budget=5000 --dump-dom <url>`)
  e controllare che `#errore-caricamento` resti `nascosto`.
- `node --check mordheim/js/*.js` per la sintassi. Python non è installato.

Risultati di riferimento (bersaglio "umano", corone della banda, obiettivo
`duelli`): Skaven 12 modelli con un Rattorco (con `massa` erano 20, con 11-13
Ratti giganti); Posseduti 8 con 2 Posseduti; Reikland 11; Sorelle e Nonmorti
restano a 14-15 perché lì i modelli economici rendono davvero.
