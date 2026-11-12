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
        alert("Tutti i 90 numeri sono stati estratti!");
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

// Mostra il numero a tutto schermo; ogni nuovo numero riparte con la durata piena
function mostraOverlayNumero(num) {
    const overlay = document.getElementById("overlay-numero");
    if (!overlay) return;

    if (timerOverlay) {
        clearTimeout(timerOverlay);
        timerOverlay = null;
    }

    const infoSmorfia = smorfia[num] ? smorfia[num][impostazioni.lingua] : "";

    overlay.innerHTML = `
        <div class="overlay-num">${num}</div>
        <div class="overlay-smorfia">${infoSmorfia}</div>
    `;
    overlay.classList.add("mostra");

    timerOverlay = setTimeout(() => {
        overlay.classList.remove("mostra");
        timerOverlay = null;
    }, impostazioni.durataNumeroSec * 1000);
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
