// ==========================================================================
// PARTITA SALVATA NEL BROWSER
// A ogni cambiamento (estrazione, premio, conferma, cartelle caricate) lo
// stato della partita viene copiato nell'archivio del browser (localStorage).
// Se la pagina si chiude o si ricarica, alla riapertura si chiede se
// riprendere la partita interrotta.
// Il salvataggio parte solo dopo la risposta: così la partita salvata non
// viene sovrascritta mentre la domanda è ancora aperta.
// ==========================================================================

const CHIAVE_ARCHIVIO_PARTITA = "tombola-partita";
const VERSIONE_SALVATAGGIO = 1;

let salvataggioPartitaAttivo = false;

// Chiamata da verificaVinciteAutomatiche(), da cui passa ogni cambiamento della partita
function salvaPartitaNelBrowser() {
    if (!salvataggioPartitaAttivo) return;
    const dati = {
        versione: VERSIONE_SALVATAGGIO,
        salvataIl: new Date().toISOString(),
        numeriEstratti: Array.from(partita.numeriEstratti), // In ordine di uscita
        premiAttivi: partita.premiAttivi,
        indicePremioAttuale: partita.indicePremioAttuale,
        premiAssegnati: Array.from(partita.premiAssegnati),
        vincitori: partita.vincitori,
        premioInChiusura: partita.premioInChiusura,
        cartelleCaricate: partita.cartelleCaricate,
        cartelleScartatePerPremio: Array.from(partita.cartelleScartatePerPremio),
        vinciteGiaSegnalate: Array.from(partita.vinciteGiaSegnalate)
    };
    try {
        localStorage.setItem(CHIAVE_ARCHIVIO_PARTITA, JSON.stringify(dati));
    } catch (e) {
        // Archivio del browser non disponibile o pieno: si gioca senza salvataggio
    }
}

// Partita salvata, controllata campo per campo; null se manca o non è valida
function leggiPartitaSalvata() {
    let dati;
    try {
        dati = JSON.parse(localStorage.getItem(CHIAVE_ARCHIVIO_PARTITA));
    } catch (e) {
        return null;
    }
    if (!dati || dati.versione !== VERSIONE_SALVATAGGIO) return null;

    const numeri = dati.numeriEstratti;
    if (!Array.isArray(numeri) || new Set(numeri).size !== numeri.length
        || !numeri.every(n => Number.isInteger(n) && n >= 1 && n <= 90)) return null;

    const premiAttivi = Array.isArray(dati.premiAttivi) ? dati.premiAttivi.filter(p => PREMI.includes(p)) : [];
    if (premiAttivi.length === 0) return null;

    const cartelle = Array.isArray(dati.cartelleCaricate) ? controllaCartelle(dati.cartelleCaricate) : { cartelle: [] };
    if (cartelle.errore) return null;

    const elencoTesti = v => (Array.isArray(v) ? v.filter(x => typeof x === "string") : []);
    const indice = Number.isInteger(dati.indicePremioAttuale) && dati.indicePremioAttuale < premiAttivi.length
        ? dati.indicePremioAttuale : 0;
    const chiusura = dati.premioInChiusura;

    return {
        salvataIl: dati.salvataIl,
        numeriEstratti: numeri,
        premiAttivi,
        indicePremioAttuale: Math.max(0, indice),
        premiAssegnati: elencoTesti(dati.premiAssegnati).filter(p => PREMI.includes(p)),
        vincitori: Array.isArray(dati.vincitori)
            ? dati.vincitori.filter(v => v && PREMI.includes(v.premio) && Number.isInteger(v.cartellaId))
                .map(v => ({ premio: v.premio, cartellaId: v.cartellaId }))
            : [],
        premioInChiusura: chiusura && PREMI.includes(chiusura.premio) && Number.isInteger(chiusura.estratti)
            ? { premio: chiusura.premio, estratti: chiusura.estratti } : null,
        cartelleCaricate: cartelle.cartelle,
        cartelleScartatePerPremio: elencoTesti(dati.cartelleScartatePerPremio),
        vinciteGiaSegnalate: elencoTesti(dati.vinciteGiaSegnalate)
    };
}

// All'avvio: se c'è una partita interrotta chiede se riprenderla, poi attiva il salvataggio
async function proponiRipresaPartita() {
    const salvata = leggiPartitaSalvata();
    if (salvata && (salvata.numeriEstratti.length > 0 || salvata.cartelleCaricate.length > 0)) {
        const quando = salvata.salvataIl ? new Date(salvata.salvataIl) : null;
        const testoData = quando && !isNaN(quando)
            ? ` (salvata il ${quando.toLocaleString("it-IT", { dateStyle: "short", timeStyle: "short" })})` : "";
        const riprendi = await chiedi(
            `C'è una partita interrotta${testoData}:\n`
            + `${salvata.numeriEstratti.length} numeri estratti, ${salvata.cartelleCaricate.length} cartelle caricate.\n`
            + "Vuoi riprenderla?",
            { titolo: "Riprendere la partita?", si: "Riprendi", no: "Nuova partita" });
        if (riprendi) ripristinaPartita(salvata);
    }
    salvataggioPartitaAttivo = true;
    salvaPartitaNelBrowser();
}

function ripristinaPartita(salvata) {
    partita.numeriEstratti = new Set(salvata.numeriEstratti);
    partita.premiAttivi = salvata.premiAttivi;
    partita.indicePremioAttuale = salvata.indicePremioAttuale;
    partita.premiAssegnati = new Set(salvata.premiAssegnati);
    partita.vincitori = salvata.vincitori;
    partita.premioInChiusura = salvata.premioInChiusura;
    partita.cartelleCaricate = salvata.cartelleCaricate;
    partita.cartelleScartatePerPremio = new Set(salvata.cartelleScartatePerPremio);
    partita.vinciteGiaSegnalate = new Set(salvata.vinciteGiaSegnalate);

    creaTabellone();
    partita.numeriEstratti.forEach(n => {
        const cella = document.getElementById(`cella-${n}`);
        if (cella) cella.classList.add("estratto");
    });
    aggiornaStorico();
    aggiornaStatoPartita();
    aggiornaInterfacciaPremio(); // Ricalcola la lampadina (le vincite già annunciate non suonano di nuovo)
}
