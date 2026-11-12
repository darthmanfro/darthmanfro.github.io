// ==========================================================================
// GENERATORE CARTELLE
// Creazione di cartelle regolamentari e tutte diverse, anteprima nella
// finestra e esportazioni: PDF (jsPDF), immagini PNG e file partita (.JSON).
// ==========================================================================

const MIN_CARTELLE = 1;
const MAX_CARTELLE = 100;

// --- STATE & UTILS PER LE CARTELLE ---
let anteprimaCartellaDati = null;
let cartelleGenerateState = null; // Memorizza la partita corrente generata

function generaDatiCartellaSingola() {
    let cartellaValida = false;
    let griglia = [];

    while (!cartellaValida) {
        griglia = Array.from({ length: 3 }, () => Array(9).fill(null));

        const numeriColonna = [];
        for (let col = 0; col < 9; col++) {
            const min = col === 0 ? 1 : col * 10;
            const max = col === 8 ? 90 : col * 10 + 9;
            const disponibili = [];
            for (let n = min; n <= max; n++) disponibili.push(n);
            numeriColonna.push(mescola(disponibili));
        }

        const conteggioColonna = Array(9).fill(0);
        let posizioniValide = true;

        for (let riga = 0; riga < 3; riga++) {
            const opzioniColonna = Array.from({ length: 9 }, (_, c) => c)
                .filter(c => conteggioColonna[c] < 3);

            if (opzioniColonna.length < 5) {
                posizioniValide = false;
                break;
            }

            mescola(opzioniColonna).slice(0, 5).forEach(c => conteggioColonna[c]++);
        }

        const sommaNumeri = conteggioColonna.reduce((a, b) => a + b, 0);

        if (posizioniValide && sommaNumeri === 15 && conteggioColonna.every(c => c >= 1)) {
            const maschera = Array.from({ length: 3 }, () => Array(9).fill(false));
            let tentaMaschera = 0;
            let mascheraOK = false;

            while (tentaMaschera < 50 && !mascheraOK) {
                tentaMaschera++;
                maschera.forEach(r => r.fill(false));

                for (let col = 0; col < 9; col++) {
                    const occ = conteggioColonna[col];
                    mescola([0, 1, 2]).slice(0, occ).forEach(r => maschera[r][col] = true);
                }

                if (maschera.every(r => r.filter(c => c).length === 5)) {
                    mascheraOK = true;
                }
            }

            if (mascheraOK) {
                for (let col = 0; col < 9; col++) {
                    const occ = conteggioColonna[col];
                    const estratti = numeriColonna[col].slice(0, occ).sort((a, b) => a - b);
                    let ptr = 0;
                    for (let riga = 0; riga < 3; riga++) {
                        if (maschera[riga][col]) {
                            griglia[riga][col] = estratti[ptr++];
                        }
                    }
                }
                cartellaValida = true;
            }
        }
    }

    return griglia;
}

function ottieniFirmaCartella(griglia) {
    const numeri = [];
    for (let r = 0; r < 3; r++) {
        for (let c = 0; c < 9; c++) {
            if (griglia[r][c] !== null) numeri.push(griglia[r][c]);
        }
    }
    return numeri.sort((a, b) => a - b).join('-');
}

function generaListaCartelleUniche(quantita) {
    const lista = [];
    const firmeUsate = new Set();

    while (lista.length < quantita) {
        const nuvGriglia = generaDatiCartellaSingola();
        const firma = ottieniFirmaCartella(nuvGriglia);

        if (!firmeUsate.has(firma)) {
            firmeUsate.add(firma);
            lista.push(nuvGriglia);
        }
    }
    return lista;
}

