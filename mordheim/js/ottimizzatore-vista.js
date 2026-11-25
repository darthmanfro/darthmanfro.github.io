// ==========================================================================
// OTTIMIZZATORE - VISTA
// Scheda Ottimizzatore: obiettivo, peso del tiro, avvio del calcolo e
// proposte di banda da copiare nella scheda Banda.
// ==========================================================================

let proposte = null;           // ultime proposte calcolate
let chiaveProposte = '';       // dati con cui sono state calcolate
let calcoloInCorso = false;

const OBIETTIVI = {
    equilibrio: 'Equilibrio: attacco × resistenza',
    attacco: 'Massimo attacco'
};
const PESI_CAMPAGNA = {
    0: 'Prima partita: nessun bonus',
    0.15: 'Campagna: +15% a chi guadagna esperienza',
    0.3: 'Campagna lunga: +30% a chi guadagna esperienza'
};
const PESI_TIRO = {
    0: 'Non conta',
    0.5: 'Conta la metà del corpo a corpo',
    1: 'Conta come il corpo a corpo'
};

// Le proposte valgono solo per la banda, le corone, il bersaglio e le opzioni con cui sono state calcolate
function chiaveCalcolo() {
    return JSON.stringify([statoBanda.bandaId, statoBanda.corone, impostazioni.bersaglio,
        impostazioni.personalizzato, opzioniCalcolo(), impostazioni.obiettivo, impostazioni.pesoTiro, impostazioni.pesoCampagna]);
}

function disegnaOttimizzatore() {
    const banda = bandaCorrente();
    const opzioni = (elenco, scelto) => Object.entries(elenco)
        .map(([v, testo]) => `<option value="${v}" ${String(scelto) === v ? 'selected' : ''}>${testo}</option>`).join('');
    document.getElementById('ottimizzatore-comandi').innerHTML = `
        <h2>Banda migliore per ${escapeHtml(banda.nome)} con ${statoBanda.corone} corone</h2>
        <p class="nota">Contro il bersaglio <strong>${escapeHtml(bersaglioCorrente().nome)}</strong>
            (si cambia in alto; il turno di corpo a corpo e le opzioni di tiro sono quelle della scheda Probabilità).</p>
        <div class="ottimizzatore-scelte">
            <div class="campo-riga">
                <span>Obiettivo ${iconaInfo('obiettivo')}</span>
                <select data-azione="obiettivo" aria-label="Obiettivo">${opzioni(OBIETTIVI, impostazioni.obiettivo)}</select>
            </div>
            <div class="campo-riga">
                <span>Tiro ${iconaInfo('pesoTiro')}</span>
                <select data-azione="pesoTiro" aria-label="Tiro">${opzioni(PESI_TIRO, impostazioni.pesoTiro)}</select>
            </div>
            <div class="campo-riga">
                <span>Campagna ${iconaInfo('campagna')}</span>
                <select data-azione="pesoCampagna" aria-label="Campagna">${opzioni(PESI_CAMPAGNA, impostazioni.pesoCampagna)}</select>
            </div>
            <button type="button" class="btn btn-primario" data-azione="ottimizza" ${calcoloInCorso ? 'disabled' : ''}>
                ${calcoloInCorso ? 'Calcolo in corso…' : 'Calcola la banda migliore'}
            </button>
        </div>
        <progress id="avanzamento" class="${calcoloInCorso ? 'avanzamento' : 'avanzamento nascosto'}" max="1" value="0"></progress>`;
    disegnaProposte(banda);
}

// Opzioni del calcolo: quelle della scheda Probabilità più le scelte dell'Ottimizzatore
function opzioniOttimizzatore() {
    return { ...opzioniCalcolo(), obiettivo: impostazioni.obiettivo,
        pesoTiro: Number(impostazioni.pesoTiro), pesoCampagna: Number(impostazioni.pesoCampagna) };
}

// Prima proposta, se è stata calcolata con i dati attuali (altrimenti null)
function propostaMigliore() {
    return proposte && proposte.length > 0 && chiaveProposte === chiaveCalcolo() ? proposte[0] : null;
}

// Banda mandata dalla scheda Banda per il confronto, se è della banda aperta e ancora valida
function bandaInviata(banda) {
    const b = impostazioni.bandaInviata;
    const valida = b && b.bandaId === banda.id && Array.isArray(b.unita) && b.unita.every(u => {
        const t = tipoDi(banda, u.tipoId);
        return t && Number.isInteger(u.numero) && u.numero >= 1 && Array.isArray(u.equip)
            && u.equip.every(id => oggettiAcquistabili(banda, t.tipo, t.eroe).some(v => v.id === id));
    });
    return valida ? b : null;
}

