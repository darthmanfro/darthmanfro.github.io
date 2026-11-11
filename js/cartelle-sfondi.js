// ==========================================================================
// SFONDI DEI TEMI DELLE CARTELLE
// Ogni tema ha una funzione che disegna lo sfondo decorato attorno alla
// griglia e sotto al titolo. Tutto è disegnato con il codice (niente file
// immagine): funziona offline, è nitido a ogni dimensione e non ha diritti.
//
// Firma comune: sfondoXxx(ctx, w, h, rnd, L)
//   ctx  contesto canvas già scalato in millimetri
//   w, h dimensioni della cartella in mm
//   rnd  numeri casuali ripetibili (stesso sfondo su tutte le cartelle)
//   L    impaginazione della cartella (L.intestazione = altezza fascia titolo)
// ==========================================================================

// --- NUMERI CASUALI RIPETIBILI ---

function creaCasuale(seme) {
    let a = seme >>> 0;
    return () => {
        a = (a + 0x6D2B79F5) >>> 0;
        let t = a;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

function semeDaTesto(testo) {
    let h = 2166136261;
    for (const c of testo) {
        h ^= c.charCodeAt(0);
        h = Math.imul(h, 16777619);
    }
    return h >>> 0;
}

const tra = (rnd, min, max) => min + rnd() * (max - min);
const scegli = (rnd, lista) => lista[Math.floor(rnd() * lista.length)];

// --- MATTONCINI DI DISEGNO ---

function riempiGradiente(ctx, w, h, colori, diagonale = false) {
    const g = diagonale ? ctx.createLinearGradient(0, 0, w, h) : ctx.createLinearGradient(0, 0, 0, h);
    colori.forEach((c, i) => g.addColorStop(i / (colori.length - 1), c));
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
}

function riempiRadiale(ctx, w, h, interno, esterno) {
    const g = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w * 0.6);
    g.addColorStop(0, interno);
    g.addColorStop(1, esterno);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
}

// Alone luminoso (sfumatura radiale, indipendente dalla risoluzione)
function alone(ctx, x, y, r, colore, alfa) {
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, colore);
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.save();
    ctx.globalAlpha = alfa;
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
}

function puntino(ctx, x, y, r, colore, alfa) {
    ctx.save();
    ctx.globalAlpha = alfa;
    ctx.fillStyle = colore;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
}

function fiocco(ctx, x, y, r, colore, alfa, rotazione = 0) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rotazione);
    ctx.globalAlpha = alfa;
    ctx.strokeStyle = colore;
    ctx.lineWidth = r * 0.13;
    ctx.lineCap = "round";
    for (let i = 0; i < 6; i++) {
        ctx.rotate(Math.PI / 3);
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(0, -r);
        ctx.moveTo(0, -r * 0.55);
        ctx.lineTo(-r * 0.25, -r * 0.8);
        ctx.moveTo(0, -r * 0.55);
        ctx.lineTo(r * 0.25, -r * 0.8);
        ctx.stroke();
    }
    ctx.restore();
}

function stella(ctx, x, y, r, colore, alfa, punte = 5, interno = 0.45, rotazione = 0) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rotazione);
    ctx.globalAlpha = alfa;
    ctx.fillStyle = colore;
    ctx.beginPath();
    for (let i = 0; i < punte * 2; i++) {
        const raggio = i % 2 === 0 ? r : r * interno;
        const angolo = (i * Math.PI) / punte - Math.PI / 2;
        ctx.lineTo(Math.cos(angolo) * raggio, Math.sin(angolo) * raggio);
    }
    ctx.closePath();
    ctx.fill();
    ctx.restore();
}

// Cuore largo 'l' mm
function cuore(ctx, x, y, l, colore, alfa, rotazione = 0) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rotazione);
    ctx.scale(l / 2, l / 2);
    ctx.globalAlpha = alfa;
    ctx.fillStyle = colore;
    ctx.beginPath();
    ctx.moveTo(0, 0.9);
    ctx.bezierCurveTo(-0.2, 0.7, -1, 0.3, -1, -0.25);
    ctx.bezierCurveTo(-1, -0.75, -0.35, -0.95, 0, -0.45);
    ctx.bezierCurveTo(0.35, -0.95, 1, -0.75, 1, -0.25);
    ctx.bezierCurveTo(1, 0.3, 0.2, 0.7, 0, 0.9);
    ctx.fill();
    ctx.restore();
}