// --- FUNZIONE DI GENERAZIONE CON POPUP E ABILITAZIONE PULSANTI ---
async function generaNuovoDatasetCartelle() {
    if (cartelleGenerateState !== null) {
        const conferma = await chiedi("Hai già generato un set di cartelle.\nVuoi generarne uno nuovo? I file scaricati prima non saranno più coerenti con il nuovo set.",
            { titolo: "Nuove cartelle", si: "Genera nuove" });
        if (!conferma) return;
    }

    // Quantità riportata tra 1 e 100 (valore non numerico: 20) e riscritta nel campo
    const campoNum = document.getElementById('numCartelle');
    const letto = parseInt(campoNum.value, 10);
    const num = isNaN(letto) ? 20 : Math.min(MAX_CARTELLE, Math.max(MIN_CARTELLE, letto));
    campoNum.value = num;
    cartelleGenerateState = generaListaCartelleUniche(num);
    
    // Mostra la prima cartella generata come anteprima
    if (cartelleGenerateState.length > 0) {
        anteprimaCartellaDati = cartelleGenerateState[0];
        aggiornaAnteprimaCartella();
    }

    // Abilita i tre pulsanti di download graficamente e funzionalmente
    impostaStatoPulsantiDownload(false);

    avvisa(`Generate con successo ${cartelleGenerateState.length} cartelle! I pulsanti di download sono ora attivi.`);
}

function impostaStatoPulsantiDownload(disabilitati) {
    const btns = [
        document.getElementById('btnDownloadPdf'),
        document.getElementById('btnDownloadPng'),
        document.getElementById('btnDownloadJson'),
        document.getElementById('btnUsaCartelle')
    ];

    // L'aspetto dei pulsanti disabilitati è gestito in css/cartelle.css (.btn-azione:disabled)
    btns.forEach(btn => {
        if (btn) btn.disabled = disabilitati;
    });
}

// --- GESTIONE INTERFACCIA E ANTEPRIMA ---

function apriModalCartelle() {
    if (!anteprimaCartellaDati) {
        anteprimaCartellaDati = generaDatiCartellaSingola();
    }
    aggiornaAnteprimaCartella();

    // Imposta lo stato iniziale dei pulsanti in base alla presenza del dataset
    if (!cartelleGenerateState) {
        impostaStatoPulsantiDownload(true);
    } else {
        impostaStatoPulsantiDownload(false);
    }

    document.getElementById('modal-cartelle').classList.add('visibile');
}

function chiudiModalCartelle() {
    document.getElementById('modal-cartelle').classList.remove('visibile');
    mostraPannelloGrafica(false); // Alla prossima apertura si riparte dai comandi normali
}

// Ridisegna l'anteprima con la prima cartella, il titolo e la grafica attuali
function aggiornaAnteprimaCartella() {
    const canvas = document.getElementById('anteprima-cartella');
    if (!canvas || !anteprimaCartellaDati) return;
    const titolo = document.getElementById('titoloCartella').value || 'Tombola';
    const imp = calcolaImpaginazione('A4');
    disegnaAnteprimaCartella(canvas, anteprimaCartellaDati, titolo, imp.larghezzaCartella, imp.altezzaCartella);
}

// --- ESPORTAZIONE FILE PARTITA (.JSON) ---
// Struttura dati della partita: la stessa salvata nel file .JSON
function costruisciDatiPartita() {
    const titolo = document.getElementById('titoloCartella').value || 'Tombola';
    const listaCartelle = cartelleGenerateState;

    return {
        titolo: titolo,
        dataGenerazione: new Date().toISOString(),
        // Tema, colori e font: al caricamento si può scegliere se applicarli
        grafica: graficaDaEsportare(),
        totaleCartelle: listaCartelle.length,
        cartelle: listaCartelle.map((griglia, idx) => {
            const numeri = [];
            for (let r = 0; r < 3; r++) {
                for (let c = 0; c < 9; c++) {
                    if (griglia[r][c] !== null) numeri.push(griglia[r][c]);
                }
            }
            return {
                id: idx + 1,
                firma: ottieniFirmaCartella(griglia),
                numeri: numeri,
                griglia: griglia
            };
        })
    };
}

