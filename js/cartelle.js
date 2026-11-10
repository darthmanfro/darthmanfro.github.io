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

            for (let i = disponibili.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [disponibili[i], disponibili[j]] = [disponibili[j], disponibili[i]];
            }
            numeriColonna.push(disponibili);
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

            for (let i = opzioniColonna.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [opzioniColonna[i], opzioniColonna[j]] = [opzioniColonna[j], opzioniColonna[i]];
            }

            opzioniColonna.slice(0, 5).forEach(c => conteggioColonna[c]++);
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
                    const righeDisponibili = [0, 1, 2];
                    for (let i = righeDisponibili.length - 1; i > 0; i--) {
                        const j = Math.floor(Math.random() * (i + 1));
                        [righeDisponibili[i], righeDisponibili[j]] = [righeDisponibili[j], righeDisponibili[i]];
                    }
                    righeDisponibili.slice(0, occ).forEach(r => maschera[r][col] = true);
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
function generaNuovoDatasetCartelle() {
    if (cartelleGenerateState !== null) {
        const conferma = confirm("Attenzione: hai già generato un set di cartelle.\nVuoi rigenerare un nuovo dataset? I file precedentemente scaricati non saranno più coerenti con il nuovo set.");
        if (!conferma) return;
    }

    const num = parseInt(document.getElementById('numCartelle').value, 10) || 20;
    cartelleGenerateState = generaListaCartelleUniche(num);
    
    // Mostra la prima cartella generata come anteprima
    if (cartelleGenerateState.length > 0) {
        anteprimaCartellaDati = cartelleGenerateState[0];
        aggiornaAnteprimaCartella();
    }

    // Abilita i tre pulsanti di download graficamente e funzionalmente
    impostaStatoPulsantiDownload(false);

    alert(`Generate con successo ${cartelleGenerateState.length} cartelle! I pulsanti di download sono ora attivi.`);
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
}

function aggiornaAnteprimaCartella() {
    const container = document.getElementById('anteprima-cartella-container');
    if (!container || !anteprimaCartellaDati) return;
    const titolo = document.getElementById('titoloCartella').value || 'Tombola';

    container.innerHTML = creaHTMLCartella(anteprimaCartellaDati, 1, titolo);
}

