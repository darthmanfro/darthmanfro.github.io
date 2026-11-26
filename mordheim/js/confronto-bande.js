// ==========================================================================
// CONFRONTO TRA BANDE
// Scheda Confronto: due posti (slot 1 e slot 2) in cui mandare una banda
// dalla scheda Banda o una proposta dell'Ottimizzatore. Le due bande, anche
// di tipi diversi, si calcolano con gli stessi conti e le stesse scelte
// dell'Ottimizzatore (contro, obiettivo, tiro, campagna) e si mettono a
// confronto riga per riga.
// Gli slot restano nelle impostazioni (impostazioni.slotConfronto):
// [{ bandaId, corone, origine, unita: [{ tipoId, numero, equip }] } | null, ...]
// ==========================================================================

const NUMERO_SLOT = 2;

// Slot valido (banda e unità ancora presenti nei dati) oppure null
function slotConfronto(indice) {
    const slot = (impostazioni.slotConfronto || [])[indice];
    const banda = slot && Dati.bande[slot.bandaId];
    return banda && Number.isFinite(slot.corone) && unitaValide(banda, slot.unita) ? slot : null;
}

function salvaInSlot(indice, slot) {
    const slots = [...(impostazioni.slotConfronto || [])];
    while (slots.length < NUMERO_SLOT) slots.push(null);
    slots[indice] = slot;
    impostazioni.slotConfronto = slots;
}

const copiaUnita = unita => unita.map(u => ({ tipoId: u.tipoId, numero: u.numero, equip: [...u.equip] }));

// Manda allo slot la banda della scheda Banda
function slotDaBanda(indice) {
    salvaInSlot(indice, { bandaId: statoBanda.bandaId, corone: statoBanda.corone,
        origine: 'Scheda Banda', unita: copiaUnita(statoBanda.unita) });
}

// Manda allo slot una proposta dell'Ottimizzatore
function slotDaProposta(indice, numeroProposta) {
    const proposta = proposte && proposte[numeroProposta];
    if (!proposta) return;
    salvaInSlot(indice, { bandaId: statoBanda.bandaId, corone: statoBanda.corone,
        origine: 'Proposta ' + (numeroProposta + 1), unita: copiaUnita(proposta.unita) });
}

// Rimette la banda dello slot nella scheda Banda (apre il suo tipo di banda e sostituisce le unità)
function slotInBanda(indice) {
    const slot = slotConfronto(indice);
    if (!slot) return;
    const banda = Dati.bande[slot.bandaId];
    if (statoBanda.bandaId !== slot.bandaId) {
        salvaBanda();
        apriBanda(slot.bandaId);
    }
    const { unita, prossimoUid } = unitaDaProposta(banda, slot);
    statoBanda.unita = unita;
    statoBanda.prossimoUid = prossimoUid;
    statoBanda.corone = slot.corone;
    riempiSceltaBanda();
    mostraCorone();
    impostazioni.scheda = 'banda';
}

// Firma di una banda che non dipende da come i modelli sono divisi in gruppi né dall'ordine
function firmaUnita(unita) {
    const conteggi = {};
    for (const u of unita) {
        const chiave = u.tipoId + ':' + [...u.equip].sort().join('+');
        conteggi[chiave] = (conteggi[chiave] || 0) + u.numero;
    }
    return Object.keys(conteggi).sort().map(k => conteggi[k] + 'x' + k).join('|');
}

// Lo slot contiene già proprio questa banda?
function slotContiene(indice, bandaId, unita) {
    const slot = slotConfronto(indice);
    return !!slot && slot.bandaId === bandaId && firmaUnita(slot.unita) === firmaUnita(unita);
}

// Pulsanti "Slot 1" "Slot 2" (azione: slotDaBanda | slotDaProposta) per la banda "unita";
// lo slot che la contiene già ha la spunta
function pulsantiSlot(azione, unita, attributi = '') {
    return Array.from({ length: NUMERO_SLOT }, (_, i) => {
        const dentro = unita.length > 0 && slotContiene(i, statoBanda.bandaId, unita);
        return `
        <button type="button" class="btn btn-slot ${dentro ? 'nello-slot' : ''}" data-azione="${azione}" data-slot="${i}" ${attributi}
                ${unita.length === 0 ? 'disabled' : ''}
                title="${dentro ? 'È già nello' : 'Manda questa banda allo'} slot ${i + 1} della scheda Confronto bande">Slot ${i + 1}${dentro ? ' ✓' : ''}</button>`;
    }).join('');
}

// Valori di una banda dello slot, con gli stessi conti delle proposte
function valoriSlot(slot) {
    const banda = Dati.bande[slot.bandaId];
    return {
        banda,
        costo: costoTotale(banda, slot.unita),
        modelli: contaModelli(slot.unita),
        ...valoriBanda(banda, slot.unita, bersagliOttimizzatore(), opzioniOttimizzatore())
    };
}