// --- USA LE CARTELLE GENERATE DIRETTAMENTE NELLA PARTITA (senza file .JSON) ---
async function usaCartelleNellaPartita() {
    if (!cartelleGenerateState) return;

    if (partita.cartelleCaricate.length > 0) {
        const conferma = await chiedi(`Ci sono già ${partita.cartelleCaricate.length} cartelle in uso per il controllo vincite.\nVuoi sostituirle con quelle appena generate?`,
            { titolo: "Usa nella partita", si: "Sostituisci" });
        if (!conferma) return;
    }

    impostaCartellePartita(costruisciDatiPartita().cartelle);
    avvisa(`${partita.cartelleCaricate.length} cartelle in uso per il controllo vincite.\nRicorda di scaricare anche il file .JSON se vuoi riusarle in un altro momento.`);
}

function esportaFileJSONPartita() {
    if (!cartelleGenerateState) return;

    const titolo = document.getElementById('titoloCartella').value || 'Tombola';
    scaricaFileJson(costruisciDatiPartita(), `partita-tombola-${nomeFileDaTitolo(titolo)}.json`);
}

// Fa scaricare un oggetto come file .JSON (file partita e file grafica)
function scaricaFileJson(dati, nomeFile) {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(dati, null, 2));
    const link = document.createElement('a');
    link.setAttribute("href", dataStr);
    link.setAttribute("download", nomeFile);
    document.body.appendChild(link);
    link.click();
    link.remove();
}

// --- IMPAGINAZIONE COMUNE A PDF E PNG ---
// Tutte le misure sono in millimetri. Il foglio A3 (orizzontale) equivale a due
// fogli A4 verticali affiancati: ogni metà ha esattamente l'impaginazione
// dell'A4, quindi le cartelle hanno la stessa dimensione nei due formati.
const LARGHEZZA_A4_MM = 210;
const ALTEZZA_A4_MM = 297;
const MARGINE_MM = 12;
const SPAZIO_CARTELLE_MM = 8;
const CARTELLE_PER_COLONNA = 4;
const PIXEL_PER_MM_PNG = 1600 / 210;  // Risoluzione delle immagini PNG (A4 = 1600 px di larghezza)

function calcolaImpaginazione(formato) {
    const colonne = formato === 'A3' ? 2 : 1;
    const larghezzaCartella = LARGHEZZA_A4_MM - MARGINE_MM * 2;
    const altezzaCartella = (ALTEZZA_A4_MM - MARGINE_MM * 2 - SPAZIO_CARTELLE_MM * (CARTELLE_PER_COLONNA - 1)) / CARTELLE_PER_COLONNA;

    // Ordine: prima la colonna di sinistra (1-4), poi quella di destra (5-8),
    // così tagliando a metà un A3 si ottengono due fogli A4 in sequenza
    const posizioni = [];
    for (let col = 0; col < colonne; col++) {
        for (let riga = 0; riga < CARTELLE_PER_COLONNA; riga++) {
            posizioni.push({
                x: col * LARGHEZZA_A4_MM + MARGINE_MM,
                y: MARGINE_MM + riga * (altezzaCartella + SPAZIO_CARTELLE_MM)
            });
        }
    }

    return {
        larghezza: LARGHEZZA_A4_MM * colonne,
        altezza: ALTEZZA_A4_MM,
        orientamento: colonne === 2 ? 'landscape' : 'portrait',
        larghezzaCartella,
        altezzaCartella,
        posizioni
    };
}

// Nome file senza spazi, es. "Tombola di Natale" -> "tombola-di-natale"
function nomeFileDaTitolo(titolo) {
    return titolo.toLowerCase().replace(/\s+/g, '-');
}

