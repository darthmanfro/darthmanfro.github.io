// ==========================================================================
// ESTRAZIONE AUTOMATICA
// Se attiva in configurazione, il pulsante Estrai diventa Play/Pausa:
// Play estrae subito un numero e poi uno ogni "intervalloAutoSec" secondi.
// Si mette in pausa da solo quando compare una possibile vincita, quando
// escono tutti i 90 numeri o quando si apre la configurazione; Reset la ferma.
// ==========================================================================

let autoEstrazioneInCorso = false;
let timerAutoEstrazione = null;
let ultimoClicPlayPausa = 0;
let pausaPerVincita = false;

// Unico gestore del clic sul pulsante Estrai
function premiPulsanteEstrai() {
    if (!impostazioni.autoEstrazione) {
        estraiNumero();
        return;
    }
    // Anche Play/Pausa rispetta il blocco anti doppio clic, contato dall'ultimo
    // clic e non dall'ultima estrazione: la pausa funziona anche appena esce un numero
    const adesso = Date.now();
    if (adesso - ultimoClicPlayPausa < impostazioni.bloccoEstrazioneSec * 1000) return;
    ultimoClicPlayPausa = adesso;

    if (autoEstrazioneInCorso) pausaAutoEstrazione();
    else avviaAutoEstrazione();
}

function avviaAutoEstrazione() {
    if (partita.numeriEstratti.size >= 90) {
        avvisa("Tutti i 90 numeri sono stati estratti!");
        return;
    }
    autoEstrazioneInCorso = true;
    pausaPerVincita = false;
    aggiornaPulsanteEstrai();
    passoAutoEstrazione();
}

// Estrae un numero e, se nel frattempo nulla ha messo in pausa, programma il successivo
function passoAutoEstrazione() {
    timerAutoEstrazione = null;
    if (!autoEstrazioneInCorso) return;

    estraiNumero(); // Una possibile vincita chiama pausaAutoEstrazione() da qui dentro

    if (partita.numeriEstratti.size >= 90) {
        pausaAutoEstrazione();
        return;
    }
    if (autoEstrazioneInCorso) {
        timerAutoEstrazione = setTimeout(passoAutoEstrazione, impostazioni.intervalloAutoSec * 1000);
    }
}

// perVincita = true quando la pausa arriva da una possibile vincita: il pulsante
// resta con il simbolo Pausa (giallo) per far capire che la partita è sospesa
function pausaAutoEstrazione(perVincita = false) {
    pausaPerVincita = perVincita && autoEstrazioneInCorso;
    autoEstrazioneInCorso = false;
    clearTimeout(timerAutoEstrazione);
    timerAutoEstrazione = null;
    aggiornaPulsanteEstrai();
}

// Icona e descrizione del pulsante: freccia (manuale), Play o Pausa (automatica)
function aggiornaPulsanteEstrai() {
    const btn = document.getElementById("btnEstrai");
    if (!btn) return;

    btn.classList.toggle("modalita-auto", impostazioni.autoEstrazione);
    btn.classList.toggle("in-corso", impostazioni.autoEstrazione && autoEstrazioneInCorso);
    btn.classList.toggle("in-pausa-vincita", impostazioni.autoEstrazione && pausaPerVincita);

    if (!impostazioni.autoEstrazione) btn.title = "Estrai Numero (Spazio)";
    else if (autoEstrazioneInCorso) btn.title = "Metti in pausa l'estrazione automatica (Spazio)";
    else if (pausaPerVincita) btn.title = "In pausa per una possibile vincita: premi per riprendere (Spazio)";
    else btn.title = "Avvia l'estrazione automatica (Spazio)";
}