function disegnaProposte(banda) {
    const contenitore = document.getElementById('ottimizzatore-proposte');
    const inviata = bandaInviata(banda);
    const tua = inviata ? schedaBandaInviata(banda, inviata) : '';
    if (!proposte || chiaveProposte !== chiaveCalcolo()) {
        contenitore.innerHTML = tua + `
            <p class="nota spiegazione">Per ogni modello si provano tutte le combinazioni di equipaggiamento della lista
            (fino a due armi da corpo a corpo, un'arma da tiro, armatura, scudo o brocchiere, elmo) e poi si cerca la
            composizione con l'indice più alto senza superare le corone. <strong>Attacco</strong>: bersagli messi fuori
            combattimento in un turno da tutta la banda (il tiro pesa secondo la scelta). <strong>Resistenza</strong>:
            turni di attacchi del bersaglio che servono in media per mettere fuori combattimento ogni modello, sommati.
            <strong>Equilibrio</strong> moltiplica i due valori: conta quanto colpisci e quanto a lungo resti in campo,
            per questo spesso conviene avere tanti modelli. <strong>Campagna</strong>: eroi e truppa che guadagnano
            esperienza cresceranno partita dopo partita, gli animali (Ratti giganti, Mastini, Zombi, Lupi Neri...) no
            e non possono comprare armi; con il bonus campagna i primi valgono di più (attacco, resistenza e indice
            delle proposte lo comprendono, i fuori combattimento a turno delle righe no).</p>`;
        return;
    }
    if (proposte.length === 0) {
        contenitore.innerHTML = tua + '<p class="problema grave">Con queste corone non si riesce a comporre una banda valida.</p>';
        return;
    }
    contenitore.innerHTML = tua + proposte.map((p, i) => `
        <article class="proposta">
            <header class="proposta-testata">
                <h3>Proposta ${i + 1}</h3>
                <span>${p.costo} corone · ${p.modelli} modelli</span>
                <button type="button" class="btn btn-primario" data-azione="usaProposta" data-indice="${i}">Usa questa banda</button>
            </header>
            <div class="proposta-valori">
                <span>Attacco <strong>${formatta(p.attacco)}</strong></span>
                <span>Resistenza <strong>${formatta(p.resistenza, 1)}</strong></span>
                <span>Indice <strong>${formatta(p.indice)}</strong></span>
                ${iconaInfo('valoriProposta')}
            </div>
            ${tabellaUnita(banda, p.unita)}
        </article>`).join('');
}

// Righe dei modelli: unita = [{ tipoId, numero, equip, corpo, tiro }]
function tabellaUnita(banda, unita) {
    return `
        <table class="proposta-unita">
            <thead><tr><th>Modelli</th><th>Equipaggiamento</th><th>Corone</th><th>Fuori comb. a turno</th></tr></thead>
            <tbody>
                ${unita.map(u => {
                    const { tipo } = tipoDi(banda, u.tipoId);
                    const costo = costoModello(banda, u);
                    const equip = tipo.animale ? 'armi naturali'
                        : ['pugnale', ...u.equip.map(id => Dati.equip[id].nome.toLowerCase())].join(', ');
                    const tiro = u.tiro > 0 ? ` <span class="nota">+ ${formatta(u.tiro * u.numero)} al tiro</span>` : '';
                    return `<tr>
                        <td>${u.numero} × ${escapeHtml(tipo.nome)}</td>
                        <td>${escapeHtml(equip)}</td>
                        <td>${u.numero > 1 ? `${costo} × ${u.numero} = ` : ''}${costo * u.numero}</td>
                        <td>${formatta(u.corpo * u.numero)}${tiro}</td>
                    </tr>`;
                }).join('')}
            </tbody>
        </table>`;
}

