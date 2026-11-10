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

// Ricalcola le possibili vincite per il premio in palio e aggiorna la lampadina
function verificaVinciteAutomatiche() {
    partita.possibiliVincite = [];

    const premio = premioInPalio();
    if (premio && partita.cartelleCaricate.length > 0 && !partita.premiAssegnati.has(premio)) {
        for (const cartella of partita.cartelleCaricate) {
            if (partita.cartelleScartatePerPremio.has(chiaveScarto(cartella.id, premio))) continue;
            const numeri = trovaNumeriVincenti(cartella, premio);
            if (numeri) partita.possibiliVincite.push({ premio, cartellaId: cartella.id, numeri });
        }
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
    if (nuove) segnalaNuovaVincita();
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
    titolo.textContent = vincite.length > 0 ? `${vincite[0].premio}: da verificare` : "";

    lista.innerHTML = vincite.map(v => `
        <div class="vincita-riga">
            <div class="vincita-info">
                <span class="vincita-cartella">Cartella N. ${v.cartellaId}</span>
                <span class="vincita-numeri">${v.numeri.join(', ')}</span>
            </div>
            <div class="vincita-azioni">
                <button type="button" class="btn-vincita-ok" onclick="confermaVincita(${v.cartellaId})" title="Conferma la vincita e passa al premio successivo">Conferma</button>
                <button type="button" class="btn-vincita-no" onclick="scartaCartellaInvenduta(${v.cartellaId})" title="Cartella non venduta: ignorala per questo premio">Invenduta</button>
            </div>
        </div>
    `).join('');
}

function confermaVincita(cartellaId) {
    const vincita = partita.possibiliVincite.find(v => v.cartellaId === cartellaId);
    if (!vincita) return;
    partita.premiAssegnati.add(vincita.premio);
    chiudiPannelloVincite();
    avanzaAlPremioDaAssegnare(); // Passa al prossimo premio non ancora vinto e ricalcola le vincite
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
    const wrapper = document.querySelector(".spia-wrapper");
    if (wrapper && !wrapper.contains(e.target)) chiudiPannelloVincite();
});