// --- ESPORTAZIONE PDF OFFLINE ---
// Grafica vettoriale (numeri e linee nitidi in stampa) con i font inclusi nell'app
async function generaEScaricaPDF() {
    if (!cartelleGenerateState) return;

    if (!window.jspdf) {
        avvisa('Libreria jsPDF non trovata offline in ./js/lib/jspdf.umd.min.js');
        return;
    }

    const titolo = document.getElementById('titoloCartella').value || 'Tombola';
    const formato = (document.getElementById('formatoStampa').value || 'A4').toUpperCase();
    const listaCartelle = cartelleGenerateState;
    const stile = stileCartelleCorrente();

    await eseguiEsportazione('btnDownloadPdf', async () => {
        await preparaFontGrafica(stile);

        const { jsPDF } = window.jspdf;
        const imp = calcolaImpaginazione(formato);
        const doc = new jsPDF({
            orientation: imp.orientamento,
            unit: 'mm',
            format: formato === 'A3' ? 'a3' : 'a4'
        });
        registraFontPdf(doc, stile);
        const sup = superficiePdf(doc);

        const perFoglio = imp.posizioni.length;
        listaCartelle.forEach((griglia, idx) => {
            if (idx > 0 && idx % perFoglio === 0) doc.addPage();
            const pos = imp.posizioni[idx % perFoglio];
            disegnaCartella(sup, griglia, idx + 1, titolo, stile, pos.x, pos.y, imp.larghezzaCartella, imp.altezzaCartella);
        });

        doc.save(`cartelle-${nomeFileDaTitolo(titolo)}-${formato.toLowerCase()}.pdf`);
    });
}

// --- ESPORTAZIONE IMMAGINI PNG ---
// Un'immagine per foglio nel formato scelto (A4: 4 cartelle, A3: 8 cartelle),
// con la stessa impaginazione del PDF
async function esportaComeImmagine() {
    if (!cartelleGenerateState) return;

    const titolo = document.getElementById('titoloCartella').value || 'Tombola';
    const formato = (document.getElementById('formatoStampa').value || 'A4').toUpperCase();
    const listaCartelle = cartelleGenerateState;
    const stile = stileCartelleCorrente();

    await eseguiEsportazione('btnDownloadPng', async () => {
        await preparaFontGrafica(stile);

        const imp = calcolaImpaginazione(formato);
        const perFoglio = imp.posizioni.length;
        const totaleFogli = Math.ceil(listaCartelle.length / perFoglio);
        const s = PIXEL_PER_MM_PNG;

        for (let f = 0; f < totaleFogli; f++) {
            const canvas = document.createElement('canvas');
            canvas.width = Math.round(imp.larghezza * s);
            canvas.height = Math.round(imp.altezza * s);
            const ctx = canvas.getContext('2d');

            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            const sup = superficieCanvas(ctx, s);

            listaCartelle.slice(f * perFoglio, (f + 1) * perFoglio).forEach((griglia, idxInFoglio) => {
                const pos = imp.posizioni[idxInFoglio];
                disegnaCartella(sup, griglia, f * perFoglio + idxInFoglio + 1, titolo, stile,
                    pos.x, pos.y, imp.larghezzaCartella, imp.altezzaCartella);
            });

            const link = document.createElement('a');
            link.download = `cartelle-${nomeFileDaTitolo(titolo)}-${formato.toLowerCase()}-foglio-${f + 1}.png`;
            link.href = canvas.toDataURL('image/png');
            link.click();
        }
    });
}

// Pulsante disattivato con "attendere" durante l'esportazione, errori mostrati a video
async function eseguiEsportazione(idPulsante, lavoro) {
    const btn = document.getElementById(idPulsante);
    const testoOriginale = btn ? btn.textContent : '';
    if (btn) {
        btn.disabled = true;
        btn.textContent = 'Attendere…';
    }
    try {
        await lavoro();
    } catch (err) {
        console.error(err);
        avvisa(`Errore durante l'esportazione: ${err.message || err}`);
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.textContent = testoOriginale;
        }
    }
}
