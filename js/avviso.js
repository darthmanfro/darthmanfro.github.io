// ==========================================================================
// AVVISO NUOVA POSSIBILE VINCITA
// Segnale breve e senza testo: una scintilla nell'angolo del tabellone
// (sopra la lampadina) e, se attivo, un "ding" generato dal browser.
// Non dice né il premio né la cartella: chi guarda il maxischermo vede solo
// che "è successo qualcosa", la verifica resta all'operatore.
// ==========================================================================

const DURATA_SCINTILLA_MS = 1600;
const PARTICELLE_SCINTILLA = 10; // Le direzioni sono definite in css/vincite.css (nth-child)

let timerScintilla = null;
let contestoAudio = null;

function segnalaNuovaVincita() {
    pausaAutoEstrazione(true); // L'operatore deve verificare prima di proseguire
    mostraScintilla();
    if (impostazioni.suonoVincite) suonaAvviso();
}

// --- SEGNALE VISIVO ---

function mostraScintilla() {
    const box = document.getElementById("scintilla-vincita");
    if (!box) return;

    // Stella centrale + particelle disposte a raggiera
    box.innerHTML = '<span class="scintilla-stella">✦</span>'
        + '<span class="scintilla-particella"></span>'.repeat(PARTICELLE_SCINTILLA);

    // Riavvia l'animazione anche se la scintilla precedente non era finita
    box.classList.remove("attiva");
    void box.offsetWidth;
    box.classList.add("attiva");

    clearTimeout(timerScintilla);
    timerScintilla = setTimeout(() => {
        box.classList.remove("attiva");
        box.innerHTML = "";
    }, DURATA_SCINTILLA_MS);
}

// --- SEGNALE SONORO ---
// Due note brevi e morbide (tipo campanello), create con Web Audio:
// nessun file audio, funziona anche offline.
function suonaAvviso() {
    try {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (!AudioCtx) return;
        if (!contestoAudio) contestoAudio = new AudioCtx();
        if (contestoAudio.state === "suspended") contestoAudio.resume();

        const adesso = contestoAudio.currentTime;
        suonaNota(880, adesso, 0.35);          // La
        suonaNota(1318.5, adesso + 0.12, 0.5); // Mi, un'ottava e una quinta sopra
    } catch (e) {
        // Audio non disponibile: resta solo il segnale visivo
    }
}

function suonaNota(frequenza, inizio, durata) {
    const osc = contestoAudio.createOscillator();
    const volume = contestoAudio.createGain();

    osc.type = "sine";
    osc.frequency.value = frequenza;

    // Attacco rapido e coda che sfuma, volume contenuto
    volume.gain.setValueAtTime(0.0001, inizio);
    volume.gain.exponentialRampToValueAtTime(0.18, inizio + 0.02);
    volume.gain.exponentialRampToValueAtTime(0.0001, inizio + durata);

    osc.connect(volume);
    volume.connect(contestoAudio.destination);
    osc.start(inizio);
    osc.stop(inizio + durata + 0.05);
}
