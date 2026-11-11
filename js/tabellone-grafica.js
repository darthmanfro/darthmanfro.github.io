// ==========================================================================
// GRAFICA DEL TABELLONE
// Riprende in modo leggero la grafica delle cartelle: titolo in alto, sfondo
// del tema nella cornice, colori e font su celle e numero estratto.
// Con il tema Classico e i suoi colori (o con l'opzione spenta nel pannello
// Grafica) il tabellone resta quello di sempre.
//
// Tutte le regole sono in css/tabellone-grafica.css, attive con la classe
// .grafica-tabellone sul body. Da qui si impostano solo i VALORI delle
// variabili CSS (--tab-...), perché i colori li sceglie l'utente.
// La leggibilità viene prima: se un colore scelto si legge male, sul
// tabellone si usa bianco o nero; i font troppo decorativi non si usano
// per i numeri.
// ==========================================================================

const LARGHEZZA_SFONDO_TABELLONE = 186; // Unità di disegno: come una cartella larga 186 mm
const CONTRASTO_MINIMO_NUMERI = 3;      // Numeri grandi: basta il contrasto dei testi grandi
const CONTRASTO_MINIMO_ESTRATTI = 2;    // Celle estratte distinguibili da quelle non estratte
const COLORE_ESTRATTO_CLASSICO = "#28a745";

// --- QUANDO SI APPLICA ---

// Diversa dalla grafica classica: altro tema oppure colori o font cambiati
function graficaPersonalizzata(grafica) {
    if (grafica.tema !== TEMA_PREDEFINITO) return true;
    const classico = TEMI[TEMA_PREDEFINITO];
    return [...CAMPI_COLORE_GRAFICA, ...CAMPI_FONT_GRAFICA].some(campo => grafica[campo] !== classico[campo]);
}

function graficaTabelloneAttiva() {
    return graficaCartelle.tabellone && graficaPersonalizzata(graficaCartelle);
}

// --- LEGGIBILITÀ ---

// Luminanza relativa e rapporto di contrasto (WCAG)
function luminanzaRelativa(hex) {
    const [r, g, b] = coloreInRgb(hex).map(v => {
        const c = v / 255;
        return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function rapportoContrasto(a, b) {
    const la = luminanzaRelativa(a), lb = luminanzaRelativa(b);
    return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

// Bianco o quasi nero, quello che si legge meglio sul fondo
function testoLeggibileSu(fondo) {
    return rapportoContrasto("#ffffff", fondo) >= rapportoContrasto("#111111", fondo) ? "#ffffff" : "#111111";
}

function fontNumeriTabellone(idFont) {
    const f = FONT_CARTELLE[idFont];
    return f && f.tabellone !== false ? idFont : "classico";
}

// Valori delle variabili CSS per la grafica scelta
function variabiliTabellone(grafica) {
    const fondo = grafica.coloreSecondario;
    const numeri = rapportoContrasto(grafica.coloreNumeri, fondo) >= CONTRASTO_MINIMO_NUMERI
        ? grafica.coloreNumeri : testoLeggibileSu(fondo);
    const estratto = rapportoContrasto(grafica.colorePrimario, fondo) >= CONTRASTO_MINIMO_ESTRATTI
        ? grafica.colorePrimario : COLORE_ESTRATTO_CLASSICO;
    const fontNumeri = FONT_CARTELLE[grafica.fontNumeri];
    const fontTitolo = FONT_CARTELLE[grafica.fontTitolo];

    return {
        "--tab-primario": grafica.colorePrimario,
        "--tab-secondario": fondo,
        "--tab-numeri": numeri,
        "--tab-estratto": estratto,
        "--tab-su-estratto": testoLeggibileSu(estratto),
        "--tab-titolo": grafica.coloreTitolo,
        "--tab-contorno-titolo": coloreContornoTitolo(grafica),
        "--tab-font-numeri": fontNumeri.famiglia,
        "--tab-peso-numeri": fontNumeri.peso || "normal",
        "--tab-font-titolo": fontTitolo.famiglia,
        "--tab-peso-titolo": fontTitolo.peso || "normal"
    };
}

// --- APPLICAZIONE ---

let turnoGraficaTabellone = 0;

async function aggiornaGraficaTabellone() {
    const turno = ++turnoGraficaTabellone;
    if (!graficaTabelloneAttiva()) {
        document.body.classList.remove("grafica-tabellone");
        return;
    }

    const grafica = { ...graficaCartelle, fontNumeri: fontNumeriTabellone(graficaCartelle.fontNumeri) };
    await preparaFontGrafica(grafica);
    if (turno !== turnoGraficaTabellone) return; // Nel frattempo è arrivata una modifica più recente

    const radice = document.documentElement;
    Object.entries(variabiliTabellone(grafica)).forEach(([nome, valore]) => radice.style.setProperty(nome, valore));
    document.getElementById("titolo-tabellone").textContent = grafica.titolo || "Tombola";
    document.body.classList.add("grafica-tabellone");
    disegnaSfondoTabellone();
}

// Sfondo del tema disegnato sul canvas dietro la griglia (si vede solo nella cornice
// e sotto il titolo), con gli stessi disegni delle cartelle
function disegnaSfondoTabellone() {
    if (!document.body.classList.contains("grafica-tabellone")) return;
    const canvas = document.getElementById("sfondo-tabellone");
    const titolo = document.getElementById("titolo-tabellone");
    const larghezzaPx = canvas.clientWidth, altezzaPx = canvas.clientHeight;
    if (!larghezzaPx || !altezzaPx) return;

    const densita = window.devicePixelRatio || 1;
    canvas.width = Math.round(larghezzaPx * densita);
    canvas.height = Math.round(altezzaPx * densita);

    const scala = larghezzaPx / LARGHEZZA_SFONDO_TABELLONE;
    const w = LARGHEZZA_SFONDO_TABELLONE, h = altezzaPx / scala;
    // Le decorazioni "da intestazione" dei temi finiscono nella fascia del titolo
    const L = { intestazione: (titolo.offsetTop + titolo.offsetHeight) / scala };

    const ctx = canvas.getContext("2d");
    ctx.setTransform(scala * densita, 0, 0, scala * densita, 0, 0);
    ctx.clearRect(0, 0, w, h);
    const tema = TEMI[graficaCartelle.tema] || TEMI[TEMA_PREDEFINITO];
    tema.sfondo(ctx, w, h, creaCasuale(semeDaTesto(graficaCartelle.tema)), L);
}

function inizializzaGraficaTabellone() {
    aggiornaGraficaTabellone();

    // Ridisegna lo sfondo quando cambia la dimensione del tabellone (finestra, rotazione)
    let attesa = null;
    new ResizeObserver(() => {
        cancelAnimationFrame(attesa);
        attesa = requestAnimationFrame(disegnaSfondoTabellone);
    }).observe(document.getElementById("tabellone-container"));
}
