// ==========================================================================
// DISEGNO DI UNA CARTELLA
// Un'unica funzione (disegnaCartella) disegna la cartella in millimetri su una
// "superficie": il canvas (anteprima e PNG) oppure il PDF (jsPDF). Così
// anteprima, immagini e PDF sono identici.
//
// Strati: sfondo del tema + pannello semitrasparente (immagine, uguale per
// tutte le cartelle) e sopra, vettoriali e nitidi in stampa, caselle vuote,
// linee della griglia, numeri, riquadro del numero cartella e titolo.
// ==========================================================================

const MM_PER_PUNTO = 25.4 / 72;   // Dimensione dei caratteri: da punti tipografici a mm
const OPACITA_PANNELLO = 0.85;    // Quanto si vede lo sfondo sotto la griglia
const PIXEL_PER_MM_SFONDO_PDF = 10;

// --- IMPAGINAZIONE INTERNA DELLA CARTELLA (mm, relativa all'angolo in alto a sinistra) ---

function layoutCartella(w, h) {
    const margine = h * 0.075;      // Cornice attorno alla griglia, dove si vede lo sfondo
    const intestazione = h * 0.21;
    const altezzaRiquadro = intestazione * 0.68;
    return {
        margine,
        intestazione,
        raggio: h * 0.05,
        pannello: { x: margine, y: intestazione, w: w - margine * 2, h: h - intestazione - margine, r: h * 0.035 },
        riquadro: { x: margine, y: (intestazione - altezzaRiquadro) / 2, h: altezzaRiquadro }
    };
}

// --- COLORI ---

