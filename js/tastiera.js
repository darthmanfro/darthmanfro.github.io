// ==========================================================================
// SCORCIATOIE DA TASTIERA
// Comode con il computer collegato al proiettore o con un telecomando da
// presentazione (che di solito manda frecce, Invio o Spazio):
//   Spazio / Invio   Estrai (o Play/Pausa in estrazione automatica)
//   → / ←            Premio successivo / precedente
//   Backspace, Ctrl+Z Annulla ultima estrazione (chiede conferma)
//   Esc              Chiude la finestra aperta, il pannellino vincite o il menu ☰
// Con una finestra aperta valgono solo Esc e i tasti normali del browser.
// Ogni finestra indica con data-esc l'id del pulsante da premere con Esc.
// ==========================================================================

document.addEventListener("keydown", gestisciTasto);

function gestisciTasto(e) {
    const finestra = finestraInCima();

    if (e.key === "Escape") {
        if (finestra) {
            const pulsante = finestra.dataset.esc && document.getElementById(finestra.dataset.esc);
            if (pulsante) pulsante.click();
        } else {
            chiudiPannelloVincite();
            chiudiMenuServizio();
        }
        e.preventDefault();
        return;
    }

    if (finestra || e.altKey || e.metaKey || campoDiTesto(e.target)) return;

    if (e.key === " " || e.key === "Enter") {
        // Niente clic sul pulsante che ha il focus (per esempio l'ingranaggio appena usato)
        e.preventDefault();
        if (!e.repeat) premiPulsanteEstrai();
    } else if (e.key === "ArrowRight") {
        e.preventDefault();
        avanzaPremio();
    } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        arretraPremio();
    } else if (e.key === "Backspace" || (e.ctrlKey && e.key.toLowerCase() === "z")) {
        e.preventDefault();
        if (!e.repeat) annullaUltimaEstrazione();
    }
}

// La finestra visibile più in alto (avvisi sopra "Cosa vuoi caricare?", sopra le altre)
function finestraInCima() {
    const aperte = Array.from(document.querySelectorAll(".modal-overlay.visibile"));
    if (aperte.length === 0) return null;
    return aperte.reduce((sopra, f) =>
        (parseInt(getComputedStyle(f).zIndex, 10) || 0) > (parseInt(getComputedStyle(sopra).zIndex, 10) || 0) ? f : sopra);
}

function campoDiTesto(el) {
    return !!el && (el.isContentEditable || ["INPUT", "SELECT", "TEXTAREA"].includes(el.tagName));
}
