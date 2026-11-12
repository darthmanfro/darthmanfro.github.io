// ==========================================================================
// RIEPILOGO DEI NUMERI ESTRATTI
// Cliccando gli ultimi estratti (o il contatore "/ 12") si apre l'elenco
// completo in ordine di uscita, o in ordine crescente, con le vincite già
// confermate. Serve quando un giocatore contesta un numero.
// Mentre è aperto l'estrazione automatica va in pausa.
// ==========================================================================

let riepilogoInOrdineCrescente = false;

function apriRiepilogo() {
    if (autoEstrazioneInCorso) pausaAutoEstrazione();
    riepilogoInOrdineCrescente = false;
    renderRiepilogo();
    document.getElementById("modal-riepilogo").classList.add("visibile");
}

function chiudiRiepilogo() {
    document.getElementById("modal-riepilogo").classList.remove("visibile");
}

function cambiaOrdineRiepilogo() {
    riepilogoInOrdineCrescente = !riepilogoInOrdineCrescente;
    renderRiepilogo();
}

function renderRiepilogo() {
    const estratti = Array.from(partita.numeriEstratti);
    document.getElementById("riepilogo-titolo").textContent = `Numeri estratti: ${estratti.length}`;
    document.getElementById("btnOrdineRiepilogo").textContent =
        riepilogoInOrdineCrescente ? "Ordine di uscita" : "Ordine 1-90";

    const contenitore = document.getElementById("riepilogo-numeri");
    contenitore.innerHTML = "";
    if (estratti.length === 0) {
        contenitore.innerHTML = '<span class="storico-empty">Nessun numero estratto</span>';
    }

    // Ogni numero tiene la sua posizione di uscita anche in ordine crescente
    const voci = estratti.map((numero, i) => ({ numero, ordine: i + 1 }));
    if (riepilogoInOrdineCrescente) voci.sort((a, b) => a.numero - b.numero);

    voci.forEach(({ numero, ordine }) => {
        const voce = document.createElement("div");
        voce.className = "riepilogo-voce";
        voce.title = smorfia[numero] ? smorfia[numero][impostazioni.lingua] : "";
        voce.innerHTML = `<span class="riepilogo-ordine">${ordine}°</span><span class="riepilogo-numero">${numero}</span>`;
        contenitore.appendChild(voce);
    });

    renderVinciteConfermate();
}

// Vincite confermate, per premio (più cartelle = premio diviso)
function renderVinciteConfermate() {
    const box = document.getElementById("riepilogo-vincite");
    const vincitori = partita.vincitori || [];
    box.classList.toggle("nascosto", vincitori.length === 0);
    box.innerHTML = "";
    if (vincitori.length === 0) return;

    const titolo = document.createElement("div");
    titolo.className = "config-label";
    titolo.textContent = "Vincite confermate";
    box.appendChild(titolo);

    PREMI.forEach(premio => {
        const cartelle = vincitori.filter(v => v.premio === premio).map(v => v.cartellaId);
        if (cartelle.length === 0) return;
        const riga = document.createElement("div");
        riga.className = "riepilogo-vincita";
        riga.textContent = `${premio}: cartella N. ${cartelle.join(", ")}${cartelle.length > 1 ? " (diviso)" : ""}`;
        box.appendChild(riga);
    });
}
