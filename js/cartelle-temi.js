// ==========================================================================
// TEMI E FONT DELLE CARTELLE (solo costanti)
// Un tema decide lo sfondo (disegnato da cartelle-sfondi.js) e propone colori
// e font, che poi si possono cambiare uno per uno nel pannello Grafica.
// ==========================================================================

// Font disponibili. "file" è il nome in DATI_FONT_CARTELLE (js/risorse/font-cartelle.js);
// senza file si usa un font standard, presente su tutti i PC e nei PDF.
// tabellone: false = troppo decorativo per i numeri visti da lontano: sul
// tabellone i numeri usano il font classico (il titolo invece sì).
const FONT_CARTELLE = {
    classico:   { nome: "Classico (Arial grassetto)", famiglia: "Arial, Helvetica, sans-serif", peso: "bold", file: null, pdf: { nome: "helvetica", stile: "bold" } },
    luckiest:   { nome: "Luckiest Guy (cicciotto)", famiglia: "\"Tombola Luckiest Guy\"", file: "LuckiestGuy-Regular.ttf" },
    titan:      { nome: "Titan One (tondo)", famiglia: "\"Tombola Titan One\"", file: "TitanOne-Regular.ttf" },
    chewy:      { nome: "Chewy (allegro)", famiglia: "\"Tombola Chewy\"", file: "Chewy-Regular.ttf" },
    grandHotel: { nome: "Grand Hotel (corsivo)", famiglia: "\"Tombola Grand Hotel\"", file: "GrandHotel-Regular.ttf", tabellone: false },
    cherry:     { nome: "Cherry Swash (elegante)", famiglia: "\"Tombola Cherry Swash\"", file: "CherrySwash-Bold.ttf" },
    creepster:  { nome: "Creepster (Halloween)", famiglia: "\"Tombola Creepster\"", file: "Creepster-Regular.ttf", tabellone: false }
};

const TEMA_PREDEFINITO = "classico";

// Colori:
//   colorePrimario       bordo e linee della griglia
//   coloreSecondario     fondo della griglia e del riquadro del numero
//   coloreNumeri         numeri nella griglia
//   coloreTitolo         titolo scritto nel generatore
//   coloreNumeroCartella numero progressivo della cartella
const TEMI = {
    classico: {
        nome: "Classico", sfondo: sfondoClassico,
        colorePrimario: "#212529", coloreSecondario: "#ffffff", coloreNumeri: "#111111",
        coloreTitolo: "#ffc107", coloreNumeroCartella: "#212529",
        fontNumeri: "classico", fontTitolo: "classico"
    },
    natale: {
        nome: "Natale", sfondo: sfondoNatale,
        colorePrimario: "#a4161a", coloreSecondario: "#fffaf3", coloreNumeri: "#a4161a",
        coloreTitolo: "#ffffff", coloreNumeroCartella: "#a4161a",
        fontNumeri: "luckiest", fontTitolo: "grandHotel"
    },
    neve: {
        nome: "Neve", sfondo: sfondoNeve,
        colorePrimario: "#355c7d", coloreSecondario: "#f5f9fc", coloreNumeri: "#2c4f6e",
        coloreTitolo: "#ffffff", coloreNumeroCartella: "#355c7d",
        fontNumeri: "titan", fontTitolo: "grandHotel"
    },
    halloween: {
        nome: "Halloween", sfondo: sfondoHalloween,
        colorePrimario: "#3c1f5e", coloreSecondario: "#fff4e6", coloreNumeri: "#d9480f",
        coloreTitolo: "#ff922b", coloreNumeroCartella: "#3c1f5e",
        fontNumeri: "luckiest", fontTitolo: "creepster"
    },
    notte: {
        nome: "Notte stellata", sfondo: sfondoNotte,
        colorePrimario: "#1d3f7a", coloreSecondario: "#f3f6ff", coloreNumeri: "#1d3f7a",
        coloreTitolo: "#ffd43b", coloreNumeroCartella: "#1d3f7a",
        fontNumeri: "titan", fontTitolo: "cherry"
    },
    sanValentino: {
        nome: "San Valentino", sfondo: sfondoSanValentino,
        colorePrimario: "#c9184a", coloreSecondario: "#fff0f3", coloreNumeri: "#c9184a",
        coloreTitolo: "#ffffff", coloreNumeroCartella: "#c9184a",
        fontNumeri: "chewy", fontTitolo: "grandHotel"
    },
    fiori: {
        nome: "Fiori", sfondo: sfondoFiori,
        colorePrimario: "#2d6a4f", coloreSecondario: "#ffffff", coloreNumeri: "#2d6a4f",
        coloreTitolo: "#d6336c", coloreNumeroCartella: "#2d6a4f",
        fontNumeri: "chewy", fontTitolo: "grandHotel"
    },
    estate: {
        nome: "Estate al mare", sfondo: sfondoEstate,
        colorePrimario: "#0b7285", coloreSecondario: "#fffdf5", coloreNumeri: "#0b7285",
        coloreTitolo: "#ffffff", coloreNumeroCartella: "#0b7285",
        fontNumeri: "luckiest", fontTitolo: "cherry"
    },
    autunno: {
        nome: "Autunno", sfondo: sfondoAutunno,
        colorePrimario: "#7f4f24", coloreSecondario: "#fffaf0", coloreNumeri: "#9c3d10",
        coloreTitolo: "#fff3bf", coloreNumeroCartella: "#7f4f24",
        fontNumeri: "titan", fontTitolo: "cherry"
    }
};

// Campi della grafica che un tema imposta (e che si salvano)
const CAMPI_COLORE_GRAFICA = ["colorePrimario", "coloreSecondario", "coloreNumeri", "coloreTitolo", "coloreNumeroCartella"];
const CAMPI_FONT_GRAFICA = ["fontNumeri", "fontTitolo"];
