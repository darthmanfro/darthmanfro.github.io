// ==========================================================================
// TABELLONE ED ESTRAZIONI
// Griglia 1-90, estrazione del numero, schermata del numero con la Smorfia
// e barra degli ultimi estratti.
// ==========================================================================

const NUMERI_STORICO = 5;                 // Quanti ultimi estratti mostrare

let timerOverlay = null;
let estrazioneBloccata = false;

// Crea le celle da 1 a 90 sul tabellone
function creaTabellone() {
    const griglia = document.getElementById("griglia");
    if (!griglia) return;
    griglia.innerHTML = "";

    for (let i = 1; i <= 90; i++) {
        const cella = document.createElement("div");
        cella.className = "cella";
        cella.id = `cella-${i}`;
        cella.textContent = i;
        griglia.appendChild(cella);
    }
}

// Estrae un numero casuale non ancora uscito (pulsante bloccato per il tempo impostato)
function estraiNumero() {
    if (estrazioneBloccata) return;

    if (partita.numeriEstratti.size >= 90) {
        avvisa("Tutti i 90 numeri sono stati estratti!");
        return;
    }

    estrazioneBloccata = true;
    // In estrazione automatica il pulsante resta cliccabile per la Pausa
    const btnEstrai = impostazioni.autoEstrazione ? null : document.getElementById("btnEstrai");
    if (btnEstrai) btnEstrai.disabled = true;

    setTimeout(() => {
        estrazioneBloccata = false;
        if (btnEstrai) btnEstrai.disabled = false;
    }, impostazioni.bloccoEstrazioneSec * 1000);

    // Si sceglie tra i numeri rimasti (js/casuale.js)
    const rimasti = [];
    for (let n = 1; n <= 90; n++) {
        if (!partita.numeriEstratti.has(n)) rimasti.push(n);
    }
    registraEstrazione(rimasti[interoCasuale(rimasti.length)]);
}

function registraEstrazione(numero) {
    if (partita.numeriEstratti.has(numero)) return;

    partita.numeriEstratti.add(numero);

    const cella = document.getElementById(`cella-${numero}`);
    if (cella) cella.classList.add("estratto");

    mostraOverlayNumero(numero);
    aggiornaStorico();
    verificaVinciteAutomatiche();
}

// Toglie un numero dagli estratti (correzione di un errore) e ricalcola tutto
function togliEstrazione(numero) {
    if (!partita.numeriEstratti.delete(numero)) return;

    const cella = document.getElementById(`cella-${numero}`);
    if (cella) cella.classList.remove("estratto");

    if (numeroInOverlay === numero) nascondiOverlayNumero();
    aggiornaStorico();
    ricalcolaVinciteDopoCorrezione();
}

// Pulsante "Annulla ultima estrazione": chiede conferma e toglie l'ultimo numero uscito
async function annullaUltimaEstrazione() {
    const ultimo = Array.from(partita.numeriEstratti).pop();
    if (ultimo === undefined) {
        avvisa("Non ci sono numeri estratti da annullare.");
        return;
    }
    const conferma = await chiedi(`Annullare l'ultimo numero estratto, il ${ultimo}?\nTorna tra quelli da estrarre. I premi già confermati restano assegnati.`,
        { titolo: "Annulla estrazione", si: `Annulla il ${ultimo}`, no: "Lascia", pericolo: true });
    if (conferma) togliEstrazione(ultimo);
}

// --- INSERIMENTO MANUALE ---
// Per chi estrae dal sacchetto vero: con l'opzione attiva in configurazione,
// un clic su una casella segna quel numero (con numero a schermo e Smorfia);
// un clic su una casella già segnata, dopo una conferma, la toglie.

// Un solo ascoltatore sulla griglia: le celle vengono ricreate a ogni nuova partita
function inizializzaClicTabellone() {
    const griglia = document.getElementById("griglia");
    if (griglia) griglia.addEventListener("click", clicSuCasella);
}

async function clicSuCasella(evento) {
    if (!impostazioni.inserimentoManuale) return;
    const cella = evento.target.closest(".cella");
    if (!cella) return;
    const numero = parseInt(cella.textContent, 10);

    if (!partita.numeriEstratti.has(numero)) {
        registraEstrazione(numero);
        return;
    }
    const conferma = await chiedi(`Il ${numero} è già segnato. Vuoi toglierlo dagli estratti?\nI premi già confermati restano assegnati.`,
        { titolo: "Togli numero", si: `Togli il ${numero}`, no: "Lascia", pericolo: true });
    if (conferma) togliEstrazione(numero);
}

// Le caselle sembrano cliccabili solo quando l'opzione è attiva (css/tabellone.css)
function aggiornaInserimentoManuale() {
    document.body.classList.toggle("inserimento-manuale", impostazioni.inserimentoManuale);
}

let numeroInOverlay = null;

function nascondiOverlayNumero() {
    clearTimeout(timerOverlay);
    timerOverlay = null;
    numeroInOverlay = null;
    const overlay = document.getElementById("overlay-numero");
    if (overlay) overlay.classList.remove("mostra");
}

// Mostra il numero a tutto schermo; ogni nuovo numero riparte con la durata piena
function mostraOverlayNumero(num) {
    const overlay = document.getElementById("overlay-numero");
    if (!overlay) return;

    if (timerOverlay) {
        clearTimeout(timerOverlay);
        timerOverlay = null;
    }
    numeroInOverlay = num;

    const infoSmorfia = smorfia[num] ? smorfia[num][impostazioni.lingua] : "";

    overlay.innerHTML = `
        <div class="overlay-num">${num}</div>
        <div class="overlay-smorfia">${infoSmorfia}</div>
    `;
    overlay.classList.add("mostra");

    timerOverlay = setTimeout(nascondiOverlayNumero, impostazioni.durataNumeroSec * 1000);
}

// Aggiorna gli ultimi numeri estratti nella barra (dal più recente)
function aggiornaStorico() {
    const contatore = document.getElementById("contatore-estratti");
    if (contatore) contatore.textContent = `/ ${partita.numeriEstratti.size}`;

    const container = document.getElementById("storico-numeri");
    if (!container) return;

    const ultimi = Array.from(partita.numeriEstratti).slice(-NUMERI_STORICO).reverse();
    if (ultimi.length === 0) {
        container.innerHTML = '<span class="storico-empty">Nessuno</span>';
        return;
    }

    container.innerHTML = "";
    ultimi.forEach(n => {
        const badge = document.createElement("span");
        badge.className = "storico-badge";
        badge.textContent = n;
        container.appendChild(badge);
    });
}