// Rende il testo sicuro da inserire nell'HTML (es. un titolo con < o &)
function escapeHTML(testo) {
    return String(testo)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function creaHTMLCartella(griglia, numeroProgressivo, titolo) {
    let html = `
        <div class="cartella-box">
            <div class="cartella-header">
                <span class="cartella-titolo">${escapeHTML(titolo)}</span>
                <span class="cartella-numero">Cartella N. ${numeroProgressivo}</span>
            </div>
            <div class="cartella-griglia">
    `;

    for (let r = 0; r < 3; r++) {
        for (let c = 0; c < 9; c++) {
            const val = griglia[r][c];
            html += val !== null 
                ? `<div class="cartella-cell numero">${val}</div>` 
                : `<div class="cartella-cell vuota"></div>`;
        }
    }

    html += `
            </div>
        </div>
    `;
    return html;
}

// --- ESPORTAZIONE FILE PARTITA (.JSON) ---
// Struttura dati della partita: la stessa salvata nel file .JSON
function costruisciDatiPartita() {
    const titolo = document.getElementById('titoloCartella').value || 'Tombola';
    const listaCartelle = cartelleGenerateState;

    return {
        titolo: titolo,
        dataGenerazione: new Date().toISOString(),
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
function usaCartelleNellaPartita() {
    if (!cartelleGenerateState) return;

    if (partita.cartelleCaricate.length > 0) {
        const conferma = confirm(`Ci sono già ${partita.cartelleCaricate.length} cartelle in uso per il controllo vincite.\nVuoi sostituirle con quelle appena generate?`);
        if (!conferma) return;
    }

    impostaCartellePartita(costruisciDatiPartita().cartelle);
    alert(`${partita.cartelleCaricate.length} cartelle in uso per il controllo vincite.\nRicorda di scaricare anche il file .JSON se vuoi riusarle in un altro momento.`);
}

function esportaFileJSONPartita() {
    if (!cartelleGenerateState) return;

    const titolo = document.getElementById('titoloCartella').value || 'Tombola';
    const datiPartita = costruisciDatiPartita();

    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(datiPartita, null, 2));
    const link = document.createElement('a');
    link.setAttribute("href", dataStr);
    link.setAttribute("download", `partita-tombola-${titolo.toLowerCase().replace(/\s+/g, '-')}.json`);
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
const ALTEZZA_INTESTAZIONE_MM = 9;
const MM_PER_PUNTO = 25.4 / 72;       // Dimensione dei caratteri: da punti tipografici a mm
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
function generaEScaricaPDF() {
    if (!cartelleGenerateState) return;

    const titolo = document.getElementById('titoloCartella').value || 'Tombola';
    const formato = (document.getElementById('formatoStampa').value || 'A4').toUpperCase();
    const listaCartelle = cartelleGenerateState;

    if (!window.jspdf) {
        alert('Libreria jsPDF non trovata offline in ./js/lib/jspdf.umd.min.js');
        return;
    }

    const { jsPDF } = window.jspdf;
    const imp = calcolaImpaginazione(formato);
    const doc = new jsPDF({
        orientation: imp.orientamento,
        unit: 'mm',
        format: formato === 'A3' ? 'a3' : 'a4'
    });

    const perFoglio = imp.posizioni.length;
    listaCartelle.forEach((griglia, idx) => {
        if (idx > 0 && idx % perFoglio === 0) doc.addPage();
        const pos = imp.posizioni[idx % perFoglio];
        disegnaCartellaSuPDF(doc, griglia, idx + 1, titolo, pos.x, pos.y, imp.larghezzaCartella, imp.altezzaCartella);
    });

    doc.save(`cartelle-${nomeFileDaTitolo(titolo)}-${formato.toLowerCase()}.pdf`);
}

function disegnaCartellaSuPDF(doc, griglia, numProg, titolo, x, y, w, h) {
    doc.setDrawColor(33, 37, 41);
    doc.setLineWidth(0.6);
    doc.rect(x, y, w, h);

    const headerH = ALTEZZA_INTESTAZIONE_MM;
    doc.setFillColor(33, 37, 41);
    doc.rect(x, y, w, headerH, 'F');

    doc.setTextColor(255, 193, 7);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text(titolo.toUpperCase(), x + 4, y + 6);

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(9);
    doc.text(`Cartella N. ${numProg}`, x + w - 4, y + 6, { align: 'right' });

    const gridY = y + headerH;
    const cellW = w / 9;
    const cellH = (h - headerH) / 3;

    doc.setTextColor(11, 11, 11);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');

    for (let r = 0; r < 3; r++) {
        for (let c = 0; c < 9; c++) {
            const cx = x + c * cellW;
            const cy = gridY + r * cellH;
            const val = griglia[r][c];

            if (val !== null) {
                doc.setFillColor(255, 255, 255);
                doc.rect(cx, cy, cellW, cellH, 'FD');
                doc.text(val.toString(), cx + cellW / 2, cy + cellH / 2 + 2, { align: 'center' });
            } else {
                doc.setFillColor(233, 236, 239);
                doc.rect(cx, cy, cellW, cellH, 'FD');
            }
        }
    }
}

// --- ESPORTAZIONE IMMAGINI PNG ---
// Un'immagine per foglio nel formato scelto (A4: 4 cartelle, A3: 8 cartelle),
// con la stessa impaginazione del PDF
function esportaComeImmagine() {
    if (!cartelleGenerateState) return;

    const titolo = document.getElementById('titoloCartella').value || 'Tombola';
    const formato = (document.getElementById('formatoStampa').value || 'A4').toUpperCase();
    const listaCartelle = cartelleGenerateState;

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

        listaCartelle.slice(f * perFoglio, (f + 1) * perFoglio).forEach((griglia, idxInFoglio) => {
            const pos = imp.posizioni[idxInFoglio];
            disegnaCartellaSuCanvas(ctx, griglia, f * perFoglio + idxInFoglio + 1, titolo,
                pos.x * s, pos.y * s, imp.larghezzaCartella * s, imp.altezzaCartella * s, s);
        });

        const link = document.createElement('a');
        link.download = `cartelle-${nomeFileDaTitolo(titolo)}-${formato.toLowerCase()}-foglio-${f + 1}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
    }
}

// Stesso disegno del PDF: le misure in mm diventano pixel con 's' (pixel per mm)
function disegnaCartellaSuCanvas(ctx, griglia, numProg, titolo, x, y, w, h, s) {
    const font = punti => `bold ${punti * MM_PER_PUNTO * s}px Helvetica, Arial, sans-serif`;

    ctx.lineWidth = 0.6 * s;
    ctx.strokeStyle = '#212529';
    ctx.strokeRect(x, y, w, h);

    const headerH = ALTEZZA_INTESTAZIONE_MM * s;
    ctx.fillStyle = '#212529';
    ctx.fillRect(x, y, w, headerH);

    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = '#ffc107';
    ctx.font = font(11);
    ctx.textAlign = 'left';
    ctx.fillText(titolo.toUpperCase(), x + 4 * s, y + 6 * s);

    ctx.fillStyle = '#ffffff';
    ctx.font = font(9);
    ctx.textAlign = 'right';
    ctx.fillText(`Cartella N. ${numProg}`, x + w - 4 * s, y + 6 * s);

    const gridY = y + headerH;
    const cellW = w / 9;
    const cellH = (h - headerH) / 3;

    ctx.font = font(14);
    ctx.textAlign = 'center';

    for (let r = 0; r < 3; r++) {
        for (let c = 0; c < 9; c++) {
            const cx = x + c * cellW;
            const cy = gridY + r * cellH;
            const val = griglia[r][c];

            ctx.fillStyle = val !== null ? '#ffffff' : '#e9ecef';
            ctx.fillRect(cx, cy, cellW, cellH);
            ctx.strokeRect(cx, cy, cellW, cellH);

            if (val !== null) {
                ctx.fillStyle = '#0b0b0b';
                ctx.fillText(val.toString(), cx + cellW / 2, cy + cellH / 2 + 2 * s);
            }
        }
    }
}
