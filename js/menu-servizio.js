// ==========================================================================
// MENU DI SERVIZIO (☰)
// Su cellulare cartelle, configurazione e nuova partita stanno in una tendina.
// Su schermi larghi il pulsante ☰ è nascosto e i comandi restano in fila (css/barra.css).
// ==========================================================================

function toggleMenuServizio() {
    document.getElementById("menu-servizio").classList.toggle("aperto");
}

function chiudiMenuServizio() {
    document.getElementById("menu-servizio").classList.remove("aperto");
}

// Chiude la tendina cliccando fuori
document.addEventListener("click", (e) => {
    const menu = document.getElementById("menu-servizio");
    if (menu && menu.classList.contains("aperto") && !menu.contains(e.target)) chiudiMenuServizio();
});
