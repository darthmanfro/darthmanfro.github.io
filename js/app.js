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
function nuovaPartita() {
    if (!confirm("Vuoi iniziare una nuova partita resettando il tabellone e azzerando i premi in palio?")) return;

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