function fiore(ctx, x, y, r, petali, colore, centro, alfa, rotazione = 0) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rotazione);
    ctx.globalAlpha = alfa;
    ctx.fillStyle = colore;
    for (let i = 0; i < petali; i++) {
        ctx.rotate((Math.PI * 2) / petali);
        ctx.beginPath();
        ctx.ellipse(0, -r * 0.52, r * 0.3, r * 0.5, 0, 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.fillStyle = centro;
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.28, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
}

// Foglia lunga 'l' mm con la nervatura centrale
function foglia(ctx, x, y, l, colore, alfa, rotazione = 0, nervatura = "rgba(0,0,0,0.25)") {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rotazione);
    ctx.globalAlpha = alfa;
    ctx.fillStyle = colore;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(l * 0.45, -l * 0.38, l, 0);
    ctx.quadraticCurveTo(l * 0.45, l * 0.38, 0, 0);
    ctx.fill();
    ctx.strokeStyle = nervatura;
    ctx.lineWidth = l * 0.04;
    ctx.beginPath();
    ctx.moveTo(l * 0.05, 0);
    ctx.lineTo(l * 0.85, 0);
    ctx.stroke();
    ctx.restore();
}

// Agrifoglio: due foglie e tre bacche
function agrifoglio(ctx, x, y, l, alfa) {
    foglia(ctx, x, y, l, "#2b9348", alfa, -2.6);
    foglia(ctx, x, y, l, "#1b7a3a", alfa, -0.5);
    [[-0.12, 0.05], [0.08, 0.1], [-0.02, -0.1]].forEach(([dx, dy]) => {
        puntino(ctx, x + dx * l, y + dy * l, l * 0.13, "#d00000", alfa);
        puntino(ctx, x + dx * l - l * 0.04, y + dy * l - l * 0.04, l * 0.04, "#ffffff", alfa * 0.7);
    });
}

// Pallina di Natale appesa a un filo che scende dal bordo alto
function pallina(ctx, x, lunghezzaFilo, r, colore) {
    ctx.save();
    ctx.strokeStyle = "rgba(255,255,255,0.7)";
    ctx.lineWidth = 0.25;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, lunghezzaFilo);
    ctx.stroke();
    ctx.fillStyle = "#dee2e6";
    ctx.fillRect(x - r * 0.3, lunghezzaFilo, r * 0.6, r * 0.35);
    ctx.restore();
    puntino(ctx, x, lunghezzaFilo + r * 1.2, r, colore, 1);
    puntino(ctx, x - r * 0.35, lunghezzaFilo + r * 0.85, r * 0.28, "#ffffff", 0.55);
}

function albero(ctx, x, base, altezza, colore, alfa) {
    ctx.save();
    ctx.globalAlpha = alfa;
    for (let i = 0; i < 3; i++) {
        const top = base - altezza + i * altezza * 0.25;
        const larg = altezza * (0.28 + i * 0.12);
        ctx.fillStyle = colore;
        ctx.beginPath();
        ctx.moveTo(x, top);
        ctx.lineTo(x - larg, top + altezza * 0.42);
        ctx.lineTo(x + larg, top + altezza * 0.42);
        ctx.closePath();
        ctx.fill();
        // Neve sulle punte
        ctx.fillStyle = "#ffffff";
        ctx.beginPath();
        ctx.moveTo(x, top);
        ctx.lineTo(x - larg * 0.3, top + altezza * 0.13);
        ctx.lineTo(x + larg * 0.3, top + altezza * 0.13);
        ctx.closePath();
        ctx.fill();
    }
    ctx.fillStyle = "#5c3d2e";
    ctx.fillRect(x - altezza * 0.06, base - altezza * 0.1, altezza * 0.12, altezza * 0.1);
    ctx.restore();
}