// La banda mandata dalla scheda Banda, calcolata come le proposte con i dati attuali
function schedaBandaInviata(banda, inviata) {
    const bersaglio = bersaglioCorrente();
    const v = valoriBanda(banda, inviata.unita, bersaglio, opzioniOttimizzatore());
    const unita = inviata.unita.map(u => {
        const { tipo } = tipoDi(banda, u.tipoId);
        const val = valutaModello(modelloPerMotore(tipo, u.equip), bersaglio, opzioniCalcolo());
        return { ...u, corpo: val.attacco.pFuori, tiro: val.tiro ? val.tiro.fuoriPerTurno : 0 };
    });
    const prima = propostaMigliore();
    let confronto = '';
    if (prima && prima.indice > 0) {
        const scarto = (v.indice / prima.indice - 1) * 100;
        const classe = scarto > 0.05 ? 'scarto meglio' : scarto < -0.05 ? 'scarto peggio' : 'scarto';
        confronto = `<span class="${classe}">${scarto >= 0 ? '+' : ''}${formatta(scarto, 1)}% rispetto alla proposta 1</span>`;
    }
    const problemi = controllaBanda(banda, inviata.unita, statoBanda.corone)
        .map(p => `<li class="${p.grave ? 'problema grave' : 'problema'}">${escapeHtml(p.testo)}</li>`).join('');
    return `
        <article class="proposta proposta-tua">
            <header class="proposta-testata">
                <h3>La tua banda ${iconaInfo('bandaInviata')}</h3>
                <span>${costoTotale(banda, inviata.unita)} corone · ${contaModelli(inviata.unita)} modelli</span>
                <button type="button" class="btn" data-azione="usaBandaInviata">Rimettila nella scheda Banda</button>
                <button type="button" class="btn" data-azione="togliBandaInviata">Togli dal confronto</button>
            </header>
            ${problemi ? `<ul class="problemi">${problemi}</ul>` : ''}
            <div class="proposta-valori">
                <span>Attacco <strong>${formatta(v.attacco)}</strong></span>
                <span>Resistenza <strong>${formatta(v.resistenza, 1)}</strong></span>
                <span>Indice <strong>${formatta(v.indice)}</strong></span>
                ${confronto}
            </div>
            ${tabellaUnita(banda, unita)}
        </article>`;
}

// Copia la banda della scheda Banda nel confronto e apre l'Ottimizzatore
function inviaBanda() {
    impostazioni.bandaInviata = {
        bandaId: statoBanda.bandaId,
        unita: statoBanda.unita.map(u => ({ tipoId: u.tipoId, numero: u.numero, equip: [...u.equip] }))
    };
    impostazioni.scheda = 'ottimizzatore';
}

// Rimette la banda del confronto nella scheda Banda (sostituisce quella attuale)
function usaBandaInviata() {
    const inviata = bandaInviata(bandaCorrente());
    if (!inviata) return;
    statoBanda.unita = inviata.unita.map((u, i) => ({ uid: i + 1, tipoId: u.tipoId, numero: u.numero, equip: [...u.equip] }));
    statoBanda.prossimoUid = statoBanda.unita.length + 1;
    impostazioni.scheda = 'banda';
}

async function avviaOttimizzazione() {
    if (calcoloInCorso) return;
    calcoloInCorso = true;
    disegnaOttimizzatore();
    const chiave = chiaveCalcolo();
    const barra = () => document.getElementById('avanzamento');
    const risultato = await ottimizzaBanda(bandaCorrente(), bersaglioCorrente(),
        { ...opzioniOttimizzatore(), corone: statoBanda.corone },
        frazione => { if (barra()) barra().value = frazione; });
    calcoloInCorso = false;
    proposte = risultato;
    chiaveProposte = chiave;
    aggiornaTutto();
}

// Copia la proposta nella scheda Banda (sostituisce la banda attuale)
function usaProposta(indice) {
    const banda = bandaCorrente();
    const { unita, prossimoUid } = unitaDaProposta(banda, proposte[indice]);
    statoBanda.unita = unita;
    statoBanda.prossimoUid = prossimoUid;
    impostazioni.scheda = 'banda';
}

// Restituisce true se ha gestito l'evento
function gestisciComandoOttimizzatore(elemento) {
    switch (elemento.dataset.azione) {
        case 'obiettivo': impostazioni.obiettivo = elemento.value; return true;
        case 'pesoTiro': impostazioni.pesoTiro = Number(elemento.value); return true;
        case 'pesoCampagna': impostazioni.pesoCampagna = Number(elemento.value); return true;
        case 'ottimizza': avviaOttimizzazione(); return true;
        case 'usaProposta': usaProposta(Number(elemento.dataset.indice)); return true;
        case 'inviaBanda': inviaBanda(); return true;
        case 'usaBandaInviata': usaBandaInviata(); return true;
        case 'togliBandaInviata': impostazioni.bandaInviata = null; return true;
        default: return false;
    }
}