function coloreInRgb(hex) {
    const n = parseInt(hex.slice(1), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function rgbInColore(rgb) {
    return "#" + rgb.map(v => Math.round(v).toString(16).padStart(2, "0")).join("");
}

// Mescola due colori: quota 0 = primo colore, 1 = secondo colore
function mescolaColori(a, b, quota) {
    const ca = coloreInRgb(a), cb = coloreInRgb(b);
    return rgbInColore(ca.map((v, i) => v + (cb[i] - v) * quota));
}

function luminosita(hex) {
    const [r, g, b] = coloreInRgb(hex);
    return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
}

// Contorno del titolo: scuro sotto un titolo chiaro, bianco sotto un titolo scuro
function coloreContornoTitolo(stile) {
    return luminosita(stile.coloreTitolo) > 0.5
        ? mescolaColori(stile.colorePrimario, "#000000", 0.45)
        : "#ffffff";
}

// --- TESTO ---

function fontCanvas(idFont, dimensione) {
    const f = FONT_CARTELLE[idFont] || FONT_CARTELLE.classico;
    return `${f.peso || "normal"} ${dimensione}px ${f.famiglia}`;
}

let contestoMisure = null;

// Larghezza e ingombro verticale di un testo in mm (misurati sul canvas,
// usati sia per il canvas sia per il PDF così le posizioni coincidono)
function misuraTesto(idFont, testo, dimensione) {
    if (!contestoMisure) contestoMisure = document.createElement("canvas").getContext("2d");
    contestoMisure.font = fontCanvas(idFont, 100);
    const m = contestoMisure.measureText(testo);
    const k = dimensione / 100;
    return {
        larghezza: m.width * k,
        ascesa: (m.actualBoundingBoxAscent || 70) * k,
        discesa: (m.actualBoundingBoxDescent || 0) * k
    };
}

// Linea di base per centrare verticalmente un testo misurato
function baseCentrata(centroY, misura) {
    return centroY + (misura.ascesa - misura.discesa) / 2;
}

// --- STRATO DI FONDO (sfondo del tema + pannello), con memoria ---

const memoriaStratiFondo = new Map();

function percorsoArrotondato(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
}

// opaco = true per il PDF (immagine JPEG: gli angoli fuori dalla cartella diventano bianchi)
function creaStratoFondo(stile, w, h, pixelPerMm, opaco) {
    const chiave = [stile.tema, stile.coloreSecondario, w.toFixed(2), h.toFixed(2), pixelPerMm.toFixed(3), opaco].join("|");
    if (memoriaStratiFondo.has(chiave)) return memoriaStratiFondo.get(chiave);

    const canvas = document.createElement("canvas");
    canvas.width = Math.round(w * pixelPerMm);
    canvas.height = Math.round(h * pixelPerMm);
    const ctx = canvas.getContext("2d");
    ctx.scale(pixelPerMm, pixelPerMm);

    if (opaco) {
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, w, h);
    }

    const L = layoutCartella(w, h);
    const tema = TEMI[stile.tema] || TEMI[TEMA_PREDEFINITO];

    ctx.save();
    percorsoArrotondato(ctx, 0, 0, w, h, L.raggio);
    ctx.clip();
    tema.sfondo(ctx, w, h, creaCasuale(semeDaTesto(stile.tema)), L);
    ctx.restore();

    ctx.save();
    ctx.globalAlpha = OPACITA_PANNELLO;
    ctx.fillStyle = stile.coloreSecondario;
    const p = L.pannello;
    percorsoArrotondato(ctx, p.x, p.y, p.w, p.h, p.r);
    ctx.fill();
    ctx.restore();

    const strato = { canvas, chiave };
    if (memoriaStratiFondo.size > 30) memoriaStratiFondo.clear();
    memoriaStratiFondo.set(chiave, strato);
    return strato;
}

// --- LA CARTELLA ---

function disegnaCartella(sup, griglia, numeroProgressivo, titolo, stile, x, y, w, h) {
    const L = layoutCartella(w, h);

    // 1. Sfondo e pannello
    sup.immagine(creaStratoFondo(stile, w, h, sup.pixelPerMm, sup.fondoOpaco), x, y, w, h);

    // 2. Griglia
    const p = L.pannello;
    const px = x + p.x, py = y + p.y;
    const lc = p.w / 9, ac = p.h / 3;
    const rientro = Math.min(lc, ac) * 0.07;
    const tintaVuote = mescolaColori(stile.coloreSecondario, stile.colorePrimario, 0.13);

    for (let r = 0; r < 3; r++) {
        for (let c = 0; c < 9; c++) {
            if (griglia[r][c] === null) {
                sup.rettangolo(px + c * lc + rientro, py + r * ac + rientro, lc - rientro * 2, ac - rientro * 2,
                    rientro * 1.3, { riempimento: tintaVuote });
            }
        }
    }

    const spessoreLinee = h * 0.006;
    for (let c = 1; c < 9; c++) sup.linea(px + c * lc, py, px + c * lc, py + p.h, stile.colorePrimario, spessoreLinee);
    for (let r = 1; r < 3; r++) sup.linea(px, py + r * ac, px + p.w, py + r * ac, stile.colorePrimario, spessoreLinee);
    sup.rettangolo(px, py, p.w, p.h, p.r, { bordo: stile.colorePrimario, spessore: spessoreLinee * 2 });

    // 3. Numeri, grandi e centrati nella casella
    const dimNumeri = ac * 0.74;
    for (let r = 0; r < 3; r++) {
        for (let c = 0; c < 9; c++) {
            const val = griglia[r][c];
            if (val === null) continue;
            const testo = String(val);
            const m = misuraTesto(stile.fontNumeri, testo, dimNumeri);
            sup.testo(testo, px + c * lc + lc / 2, baseCentrata(py + r * ac + ac / 2, m),
                { font: stile.fontNumeri, dimensione: dimNumeri, colore: stile.coloreNumeri, allinea: "center" });
        }
    }

    // 4. Riquadro con il numero della cartella (in alto a sinistra)
    const rq = L.riquadro;
    const testoNumero = String(numeroProgressivo);
    const dimNumero = rq.h * 0.72;
    const mNumero = misuraTesto(stile.fontNumeri, testoNumero, dimNumero);
    const larghezzaRiquadro = Math.max(rq.h * 1.6, mNumero.larghezza + rq.h * 0.8);
    sup.rettangolo(x + rq.x, y + rq.y, larghezzaRiquadro, rq.h, rq.h * 0.25,
        { riempimento: stile.coloreSecondario, bordo: stile.colorePrimario, spessore: spessoreLinee * 1.5 });
    sup.testo(testoNumero, x + rq.x + larghezzaRiquadro / 2, baseCentrata(y + rq.y + rq.h / 2, mNumero),
        { font: stile.fontNumeri, dimensione: dimNumero, colore: stile.coloreNumeroCartella, allinea: "center" });

    // 5. Titolo (in alto a destra), rimpicciolito se troppo lungo
    if (titolo) {
        const spazio = w - L.margine * 2 - larghezzaRiquadro - L.intestazione * 0.5;
        let dimTitolo = L.intestazione * 0.8;
        let mTitolo = misuraTesto(stile.fontTitolo, titolo, dimTitolo);
        if (mTitolo.larghezza > spazio) {
            dimTitolo *= spazio / mTitolo.larghezza;
            mTitolo = misuraTesto(stile.fontTitolo, titolo, dimTitolo);
        }
        sup.testo(titolo, x + w - L.margine - dimTitolo * 0.08, baseCentrata(y + L.intestazione / 2, mTitolo), {
            font: stile.fontTitolo, dimensione: dimTitolo, colore: stile.coloreTitolo, allinea: "right",
            contorno: coloreContornoTitolo(stile), spessoreContorno: dimTitolo * 0.12
        });
    }
}

// --- SUPERFICIE CANVAS (anteprima e PNG) ---

function superficieCanvas(ctx, pixelPerMm) {
    ctx.setTransform(pixelPerMm, 0, 0, pixelPerMm, 0, 0);
    return {
        pixelPerMm,
        fondoOpaco: false,

        immagine(strato, x, y, w, h) {
            ctx.drawImage(strato.canvas, x, y, w, h);
        },

        rettangolo(x, y, w, h, r, { riempimento, bordo, spessore } = {}) {
            percorsoArrotondato(ctx, x, y, w, h, r);
            if (riempimento) {
                ctx.fillStyle = riempimento;
                ctx.fill();
            }
            if (bordo) {
                ctx.strokeStyle = bordo;
                ctx.lineWidth = spessore;
                ctx.stroke();
            }
        },

        linea(x1, y1, x2, y2, colore, spessore) {
            ctx.strokeStyle = colore;
            ctx.lineWidth = spessore;
            ctx.beginPath();
            ctx.moveTo(x1, y1);
            ctx.lineTo(x2, y2);
            ctx.stroke();
        },

        testo(testo, x, y, { font, dimensione, colore, allinea, contorno, spessoreContorno }) {
            ctx.font = fontCanvas(font, dimensione);
            ctx.textAlign = allinea;
            ctx.textBaseline = "alphabetic";
            if (contorno) {
                ctx.lineJoin = "round";
                ctx.strokeStyle = contorno;
                ctx.lineWidth = spessoreContorno;
                ctx.strokeText(testo, x, y);
            }
            ctx.fillStyle = colore;
            ctx.fillText(testo, x, y);
        }
    };
}

// --- SUPERFICIE PDF (jsPDF, unità mm) ---

// Registra nel documento i font usati dallo stile (solo quelli inclusi nell'app)
function registraFontPdf(doc, stile) {
    new Set([stile.fontNumeri, stile.fontTitolo]).forEach(id => {
        const f = FONT_CARTELLE[id];
        if (!f || !f.file) return;
        doc.addFileToVFS(f.file, DATI_FONT_CARTELLE[f.file]);
        doc.addFont(f.file, id, "normal");
    });
}

function superficiePdf(doc) {
    const immaginiJpeg = new Map(); // Ogni sfondo si converte una volta sola e si riusa

    return {
        pixelPerMm: PIXEL_PER_MM_SFONDO_PDF,
        fondoOpaco: true,

        immagine(strato, x, y, w, h) {
            if (!immaginiJpeg.has(strato.chiave)) {
                immaginiJpeg.set(strato.chiave, strato.canvas.toDataURL("image/jpeg", 0.9));
            }
            // L'alias fa inserire l'immagine nel PDF una volta sola anche se ripetuta
            doc.addImage(immaginiJpeg.get(strato.chiave), "JPEG", x, y, w, h, "sfondo-" + semeDaTesto(strato.chiave));
        },

        rettangolo(x, y, w, h, r, { riempimento, bordo, spessore } = {}) {
            if (riempimento) doc.setFillColor(riempimento);
            if (bordo) {
                doc.setDrawColor(bordo);
                doc.setLineWidth(spessore);
            }
            const modo = riempimento && bordo ? "FD" : (riempimento ? "F" : "S");
            doc.roundedRect(x, y, w, h, r, r, modo);
        },

        linea(x1, y1, x2, y2, colore, spessore) {
            doc.setDrawColor(colore);
            doc.setLineWidth(spessore);
            doc.line(x1, y1, x2, y2);
        },

        testo(testo, x, y, { font, dimensione, colore, allinea, contorno, spessoreContorno }) {
            const f = FONT_CARTELLE[font] || FONT_CARTELLE.classico;
            if (f.file) doc.setFont(font, "normal");
            else doc.setFont(f.pdf.nome, f.pdf.stile);
            doc.setFontSize(dimensione / MM_PER_PUNTO);
            if (contorno) {
                doc.setLineJoin("round");
                doc.setDrawColor(contorno);
                doc.setLineWidth(spessoreContorno);
                doc.text(testo, x, y, { align: allinea, renderingMode: "stroke" });
            }
            doc.setTextColor(colore);
            doc.text(testo, x, y, { align: allinea, renderingMode: "fill" });
        }
    };
}