function zucca(ctx, x, y, r) {
    ctx.save();
    ctx.fillStyle = "#5c940d";
    ctx.fillRect(x - r * 0.1, y - r * 1.05, r * 0.2, r * 0.35);
    [["#e8590c", -0.42, 0.62], ["#e8590c", 0.42, 0.62], ["#fd7e14", 0, 0.6]].forEach(([c, dx, rx]) => {
        ctx.fillStyle = c;
        ctx.beginPath();
        ctx.ellipse(x + dx * r, y, r * rx, r * 0.82, 0, 0, Math.PI * 2);
        ctx.fill();
    });
    // Faccia illuminata
    ctx.fillStyle = "#ffd43b";
    [[-1, 1], [1, -1]].forEach(([lato]) => {
        ctx.beginPath();
        ctx.moveTo(x + lato * r * 0.18, y - r * 0.08);
        ctx.lineTo(x + lato * r * 0.5, y - r * 0.08);
        ctx.lineTo(x + lato * r * 0.34, y - r * 0.38);
        ctx.closePath();
        ctx.fill();
    });
    ctx.beginPath();
    ctx.moveTo(x - r * 0.5, y + r * 0.15);
    for (let i = 0; i <= 6; i++) {
        ctx.lineTo(x - r * 0.5 + (i * r) / 6, y + r * (i % 2 === 0 ? 0.3 : 0.45));
    }
    ctx.lineTo(x + r * 0.5, y + r * 0.15);
    ctx.quadraticCurveTo(x, y + r * 0.75, x - r * 0.5, y + r * 0.15);
    ctx.fill();
    ctx.restore();
}

// Pipistrello con apertura alare 'l' mm
function pipistrello(ctx, x, y, l, colore, rotazione = 0) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rotazione);
    ctx.scale(l / 2, l / 2);
    ctx.fillStyle = colore;
    ctx.beginPath();
    ctx.moveTo(-1, -0.2);
    ctx.quadraticCurveTo(-0.6, -0.5, -0.15, -0.15);
    ctx.lineTo(-0.12, -0.38);
    ctx.lineTo(-0.03, -0.22);
    ctx.lineTo(0.03, -0.22);
    ctx.lineTo(0.12, -0.38);
    ctx.lineTo(0.15, -0.15);
    ctx.quadraticCurveTo(0.6, -0.5, 1, -0.2);
    ctx.quadraticCurveTo(0.8, 0, 0.75, 0.2);
    ctx.quadraticCurveTo(0.6, 0.05, 0.45, 0.15);
    ctx.quadraticCurveTo(0.3, 0, 0.15, 0.15);
    ctx.quadraticCurveTo(0, 0.32, -0.15, 0.15);
    ctx.quadraticCurveTo(-0.3, 0, -0.45, 0.15);
    ctx.quadraticCurveTo(-0.6, 0.05, -0.75, 0.2);
    ctx.quadraticCurveTo(-0.8, 0, -1, -0.2);
    ctx.fill();
    ctx.restore();
}

// Luna piena (falce = false) o falce di luna
function luna(ctx, x, y, r, colore, falce) {
    alone(ctx, x, y, r * 2.4, colore, 0.35);
    ctx.save();
    ctx.translate(x, y);
    ctx.fillStyle = colore;
    ctx.beginPath();
    if (falce) {
        const d = r * 0.6;
        const yi = Math.sqrt(r * r - (d * d) / 4);
        const theta = Math.atan2(yi, d / 2);
        const phi = Math.atan2(yi, -d / 2);
        ctx.arc(0, 0, r, theta, Math.PI * 2 - theta);
        ctx.arc(d, 0, r, -phi, phi, true);
    } else {
        ctx.arc(0, 0, r, 0, Math.PI * 2);
    }
    ctx.fill();
    if (!falce) {
        // Qualche cratere
        ctx.fillStyle = "rgba(0,0,0,0.08)";
        [[-0.3, -0.2, 0.22], [0.25, 0.25, 0.16], [0.1, -0.4, 0.1]].forEach(([dx, dy, rr]) => {
            ctx.beginPath();
            ctx.arc(dx * r, dy * r, rr * r, 0, Math.PI * 2);
            ctx.fill();
        });
    }
    ctx.restore();
}