function disegnaConfrontoBande() {
    const slots = Array.from({ length: NUMERO_SLOT }, (_, i) => slotConfronto(i));
    const valori = slots.map(s => (s ? valoriSlot(s) : null));
    document.getElementById('confronto-bande').innerHTML = `
        <div class="pannello">
            <h2>Confronto tra due bande ${iconaInfo('confrontoBande')}</h2>
            <p class="nota">Contro ${impostazioni.avversari === 'misti' ? '' : 'il bersaglio '}<strong>${escapeHtml(descrizioneAvversari())}</strong>,
                obiettivo <strong>${escapeHtml(OBIETTIVI[impostazioni.obiettivo])}</strong>: si cambiano nella scheda Ottimizzatore.
                Le bande si mandano qui con i pulsanti <em>Slot 1</em> e <em>Slot 2</em> della scheda Banda e delle proposte.</p>
            ${valori[0] && valori[1] ? tabellaConfrontoBande(slots, valori) : ''}
        </div>
        <div class="confronto-bande-colonne">
            ${slots.map((s, i) => schedaSlot(s, valori[i], i)).join('')}
        </div>`;
}

// Riepilogo riga per riga: in verde il migliore
function tabellaConfrontoBande(slots, valori) {
    const righe = [
        ['Banda', v => escapeHtml(v.banda.nome), null],
        ['Corone spese', v => String(v.costo), 'basso'],
        ['Modelli', v => String(v.modelli), null],
        ['Attacco', v => formatta(v.attacco), 'alto'],
        ['Resistenza', v => formatta(v.resistenza, 1), 'alto'],
        ['Indice', v => `<strong>${formatta(v.indice)}</strong>`, 'alto']
    ];
    const chiavi = { 'Corone spese': 'costo', Attacco: 'attacco', Resistenza: 'resistenza', Indice: 'indice' };
    const corpo = righe.map(([etichetta, testo, verso]) => {
        let migliore = -1;
        if (verso) {
            const [a, b] = valori.map(v => v[chiavi[etichetta]]);
            if (Math.abs(a - b) > 1e-9) migliore = (verso === 'alto') === (a > b) ? 0 : 1;
        }
        return `<tr><th scope="row">${etichetta}</th>${valori.map((v, k) =>
            `<td class="${k === migliore ? 'migliore' : ''}">${testo(v)}</td>`).join('')}</tr>`;
    }).join('');
    const [primo, secondo] = valori.map(v => v.indice);
    let esito = 'Le due bande hanno lo stesso indice.';
    if (Math.abs(primo - secondo) > 1e-9 && Math.min(primo, secondo) > 0) {
        const meglio = primo > secondo ? 0 : 1;
        const scarto = (Math.max(primo, secondo) / Math.min(primo, secondo) - 1) * 100;
        esito = `Lo <strong>slot ${meglio + 1}</strong> ha l'indice più alto del ${formatta(scarto, 1)}%.`;
    }
    return `
        <table class="tabella-confronto tabella-confronto-bande">
            <thead><tr><th></th>${slots.map((s, i) => `<th scope="col">Slot ${i + 1}: ${escapeHtml(s.origine)}</th>`).join('')}</tr></thead>
            <tbody>${corpo}</tbody>
        </table>
        <p class="confronto-bande-esito">${esito}</p>`;
}

function schedaSlot(slot, v, i) {
    if (!slot) {
        return `
            <article class="proposta proposta-slot slot-vuoto">
                <header class="proposta-testata"><h3>Slot ${i + 1}</h3></header>
                <p class="nota">Vuoto. Manda qui una banda con il pulsante <em>Slot ${i + 1}</em> della scheda Banda
                    (riepilogo in alto) o di una proposta dell'Ottimizzatore.</p>
            </article>`;
    }
    const problemi = controllaBanda(v.banda, slot.unita, slot.corone)
        .map(p => `<li class="${p.grave ? 'problema grave' : 'problema'}">${escapeHtml(p.testo)}</li>`).join('');
    return `
        <article class="proposta proposta-slot">
            <header class="proposta-testata">
                <h3>Slot ${i + 1}: ${escapeHtml(slot.origine)}</h3>
                <span>${escapeHtml(v.banda.nome)} · ${v.costo} / ${slot.corone} corone · ${v.modelli} modelli</span>
            </header>
            ${problemi ? `<ul class="problemi">${problemi}</ul>` : ''}
            <div class="proposta-valori">
                <span>Attacco <strong>${formatta(v.attacco)}</strong></span>
                <span>Resistenza <strong>${formatta(v.resistenza, 1)}</strong></span>
                <span>Indice <strong>${formatta(v.indice)}</strong></span>
            </div>
            ${tabellaUnita(v.banda, righeConRendimento(v.banda, slot.unita))}
            <div class="slot-comandi">
                <button type="button" class="btn" data-azione="slotInBanda" data-slot="${i}"
                        title="Sostituisce la banda della scheda Banda (e apre questo tipo di banda)">Rimettila nella scheda Banda</button>
                <button type="button" class="btn" data-azione="svuotaSlot" data-slot="${i}">Svuota</button>
            </div>
        </article>`;
}

// Restituisce true se ha gestito l'evento
function gestisciComandoConfrontoBande(elemento) {
    const indice = Number(elemento.dataset.slot);
    switch (elemento.dataset.azione) {
        case 'slotDaBanda': slotDaBanda(indice); return true;
        case 'slotDaProposta': slotDaProposta(indice, Number(elemento.dataset.indice)); return true;
        case 'slotInBanda': slotInBanda(indice); return true;
        case 'svuotaSlot': salvaInSlot(indice, null); return true;
        default: return false;
    }
}
