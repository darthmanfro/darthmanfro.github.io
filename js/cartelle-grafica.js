// ==========================================================================
// PANNELLO GRAFICA DELLE CARTELLE
// Nella finestra del generatore, il pulsante "Grafica" nasconde i comandi
// normali e mostra tema, colori e font. Ogni modifica aggiorna subito
// l'anteprima e viene ricordata nel browser per la volta successiva.
// Qui si caricano anche i font inclusi nell'app.
// ==========================================================================

const CHIAVE_ARCHIVIO_GRAFICA = "tombola-grafica-cartelle";

// --- FONT ---

const fontInCaricamento = {};

function base64InByte(testo) {
    const binario = atob(testo);
    const byte = new Uint8Array(binario.length);
    for (let i = 0; i < binario.length; i++) byte[i] = binario.charCodeAt(i);
    return byte.buffer;
}

// Carica un font incluso nell'app (una volta sola); i font standard sono già pronti
function caricaFontCartella(id) {
    const f = FONT_CARTELLE[id];
    if (!f || !f.file) return Promise.resolve();
    if (!fontInCaricamento[id]) {
        const nomeFamiglia = f.famiglia.replace(/"/g, "");
        const fontFace = new FontFace(nomeFamiglia, base64InByte(DATI_FONT_CARTELLE[f.file]));
        fontInCaricamento[id] = fontFace.load()
            .then(caricato => document.fonts.add(caricato))
            .catch(err => console.warn(`Font ${f.nome} non caricato:`, err));
    }
    return fontInCaricamento[id];
}

// Da attendere prima di disegnare: misure e disegno devono usare il font giusto
function preparaFontGrafica(stile) {
    return Promise.all([caricaFontCartella(stile.fontNumeri), caricaFontCartella(stile.fontTitolo)]);
}

// Copia della grafica attuale, da usare per un intero disegno o esportazione
function stileCartelleCorrente() {
    return { ...graficaCartelle };
}

// --- VALORI E SALVATAGGIO ---

function applicaTema(idTema) {
    const tema = TEMI[idTema] || TEMI[TEMA_PREDEFINITO];
    graficaCartelle.tema = TEMI[idTema] ? idTema : TEMA_PREDEFINITO;
    [...CAMPI_COLORE_GRAFICA, ...CAMPI_FONT_GRAFICA].forEach(campo => {
        graficaCartelle[campo] = tema[campo];
    });
}

function salvaGraficaNelBrowser() {
    try {
        localStorage.setItem(CHIAVE_ARCHIVIO_GRAFICA, JSON.stringify(graficaCartelle));
    } catch (e) {
        // Archivio del browser non disponibile: la scelta vale solo per questa sessione
    }
}

// Riprende la grafica salvata, scartando valori non validi
function caricaGraficaDalBrowser() {
    applicaTema(TEMA_PREDEFINITO);
    let salvata = null;
    try {
        salvata = JSON.parse(localStorage.getItem(CHIAVE_ARCHIVIO_GRAFICA));
    } catch (e) {
        salvata = null;
    }
    if (!salvata || !TEMI[salvata.tema]) return;

    applicaTema(salvata.tema);
    CAMPI_COLORE_GRAFICA.forEach(campo => {
        if (/^#[0-9a-f]{6}$/i.test(salvata[campo] || "")) graficaCartelle[campo] = salvata[campo].toLowerCase();
    });
    CAMPI_FONT_GRAFICA.forEach(campo => {
        if (FONT_CARTELLE[salvata[campo]]) graficaCartelle[campo] = salvata[campo];
    });
}

// --- PANNELLO ---

function riempiElenco(idSelect, voci) {
    const select = document.getElementById(idSelect);
    if (!select) return;
    select.innerHTML = "";
    Object.entries(voci).forEach(([id, voce]) => {
        const opzione = document.createElement("option");
        opzione.value = id;
        opzione.textContent = voce.nome;
        select.appendChild(opzione);
    });
}

// Riporta nei controlli i valori attuali
function aggiornaControlliGrafica() {
    document.getElementById("selTema").value = graficaCartelle.tema;
    [...CAMPI_COLORE_GRAFICA, ...CAMPI_FONT_GRAFICA].forEach(campo => {
        const controllo = document.querySelector(`[data-campo-grafica="${campo}"]`);
        if (controllo) controllo.value = graficaCartelle[campo];
    });
}

function inizializzaGraficaCartelle() {
    riempiElenco("selTema", TEMI);
    riempiElenco("selFontNumeri", FONT_CARTELLE);
    riempiElenco("selFontTitolo", FONT_CARTELLE);
    caricaGraficaDalBrowser();
    aggiornaControlliGrafica();
}

// Mostra il pannello grafica (true) o i comandi normali del generatore (false)
function mostraPannelloGrafica(mostra) {
    document.getElementById("modal-cartelle").classList.toggle("mostra-grafica", mostra);
}

// Scelta di un tema: colori e font tornano quelli del tema
function selezionaTema(idTema) {
    applicaTema(idTema);
    aggiornaControlliGrafica();
    salvaGraficaNelBrowser();
    aggiornaAnteprimaCartella();
}

function ripristinaColoriTema() {
    selezionaTema(graficaCartelle.tema);
}

// Cambio di un singolo colore o font (il campo è indicato da data-campo-grafica)
function cambiaGrafica(controllo) {
    const campo = controllo.dataset.campoGrafica;
    if (!campo) return;
    graficaCartelle[campo] = controllo.value;
    salvaGraficaNelBrowser();
    aggiornaAnteprimaCartella();
}

// --- ANTEPRIMA ---

let ultimaAnteprima = 0;

// Disegna una cartella sul canvas dell'anteprima, alla risoluzione dello schermo
async function disegnaAnteprimaCartella(canvas, griglia, titolo, larghezzaMm, altezzaMm) {
    const turno = ++ultimaAnteprima;
    const stile = stileCartelleCorrente();
    await preparaFontGrafica(stile);
    if (turno !== ultimaAnteprima) return; // Nel frattempo è partita un'anteprima più recente

    const larghezzaSchermo = canvas.clientWidth || 520;
    const pixelPerMm = (larghezzaSchermo * (window.devicePixelRatio || 1)) / larghezzaMm;
    canvas.width = Math.round(larghezzaMm * pixelPerMm);
    canvas.height = Math.round(altezzaMm * pixelPerMm);

    const ctx = canvas.getContext("2d");
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    disegnaCartella(superficieCanvas(ctx, pixelPerMm), griglia, 1, titolo, stile, 0, 0, larghezzaMm, altezzaMm);
}