function sole(ctx, x, y, r) {
    alone(ctx, x, y, r * 2.6, "#fff3bf", 0.7);
    ctx.save();
    ctx.translate(x, y);
    ctx.fillStyle = "#fcc419";
    for (let i = 0; i < 12; i++) {
        ctx.rotate(Math.PI / 6);
        ctx.beginPath();
        ctx.moveTo(-r * 0.18, -r * 1.15);
        ctx.lineTo(0, -r * 1.65);
        ctx.lineTo(r * 0.18, -r * 1.15);
        ctx.closePath();
        ctx.fill();
    }
    ctx.fillStyle = "#ffd43b";
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
}

function nuvola(ctx, x, y, l, alfa) {
    [[0, 0, 0.3], [0.28, -0.12, 0.26], [0.52, 0.02, 0.22], [-0.25, 0.05, 0.2]].forEach(([dx, dy, r]) => {
        puntino(ctx, x + dx * l, y + dy * l, r * l, "#ffffff", alfa);
    });
}

function gabbiano(ctx, x, y, l, colore) {
    ctx.save();
    ctx.strokeStyle = colore;
    ctx.lineWidth = l * 0.09;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(x - l / 2, y);
    ctx.quadraticCurveTo(x - l / 4, y - l * 0.3, x, y);
    ctx.quadraticCurveTo(x + l / 4, y - l * 0.3, x + l / 2, y);
    ctx.stroke();
    ctx.restore();
}

function onde(ctx, w, daY, aY, passo, colore, alfa) {
    ctx.save();
    ctx.globalAlpha = alfa;
    ctx.strokeStyle = colore;
    ctx.lineWidth = 0.35;
    for (let y = daY; y < aY; y += passo) {
        ctx.beginPath();
        for (let x = 0; x <= w; x += 1) {
            const yy = y + Math.sin(x / 3 + y) * 0.6;
            if (x === 0) ctx.moveTo(x, yy);
            else ctx.lineTo(x, yy);
        }
        ctx.stroke();
    }
    ctx.restore();
}

// Spazio libero nella fascia del titolo, tra il riquadro del numero e il titolo
function zonaLiberaIntestazione(w) {
    return { da: w * 0.17, a: w * 0.55 };
}

// --- SFONDI DEI TEMI ---

function sfondoClassico(ctx, w, h) {
    ctx.fillStyle = "#212529";
    ctx.fillRect(0, 0, w, h);
    ctx.save();
    ctx.strokeStyle = "rgba(255,255,255,0.05)";
    ctx.lineWidth = 1.2;
    for (let x = -h; x < w; x += 4) {
        ctx.beginPath();
        ctx.moveTo(x, h);
        ctx.lineTo(x + h, 0);
        ctx.stroke();
    }
    ctx.restore();
}

function sfondoNatale(ctx, w, h, rnd, L) {
    riempiRadiale(ctx, w, h, "#c1121f", "#6a040f");
    for (let i = 0; i < 28; i++) {
        fiocco(ctx, tra(rnd, 0, w), tra(rnd, 0, h), tra(rnd, 1.5, 4), "#ffffff", tra(rnd, 0.25, 0.6), rnd() * Math.PI);
    }
    for (let i = 0; i < 14; i++) {
        stella(ctx, tra(rnd, 0, w), tra(rnd, 0, h), tra(rnd, 0.6, 1.4), "#ffd43b", 0.85);
    }
    const zona = zonaLiberaIntestazione(w);
    const colori = ["#ffd43b", "#2b9348", "#f8f9fa", "#4dabf7", "#ffd43b"];
    for (let i = 0; i < 5; i++) {
        const x = zona.da + ((zona.a - zona.da) * (i + 0.5)) / 5;
        pallina(ctx, x, tra(rnd, 1.5, L.intestazione * 0.45), tra(rnd, 1.6, 2.3), colori[i]);
    }
    agrifoglio(ctx, 5, h - 4, 7, 1);
    agrifoglio(ctx, w - 5, h - 4, 7, 1);
}

