// ==========================================================================
// SCHERMO INTERO E SCHERMO SEMPRE ACCESO
// - Pulsante (e tasto F) per mettere la Tombola a schermo intero, comodo su
//   TV e proiettore. Dove il browser non lo permette (es. iPhone) il
//   pulsante non compare.
// - Finché la pagina è aperta e visibile si chiede al sistema di non
//   spegnere lo schermo (Wake Lock), così durante l'estrazione automatica
//   il monitor non va in standby. Dove non è supportato non succede nulla.
// ==========================================================================

let bloccoSchermo = null;

function inizializzaSchermo() {
    const btn = document.getElementById("btnSchermoIntero");
    if (btn) btn.classList.toggle("nascosto", !document.fullscreenEnabled);
    document.addEventListener("fullscreenchange", aggiornaPulsanteSchermoIntero);

    tieniSchermoAcceso();
    // Il sistema toglie il blocco quando la pagina viene nascosta: si richiede al ritorno
    document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "visible") tieniSchermoAcceso();
    });

    document.addEventListener("keydown", (e) => {
        if (e.key.toLowerCase() !== "f" || e.ctrlKey || e.altKey || e.metaKey || e.repeat) return;
        if (["INPUT", "SELECT", "TEXTAREA"].includes(e.target.tagName)) return;
        if (document.querySelector(".modal-overlay.visibile")) return;
        toggleSchermoIntero();
    });
}

function toggleSchermoIntero() {
    if (!document.fullscreenEnabled) return;
    if (document.fullscreenElement) {
        document.exitFullscreen().catch(() => {});
    } else {
        document.documentElement.requestFullscreen().catch(() => {});
    }
}

function aggiornaPulsanteSchermoIntero() {
    const btn = document.getElementById("btnSchermoIntero");
    if (!btn) return;
    const attivo = !!document.fullscreenElement;
    btn.classList.toggle("attivo", attivo);
    btn.title = attivo ? "Esci dallo schermo intero (F)" : "Schermo intero (F)";
    const testo = btn.querySelector(".voce-menu-testo");
    if (testo) testo.textContent = attivo ? "Esci da schermo intero" : "Schermo intero";
}

async function tieniSchermoAcceso() {
    if (!("wakeLock" in navigator) || document.visibilityState !== "visible") return;
    if (bloccoSchermo && !bloccoSchermo.released) return;
    try {
        bloccoSchermo = await navigator.wakeLock.request("screen");
    } catch (e) {
        // Rifiutato (es. batteria scarica): lo schermo segue le impostazioni del sistema
        bloccoSchermo = null;
    }
}
