// ==========================================================================
// CONTROLLO AUTOMATICO VINCITE (PROMEMORIA DISCRETO)
// Le possibili vincite non vengono mai mostrate in grande sul tabellone:
// si accende una lampadina nella barra e il dettaglio si apre solo cliccandola.
// Così sul maxischermo non compaiono vincite non verificate
// (cartella invenduta, file JSON sbagliato, ecc.).
// ==========================================================================

// Imposta le cartelle da controllare (da file JSON o direttamente dal generatore)
function impostaCartellePartita(cartelle) {
    partita.cartelleCaricate = cartelle;
    partita.premiAssegnati.clear();
    partita.vincitori = [];
    partita.premioInChiusura = null;
    partita.cartelleScartatePerPremio.clear();
    partita.vinciteGiaSegnalate.clear();
    aggiornaStatoPartita();
    verificaVinciteAutomatiche();
}

// Restituisce i numeri vincenti della cartella per il premio, oppure null
function trovaNumeriVincenti(cartella, premio) {
    const target = SOGLIA_PREMIO[premio];
    if (!target) return null;

    if (premio === 'TOMBOLA') {
        const indovinati = cartella.numeri.filter(n => partita.numeriEstratti.has(n));
        return indovinati.length === 15 ? indovinati : null;
    }

    // Ambo, Terno, Quaterna, Cinquina: controllo per riga
    for (let r = 0; r < 3; r++) {
        const numeriRiga = cartella.griglia[r].filter(n => n !== null); // I 5 numeri della riga

        if (impostazioni.numeriAdiacentiRichiesti) {
            // Servono 'target' numeri consecutivi estratti tra quelli della riga
            for (let i = 0; i <= numeriRiga.length - target; i++) {
                const sub = numeriRiga.slice(i, i + target);
                if (sub.every(n => partita.numeriEstratti.has(n))) return sub;
            }
        } else {
            // Verifica classica (anche non adiacenti)
            const indovinati = numeriRiga.filter(n => partita.numeriEstratti.has(n));
            if (indovinati.length >= target) return indovinati;
        }
    }
    return null;
}

// Chiave usata per ricordare che una cartella è invenduta per un certo premio
function chiaveScarto(cartellaId, premio) {
    return `${cartellaId}-${premio}`;
}

// Dopo aver tolto un numero estratto: le vincite che non ci sono più vanno
// dimenticate, così se si ripresentano scintilla e suono tornano a farsi sentire.
// Quelle ancora valide non vengono annunciate di nuovo.
function ricalcolaVinciteDopoCorrezione() {
    partita.vinciteGiaSegnalate.clear();
    verificaVinciteAutomatiche({ silenzioso: true });
}

// Ricalcola le possibili vincite per il premio in palio e aggiorna la lampadina.
// silenzioso: registra le vincite trovate senza scintilla, suono e pausa
function verificaVinciteAutomatiche({ silenzioso = false } = {}) {
    partita.possibiliVincite = [];

    // Premio diviso: si chiude appena cambiano i numeri estratti (le altre
    // cartelle avevano vinto solo con quel numero) e si passa al successivo
    const chiusura = partita.premioInChiusura;
    if (chiusura && chiusura.estratti !== partita.numeriEstratti.size) {
        chiudiPremioDiviso();
        return;
    }

    const premio = premioInPalio();
    if (premio && partita.cartelleCaricate.length > 0 && (chiusura || !partita.premiAssegnati.has(premio))) {
        for (const cartella of partita.cartelleCaricate) {
            if (partita.cartelleScartatePerPremio.has(chiaveScarto(cartella.id, premio))) continue;
            if (haVinto(cartella.id, premio)) continue;
            const numeri = trovaNumeriVincenti(cartella, premio);
            if (numeri) partita.possibiliVincite.push({ premio, cartellaId: cartella.id, numeri });
        }
    }

    // Premio diviso: tutte le altre cartelle confermate o scartate
    if (chiusura && partita.possibiliVincite.length === 0) {
        chiudiPremioDiviso();
        return;
    }

    aggiornaSpiaVincite();

    // Scintilla e suono solo per le vincite comparse adesso, non a ogni ricalcolo
    let nuove = false;
    partita.possibiliVincite.forEach(v => {
        const chiave = chiaveScarto(v.cartellaId, v.premio);
        if (!partita.vinciteGiaSegnalate.has(chiave)) {
            partita.vinciteGiaSegnalate.add(chiave);
            nuove = true;
        }
    });
    if (nuove && !silenzioso) segnalaNuovaVincita();
}

// --- LAMPADINA ---

function aggiornaSpiaVincite() {
    const spia = document.getElementById("spia-vincite");
    const contatore = document.getElementById("spia-contatore");
    if (!spia) return;

    const quante = partita.possibiliVincite.length;
    const accesa = quante > 0;

    // Senza cartelle caricate la lampadina non viene proprio mostrata
    spia.classList.toggle("inattiva", partita.cartelleCaricate.length === 0);
    spia.classList.toggle("accesa", accesa);
    if (contatore) contatore.textContent = accesa ? quante : "";
    spia.title = accesa
        ? `Vincite da verificare: ${quante} (clicca per i dettagli)`
        : "Nessuna vincita da verificare";

    if (!accesa) {
        chiudiPannelloVincite();
    } else if (pannelloVinciteAperto()) {
        renderPannelloVincite();
    }
}