function sfondoNeve(ctx, w, h, rnd, L) {
    riempiGradiente(ctx, w, h, ["#4f7fa6", "#9cc2dc", "#d8e9f3"]);
    for (let i = 0; i < 140; i++) {
        puntino(ctx, tra(rnd, 0, w), tra(rnd, 0, h), tra(rnd, 0.2, 0.6), "#ffffff", tra(rnd, 0.5, 0.95));
    }
    for (let i = 0; i < 30; i++) {
        fiocco(ctx, tra(rnd, 0, w), tra(rnd, 0, h), tra(rnd, 1.2, 4.5), "#ffffff", tra(rnd, 0.4, 0.85), rnd() * Math.PI);
    }
    const zona = zonaLiberaIntestazione(w);
    [0.15, 0.32, 0.5, 0.75].forEach((p, i) => {
        albero(ctx, zona.da + (zona.a - zona.da) * p, L.intestazione + 0.5, L.intestazione * (i % 2 ? 0.75 : 0.95), "#2f5d62", 0.85);
    });
    ctx.save();
    ctx.fillStyle = "rgba(255,255,255,0.9)";
    ctx.beginPath();
    ctx.moveTo(0, h);
    ctx.lineTo(0, h * 0.82);
    ctx.quadraticCurveTo(w * 0.2, h * 0.7, w * 0.4, h * 0.84);
    ctx.quadraticCurveTo(w * 0.65, h * 0.72, w, h * 0.8);
    ctx.lineTo(w, h);
    ctx.fill();
    ctx.restore();
}

function sfondoHalloween(ctx, w, h, rnd, L) {
    riempiGradiente(ctx, w, h, ["#0d0221", "#2a0f45", "#4a1d6e"]);
    for (let i = 0; i < 50; i++) {
        puntino(ctx, tra(rnd, 0, w), tra(rnd, 0, h), tra(rnd, 0.15, 0.45), "#ffffff", tra(rnd, 0.3, 0.9));
    }
    const zona = zonaLiberaIntestazione(w);
    const xLuna = zona.da + (zona.a - zona.da) * 0.55;
    luna(ctx, xLuna, L.intestazione * 0.5, L.intestazione * 0.36, "#ffe8a3", false);
    for (let i = 0; i < 6; i++) {
        pipistrello(ctx, tra(rnd, zona.da, zona.a), tra(rnd, 1.5, L.intestazione - 1.5), tra(rnd, 3.5, 6.5), "#0b0b0b", tra(rnd, -0.3, 0.3));
    }
    zucca(ctx, zona.da + 3, L.intestazione - 2.6, 2.6);
    zucca(ctx, zona.a - 2, L.intestazione - 2.2, 2.2);
    zucca(ctx, w - 7, h - 5, 4);
    zucca(ctx, 7, h - 5, 3.5);
}

function sfondoNotte(ctx, w, h, rnd, L) {
    riempiGradiente(ctx, w, h, ["#06122b", "#0f2752", "#1d3f7a"]);
    for (let i = 0; i < 90; i++) {
        puntino(ctx, tra(rnd, 0, w), tra(rnd, 0, h), tra(rnd, 0.15, 0.5), "#ffffff", tra(rnd, 0.3, 1));
    }
    for (let i = 0; i < 10; i++) {
        stella(ctx, tra(rnd, 0, w), tra(rnd, 0, h), tra(rnd, 0.9, 2), "#ffffff", 0.9, 4, 0.25);
    }
    const zona = zonaLiberaIntestazione(w);
    luna(ctx, zona.da + (zona.a - zona.da) * 0.6, L.intestazione * 0.5, L.intestazione * 0.33, "#ffe066", true);
    // Stella cadente
    ctx.save();
    const g = ctx.createLinearGradient(zona.da, 2, zona.da + 14, 6);
    g.addColorStop(0, "rgba(255,255,255,0)");
    g.addColorStop(1, "rgba(255,255,255,0.9)");
    ctx.strokeStyle = g;
    ctx.lineWidth = 0.5;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(zona.da, 2);
    ctx.lineTo(zona.da + 14, 6);
    ctx.stroke();
    ctx.restore();
    stella(ctx, zona.da + 14, 6, 1.2, "#ffffff", 1, 4, 0.3);
}

