// ==========================================================================
// AVVIO E NUOVA PARTITA
// Caricato per ultimo: a questo punto tutte le funzioni degli altri file esistono.
// ==========================================================================

document.addEventListener("DOMContentLoaded", () => {
    creaTabellone();
    aggiornaInterfacciaPremio();
    aggiornaPulsanteEstrai();
    inizializzaGraficaCartelle();
    inizializzaGraficaTabellone();
});

// Azzera tabellone, storico e premi; le cartelle caricate restano in memoria
async function nuovaPartita() {
    const conferma = await chiedi("Vuoi iniziare una nuova partita? Il tabellone e i premi in palio vengono azzerati.",
        { titolo: "Nuova partita", si: "Nuova partita", pericolo: true });
    if (!conferma) return;

    pausaAutoEstrazione(); // Reset fa anche da Stop

    partita.numeriEstratti.clear();
    partita.premiAssegnati.clear();
    partita.cartelleScartatePerPremio.clear();
    partita.vinciteGiaSegnalate.clear();
    partita.indicePremioAttuale = 0;

    creaTabellone();
    aggiornaStorico();
    aggiornaInterfacciaPremio(); // Ricalcola anche le vincite e spegne la lampadina
}
