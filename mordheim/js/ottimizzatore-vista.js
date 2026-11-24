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

function disegnaProposte(banda) {
    const contenitore = document.getElementById('ottimizzatore-proposte');
    if (!proposte || chiaveProposte !== chiaveCalcolo()) {
        contenitore.innerHTML = `
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
        contenitore.innerHTML = '<p class="problema grave">Con queste corone non si riesce a comporre una banda valida.</p>';
        return;
    }
    contenitore.innerHTML = proposte.map((p, i) => `
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
            <table class="proposta-unita">
                <thead><tr><th>Modelli</th><th>Equipaggiamento</th><th>Corone</th><th>Fuori comb. a turno</th></tr></thead>
                <tbody>
                    ${p.unita.map(u => {
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
            </table>
        </article>`).join('');
}

async function avviaOttimizzazione() {
    if (calcoloInCorso) return;
    calcoloInCorso = true;
    disegnaOttimizzatore();
    const chiave = chiaveCalcolo();
    const barra = () => document.getElementById('avanzamento');
    const risultato = await ottimizzaBanda(bandaCorrente(), bersaglioCorrente(),
        { ...opzioniCalcolo(), corone: statoBanda.corone, obiettivo: impostazioni.obiettivo, pesoTiro: Number(impostazioni.pesoTiro), pesoCampagna: Number(impostazioni.pesoCampagna) },
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
        default: return false;
    }
}