function sfondoSanValentino(ctx, w, h, rnd, L) {
    riempiGradiente(ctx, w, h, ["#ff4d6d", "#ff8fa3", "#ffccd5"], true);
    const colori = ["#ffffff", "#ff0a54", "#ffb3c1", "#c9184a"];
    for (let i = 0; i < 34; i++) {
        cuore(ctx, tra(rnd, 0, w), tra(rnd, 0, h), tra(rnd, 2, 7), scegli(rnd, colori), tra(rnd, 0.35, 0.8), tra(rnd, -0.4, 0.4));
    }
    const zona = zonaLiberaIntestazione(w);
    [[0.2, 7, "#ffffff"], [0.45, 9, "#c9184a"], [0.72, 6, "#ffffff"]].forEach(([p, l, c]) => {
        cuore(ctx, zona.da + (zona.a - zona.da) * p, L.intestazione * 0.5, l, c, 0.95, tra(rnd, -0.25, 0.25));
    });
}

function sfondoFiori(ctx, w, h, rnd) {
    riempiGradiente(ctx, w, h, ["#d8f3dc", "#f1faee", "#fff3bf"], true);
    const colori = ["#f783ac", "#ffd43b", "#b197fc", "#ffffff", "#ff8787"];
    const fiori = [];
    for (let i = 0; i < 26; i++) {
        fiori.push({ x: tra(rnd, 0, w), y: tra(rnd, 0, h), r: tra(rnd, 2, 5.5), petali: rnd() < 0.5 ? 5 : 6, colore: scegli(rnd, colori), rot: rnd() * Math.PI });
    }
    fiori.forEach(f => {
        foglia(ctx, f.x, f.y, f.r * 1.6, "#52b788", 0.9, f.rot + 0.6);
        foglia(ctx, f.x, f.y, f.r * 1.4, "#40916c", 0.9, f.rot + 2.8);
    });
    fiori.forEach(f => fiore(ctx, f.x, f.y, f.r, f.petali, f.colore, "#f59f00", 0.95, f.rot));
}

function sfondoEstate(ctx, w, h, rnd, L) {
    const orizzonte = L.intestazione * 0.95;
    riempiGradiente(ctx, w, h, ["#74c0fc", "#a5d8ff"]);
    ctx.save();
    const mare = ctx.createLinearGradient(0, orizzonte, 0, h);
    mare.addColorStop(0, "#22b8cf");
    mare.addColorStop(1, "#0b7285");
    ctx.fillStyle = mare;
    ctx.fillRect(0, orizzonte, w, h - orizzonte);
    ctx.restore();
    onde(ctx, w, orizzonte + 1.5, h, 3, "#ffffff", 0.45);
    const zona = zonaLiberaIntestazione(w);
    sole(ctx, zona.da + (zona.a - zona.da) * 0.62, L.intestazione * 0.48, L.intestazione * 0.24);
    nuvola(ctx, zona.da + 4, L.intestazione * 0.4, 7, 0.9);
    nuvola(ctx, w * 0.75, L.intestazione * 0.3, 6, 0.6);
    for (let i = 0; i < 3; i++) {
        gabbiano(ctx, zona.da + (zona.a - zona.da) * (0.3 + i * 0.12), tra(rnd, 2, L.intestazione * 0.5), tra(rnd, 2.2, 3.2), "#343a40");
    }
}

function sfondoAutunno(ctx, w, h, rnd) {
    riempiGradiente(ctx, w, h, ["#7f4f24", "#b6683a", "#e09f3e"], true);
    const colori = ["#d00000", "#e85d04", "#faa307", "#9c6644", "#ffba08"];
    for (let i = 0; i < 40; i++) {
        foglia(ctx, tra(rnd, 0, w), tra(rnd, 0, h), tra(rnd, 3, 7.5), scegli(rnd, colori), tra(rnd, 0.6, 0.95), rnd() * Math.PI * 2);
    }
}
