// ==========================================================================
// PREMIO IN PALIO
// Indicatore nella barra (Ambo, Terno, ...) e passaggio al premio successivo.
// ==========================================================================

// Premio attualmente in palio, oppure null se non ce ne sono
function premioInPalio() {
    return partita.premiAttivi.length > 0
        ? partita.premiAttivi[partita.indicePremioAttuale]
        : null;
}

function avanzaPremio() {
    if (partita.premiAttivi.length === 0) return;
    partita.indicePremioAttuale = (partita.indicePremioAttuale + 1) % partita.premiAttivi.length;
    aggiornaInterfacciaPremio();
}

// Dopo una vincita confermata: salta i premi già assegnati
function avanzaAlPremioDaAssegnare() {
    const totale = partita.premiAttivi.length;
    for (let passo = 1; passo <= totale; passo++) {
        const indice = (partita.indicePremioAttuale + passo) % totale;
        if (!partita.premiAssegnati.has(partita.premiAttivi[indice])) {
            partita.indicePremioAttuale = indice;
            break;
        }
    }
    aggiornaInterfacciaPremio();
}

// Tutti i premi in gioco sono stati confermati
function tuttiPremiAssegnati() {
    return partita.premiAttivi.length > 0
        && partita.premiAttivi.every(p => partita.premiAssegnati.has(p));
}

function aggiornaInterfacciaPremio() {
    const badgePremio = document.getElementById("premio-attuale");
    if (badgePremio) badgePremio.textContent = tuttiPremiAssegnati() ? "FINITA" : (premioInPalio() || "NESSUNO");

    // Il premio in palio è cambiato: ricalcola le possibili vincite
    verificaVinciteAutomatiche();
}
