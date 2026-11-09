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

function aggiornaInterfacciaPremio() {
    const badgePremio = document.getElementById("premio-attuale");
    if (badgePremio) badgePremio.textContent = premioInPalio() || "NESSUNO";

    // Il premio in palio è cambiato: ricalcola le possibili vincite
    verificaVinciteAutomatiche();
}
