// ==========================================================================
// FINESTRE DI AVVISO E DI CONFERMA
// Sostituiscono alert() e confirm() del browser: hanno lo stile dell'app e
// non bloccano la pagina (con alert() si fermavano anche i timer, per
// esempio la scomparsa del numero a schermo).
//   avvisa(testo)          -> Promise che si risolve alla chiusura
//   chiedi(testo, opzioni) -> Promise<boolean>: true = conferma, false = annulla
// Se una finestra è già aperta, la successiva aspetta il suo turno.
// Mentre una finestra è aperta l'estrazione automatica va in pausa.
// ==========================================================================

let codaDialoghi = Promise.resolve();

function avvisa(testo, opzioni = {}) {
    return mostraDialogo({ titolo: opzioni.titolo || "Tombola", testo, si: opzioni.ok || "OK", no: null });
}

// opzioni: titolo, si (testo del pulsante di conferma), no (testo di annulla),
// pericolo (true: conferma rossa e il tasto Invio sceglie Annulla)
function chiedi(testo, opzioni = {}) {
    return mostraDialogo({
        titolo: opzioni.titolo || "Conferma",
        testo,
        si: opzioni.si || "OK",
        no: opzioni.no || "Annulla",
        pericolo: !!opzioni.pericolo
    });
}

function dialogoAperto() {
    return document.getElementById("modal-dialogo").classList.contains("visibile");
}

function mostraDialogo(config) {
    const turno = codaDialoghi.then(() => apriDialogo(config));
    codaDialoghi = turno.catch(() => {});
    return turno;
}

function apriDialogo({ titolo, testo, si, no, pericolo }) {
    const finestra = document.getElementById("modal-dialogo");
    const btnSi = document.getElementById("btnDialogoSi");
    const btnNo = document.getElementById("btnDialogoNo");
    const focusPrecedente = document.activeElement;

    if (typeof autoEstrazioneInCorso !== "undefined" && autoEstrazioneInCorso) pausaAutoEstrazione();

    document.getElementById("dialogo-titolo").textContent = titolo;
    document.getElementById("dialogo-testo").textContent = testo;
    btnSi.textContent = si;
    btnSi.classList.toggle("btn-pericolo", !!pericolo);
    btnNo.textContent = no || "";
    btnNo.classList.toggle("nascosto", !no);
    // Pulsante premuto con Esc (js/tastiera.js): Annulla se c'è, altrimenti OK
    finestra.dataset.esc = no ? "btnDialogoNo" : "btnDialogoSi";

    finestra.classList.add("visibile");
    (pericolo && no ? btnNo : btnSi).focus();

    return new Promise(risolvi => {
        const chiudi = (risposta) => {
            btnSi.onclick = null;
            btnNo.onclick = null;
            finestra.classList.remove("visibile");
            if (focusPrecedente && typeof focusPrecedente.focus === "function") focusPrecedente.focus();
            risolvi(risposta);
        };
        btnSi.onclick = () => chiudi(true);
        btnNo.onclick = () => chiudi(false);
    });
}