// --- PANNELLINO DI VERIFICA ---

function pannelloVinciteAperto() {
    const pannello = document.getElementById("pannello-vincite");
    return !!pannello && pannello.classList.contains("visibile");
}

function togglePannelloVincite() {
    if (pannelloVinciteAperto()) {
        chiudiPannelloVincite();
        return;
    }
    if (partita.possibiliVincite.length === 0) return;
    renderPannelloVincite();
    document.getElementById("pannello-vincite").classList.add("visibile");
}

function chiudiPannelloVincite() {
    const pannello = document.getElementById("pannello-vincite");
    if (pannello) pannello.classList.remove("visibile");
}

function renderPannelloVincite() {
    const titolo = document.getElementById("pannello-vincite-titolo");
    const lista = document.getElementById("pannello-vincite-lista");
    if (!titolo || !lista) return;

    const vincite = partita.possibiliVincite;
    const chiusura = partita.premioInChiusura;
    if (vincite.length === 0) titolo.textContent = "";
    else if (chiusura) titolo.textContent = `${chiusura.premio} diviso? Altre cartelle da verificare`;
    else titolo.textContent = `${vincite[0].premio}: da verificare`;

    // Con il premio già assegnato a una cartella, si vede a chi e si può chiudere senza dividerlo
    const intestazione = chiusura ? `
        <div class="vincita-divisa-info">
            <span>Già confermata: cartella N. ${vincitoriDelPremio(chiusura.premio).join(", ")}</span>
            <button type="button" class="btn-vincita-chiudi" onclick="chiudiPremioDiviso()" title="Non dividere il premio e passa al successivo">Non diviso</button>
        </div>` : "";

    lista.innerHTML = intestazione + vincite.map(v => `
        <div class="vincita-riga">
            <div class="vincita-info">
                <span class="vincita-cartella">Cartella N. ${v.cartellaId}</span>
                <span class="vincita-numeri">${v.numeri.join(', ')}</span>
            </div>
            <div class="vincita-azioni">
                <button type="button" class="btn-vincita-ok" onclick="confermaVincita(${v.cartellaId})" title="${chiusura ? "Conferma anche questa cartella: il premio viene diviso" : "Conferma la vincita"}">Conferma</button>
                <button type="button" class="btn-vincita-no" onclick="scartaCartellaInvenduta(${v.cartellaId})" title="Cartella non venduta: ignorala per questo premio">Invenduta</button>
            </div>
        </div>
    `).join('');
}

// --- CONFERMA, PREMIO DIVISO, CARTELLA INVENDUTA ---

function haVinto(cartellaId, premio) {
    return partita.vincitori.some(v => v.cartellaId === cartellaId && v.premio === premio);
}

function vincitoriDelPremio(premio) {
    return partita.vincitori.filter(v => v.premio === premio).map(v => v.cartellaId);
}

// Se altre cartelle hanno vinto lo stesso premio con lo stesso numero, il
// premio resta aperto per loro (premio diviso); altrimenti si passa al successivo
function confermaVincita(cartellaId) {
    const vincita = partita.possibiliVincite.find(v => v.cartellaId === cartellaId);
    if (!vincita) return;
    partita.premiAssegnati.add(vincita.premio);
    partita.vincitori.push({ premio: vincita.premio, cartellaId });

    const altre = partita.possibiliVincite.some(v => v.premio === vincita.premio && v.cartellaId !== cartellaId);
    if (altre) {
        partita.premioInChiusura = { premio: vincita.premio, estratti: partita.numeriEstratti.size };
        verificaVinciteAutomatiche(); // Il pannellino resta aperto con le altre cartelle
        return;
    }
    partita.premioInChiusura = null;
    chiudiPannelloVincite();
    avanzaAlPremioDaAssegnare(); // Passa al prossimo premio non ancora vinto e ricalcola le vincite
}

// Fine del premio diviso: nessun'altra cartella da verificare, "Non diviso",
// oppure è uscito un altro numero
function chiudiPremioDiviso() {
    if (!partita.premioInChiusura) return;
    partita.premioInChiusura = null;
    chiudiPannelloVincite();
    avanzaAlPremioDaAssegnare();
}

function scartaCartellaInvenduta(cartellaId) {
    const vincita = partita.possibiliVincite.find(v => v.cartellaId === cartellaId);
    if (!vincita) return;
    // La cartella non verrà più segnalata per questo premio
    partita.cartelleScartatePerPremio.add(chiaveScarto(cartellaId, vincita.premio));
    verificaVinciteAutomatiche();
}

// Chiude il pannellino cliccando fuori
document.addEventListener("click", (e) => {
    if (!pannelloVinciteAperto()) return;
    // Un pulsante appena ridisegnato dal pannellino non è più nella pagina: non è un clic fuori
    if (!e.target.isConnected) return;
    const wrapper = document.querySelector(".spia-wrapper");
    if (wrapper && !wrapper.contains(e.target)) chiudiPannelloVincite();
});
