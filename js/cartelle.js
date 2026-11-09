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

function creaHTMLCartella(griglia, numeroProgressivo, titolo) {
  let html = `
    <div class="cartella-box">
      <div class="cartella-header">
        <span class="cartella-titolo">${titolo}</span>
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

  if (cartelleCaricate.length > 0) {
    const conferma = confirm(`Ci sono già ${cartelleCaricate.length} cartelle in uso per il controllo vincite.\nVuoi sostituirle con quelle appena generate?`);
    if (!conferma) return;
  }

  impostaCartellePartita(costruisciDatiPartita().cartelle);
  alert(`${cartelleCaricate.length} cartelle in uso per il controllo vincite.\nRicorda di scaricare anche il file .JSON se vuoi riusarle in un altro momento.`);
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

// --- ESPORTAZIONE PDF OFFLINE ---
function generaEScaricaPDF() {
  if (!cartelleGenerateState) return;

  const titolo = document.getElementById('titoloCartella').value || 'Tombola';
  const formato = document.getElementById('formatoStampa').value || 'A4';
  const listaCartelle = cartelleGenerateState;

  if (!window.jspdf) {
    alert('Libreria jsPDF non trovata offline in ./js/lib/jspdf.umd.min.js');
    return;
  }

  const { jsPDF } = window.jspdf;
  const isA3 = formato.toUpperCase() === 'A3';
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: isA3 ? 'a3' : 'a4'
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // A4: 1 colonna x 4 righe = 4 cartelle per foglio
  // A3: 2 colonne x 4 righe = 8 cartelle per foglio
  const colCount = isA3 ? 2 : 1;
  const rowCount = 4;
  const perPagina = colCount * rowCount;
  const marginX = 12;
  const marginY = 12;
  const gapX = 8;
  const gapY = 8;

  const cardW = (pageWidth - (marginX * 2) - (gapX * (colCount - 1))) / colCount;
  const cardH = (pageHeight - (marginY * 2) - (gapY * (rowCount - 1))) / rowCount;

  listaCartelle.forEach((griglia, idx) => {
    const itemIndex = idx % perPagina;

    if (idx > 0 && itemIndex === 0) {
      doc.addPage();
    }

    const col = itemIndex % colCount;
    const row = Math.floor(itemIndex / colCount);
    const x = marginX + col * (cardW + gapX);
    const y = marginY + row * (cardH + gapY);

    disegnaCartellaSuPDF(doc, griglia, idx + 1, titolo, x, y, cardW, cardH);
  });

  doc.save(`cartelle-${titolo.toLowerCase().replace(/\s+/g, '-')}.pdf`);
}

function disegnaCartellaSuPDF(doc, griglia, numProg, titolo, x, y, w, h) {
  doc.setDrawColor(33, 37, 41);
  doc.setLineWidth(0.6);
  doc.rect(x, y, w, h);

  const headerH = 9;
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
  const gridH = h - headerH;
  const cellW = w / 9;
  const cellH = gridH / 3;

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
function esportaComeImmagine() {
  if (!cartelleGenerateState) return;

  const titolo = document.getElementById('titoloCartella').value || 'Tombola';
  const listaCartelle = cartelleGenerateState;

  const cartellePerFoglio = 4;
  const totaleFogli = Math.ceil(listaCartelle.length / cartellePerFoglio);

  for (let f = 0; f < totaleFogli; f++) {
    const canvas = document.createElement('canvas');
    canvas.width = 1600;
    canvas.height = 2260;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const cartelleFoglio = listaCartelle.slice(f * cartellePerFoglio, (f + 1) * cartellePerFoglio);
    const marginX = 80;
    const marginY = 80;
    const gapY = 50;

    const cardW = canvas.width - (marginX * 2);
    const cardH = (canvas.height - (marginY * 2) - (gapY * 3)) / 4;

    cartelleFoglio.forEach((griglia, idxInFoglio) => {
      const idxGlobale = f * cartellePerFoglio + idxInFoglio;
      const x = marginX;
      const y = marginY + idxInFoglio * (cardH + gapY);

      disegnaCartellaSuCanvas(ctx, griglia, idxGlobale + 1, titolo, x, y, cardW, cardH);
    });

    const link = document.createElement('a');
    link.download = `cartelle-${titolo.toLowerCase().replace(/\s+/g, '-')}-foglio-${f + 1}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  }
}

function disegnaCartellaSuCanvas(ctx, griglia, numProg, titolo, x, y, w, h) {
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(x, y, w, h);
  ctx.lineWidth = 4;
  ctx.strokeStyle = '#212529';
  ctx.strokeRect(x, y, w, h);

  const headerH = 65;
  ctx.fillStyle = '#212529';
  ctx.fillRect(x, y, w, headerH);

  ctx.fillStyle = '#ffc107';
  ctx.font = 'bold 28px Arial';
  ctx.textAlign = 'left';
  ctx.fillText(titolo.toUpperCase(), x + 20, y + 42);

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 20px Arial';
  ctx.textAlign = 'right';
  ctx.fillText(`Cartella N. ${numProg}`, x + w - 20, y + 40);

  const gridY = y + headerH;
  const gridH = h - headerH;
  const cellW = w / 9;
  const cellH = gridH / 3;

  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 9; c++) {
      const cx = x + c * cellW;
      const cy = gridY + r * cellH;
      const val = griglia[r][c];

      ctx.strokeStyle = '#333333';
      ctx.lineWidth = 2;
      ctx.strokeRect(cx, cy, cellW, cellH);

      if (val !== null) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(cx + 1, cy + 1, cellW - 2, cellH - 2);

        ctx.fillStyle = '#111111';
        ctx.font = 'bold 36px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(val.toString(), cx + cellW / 2, cy + cellH / 2);
      } else {
        ctx.fillStyle = '#e9ecef';
        ctx.fillRect(cx + 1, cy + 1, cellW - 2, cellH - 2);
      }
    }
  }
}
