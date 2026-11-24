// ==========================================================================
// PROBABILITÀ
// Scheda Probabilità: bersaglio (modificabile), opzioni del calcolo e
// confronto tra due gruppi di modelli della banda contro il bersaglio,
// passo per passo (dadi, colpi, ferite, fuori combattimento).
// ==========================================================================

const NOMI_GRUPPI = ['A', 'B'];

// Confronto valido per la banda corrente (altrimenti si riparte dai predefiniti)
function confrontoCorrente() {
    const banda = bandaCorrente();
    const c = impostazioni.confronto;
    const valido = c && c.bandaId === banda.id && Array.isArray(c.gruppi) && c.gruppi.length === 2
        && c.gruppi.every(g => {
            const t = tipoDi(banda, g.tipoId);
            return t && Number.isInteger(g.numero) && g.numero >= 1 && Array.isArray(g.equip)
                && g.equip.every(id => oggettiAcquistabili(banda, t.tipo, t.eroe).some(v => v.id === id));
        });
    if (!valido) {
        const truppa = banda.truppe.find(t => !t.animale) || banda.truppe[0];
        // Eroe più forte che non sia il capo (AC + F)
        const eroe = [...banda.eroi.filter(t => !t.capo)]
            .sort((a, b) => (b.profilo.AC + b.profilo.F) - (a.profilo.AC + a.profilo.F))[0] || banda.eroi[0];
        impostazioni.confronto = {
            bandaId: banda.id,
            gruppi: [
                { tipoId: truppa.id, numero: 10, equip: [] },
                { tipoId: eroe.id, numero: 5, equip: [] }
            ]
        };
    }
    return impostazioni.confronto;
}

// --------------------------------------------------------------------------
// Disegno
// --------------------------------------------------------------------------

function disegnaProbabilita() {
    disegnaPannelloBersaglio();
    disegnaOpzioni();
    disegnaConfronto();
}

function disegnaPannelloBersaglio() {
    const d = datiBersaglio(impostazioni.bersaglio);
    const bersaglio = bersaglioCorrente();
    const campi = VOCI_BERSAGLIO.map(v => `
        <label class="campo-profilo">
            <span>${v}</span>
            <input type="number" min="0" max="10" value="${d.profilo[v]}" data-azione="bersaglioValore" data-voce="${v}">
        </label>`).join('');
    const equip = (d.equip || []).map((id, i) => `
        <li class="equip-voce">${escapeHtml(Dati.equip[id].nome)}
            <button type="button" class="btn-togli" data-azione="bersaglioTogli" data-indice="${i}" title="Togli">✕</button>
        </li>`).join('');
    const opzioniEquip = Object.keys(NOMI_TIPI_OGGETTO).map(tipo => {
        const voci = Object.values(Dati.equip).filter(o => o.tipo === tipo)
            .map(o => `<option value="${o.id}" ${oggettoAggiungibile(d.equip || [], o.id) ? '' : 'disabled'}>${escapeHtml(o.nome)}</option>`).join('');
        return `<optgroup label="${NOMI_TIPI_OGGETTO[tipo]}">${voci}</optgroup>`;
    }).join('');
    document.getElementById('pannello-bersaglio').innerHTML = `
        <h2>Bersaglio: ${escapeHtml(d.nome)}</h2>
        <p class="nota">È anche l'avversario che attacca i tuoi modelli. Cambiando un valore diventa <em>Personalizzato</em>.</p>
        <div class="profilo-modificabile">${campi}</div>
        <div class="bersaglio-spunte">
            <label><input type="checkbox" data-azione="bersaglioAnimale" ${d.animale ? 'checked' : ''}> Armi naturali (niente equipaggiamento)</label>
            <label><input type="checkbox" data-azione="bersaglioGrosso" ${d.grosso ? 'checked' : ''}> Bersaglio grosso</label>
        </div>
        ${d.animale ? '' : `
        <ul class="equip">
            <li class="equip-voce gratuito">Pugnale</li>
            ${equip}
        </ul>
        <select class="equip-aggiungi" data-azione="bersaglioEquip" aria-label="Aggiungi equipaggiamento al bersaglio">
            <option value="">+ Equipaggiamento…</option>
            ${opzioniEquip}
        </select>`}
        <p class="nota">Combatte con: <strong>${escapeHtml(configurazioneBersaglio(bersaglio).descrizione)}</strong></p>`;
}

function disegnaOpzioni() {
    const radio = (valore, testo) => `
        <label><input type="radio" name="turno" value="${valore}" ${impostazioni.turno === valore ? 'checked' : ''}> ${testo}</label>`;
    document.getElementById('pannello-opzioni').innerHTML = `
        <h2>Opzioni</h2>
        <fieldset class="opzioni-gruppo">
            <legend>Turno di corpo a corpo</legend>
            ${radio('media', 'Media tra primo turno e successivi')}
            ${radio('primo', 'Primo turno (flagello e mazzafrusto con il bonus di Forza)')}
            ${radio('successivi', 'Turni successivi')}
        </fieldset>
        <fieldset class="opzioni-gruppo">
            <legend>Tiro</legend>
            <label><input type="checkbox" data-azione="lungaGittata" ${impostazioni.lungaGittata ? 'checked' : ''}> Gittata lunga (-1)</label>
            <label><input type="checkbox" data-azione="copertura" ${impostazioni.copertura ? 'checked' : ''}> Bersaglio al riparo (-1)</label>
            <label><input type="checkbox" data-azione="muovere" ${impostazioni.muovere ? 'checked' : ''}> Il tiratore ha mosso (-1; balestra, archibugio e moschetto non tirano)</label>
        </fieldset>`;
}

// Risultati di un gruppo del confronto
function calcolaGruppo(banda, gruppo) {
    const { tipo } = tipoDi(banda, gruppo.tipoId);
    const valutazione = valutaModello(modelloPerMotore(tipo, gruppo.equip), bersaglioCorrente(), opzioniCalcolo());
    return { tipo, valutazione, costo: costoModello(banda, gruppo) * gruppo.numero };
}

// Testo "4+ (50%)" per un risultato minimo
function testoTiro(serve) {
    if (serve === null || serve === undefined) return 'impossibile';
    return `${Math.max(2, serve)}+ (${percentuale(probD6(serve))})`;
}

// Elenco per arma, compatto se tutte le armi danno lo stesso valore
function perArma(configurazione, colpi, testo) {
    const voci = colpi.map((par, i) => ({ nome: configurazione.armi[i].nome, valore: testo(par) }));
    const unici = [...new Set(voci.map(v => v.valore))];
    if (unici.length === 1) return unici[0];
    const visti = new Set();
    return voci.filter(v => !visti.has(v.nome) && visti.add(v.nome))
        .map(v => `${escapeHtml(v.nome)}: ${v.valore}`).join('<br>');
}

function disegnaConfronto() {
    const banda = bandaCorrente();
    const confronto = confrontoCorrente();
    const risultati = confronto.gruppi.map(g => calcolaGruppo(banda, g));
    const tipi = [...banda.eroi, ...banda.truppe];

    // Righe di impostazione dei gruppi
    const cellaTipo = (g, k) => `
        <td><select data-azione="confrontoTipo" data-gruppo="${k}" aria-label="Tipo del gruppo ${NOMI_GRUPPI[k]}">
            ${tipi.map(t => `<option value="${t.id}" ${t.id === g.tipoId ? 'selected' : ''}>${escapeHtml(t.nome)}</option>`).join('')}
        </select></td>`;
    const cellaNumero = (g, k) => `
        <input type="number" min="1" max="20" value="${g.numero}" data-azione="confrontoNumero" data-gruppo="${k}" aria-label="Modelli del gruppo ${NOMI_GRUPPI[k]}">`;
    const cellaEquip = (g, k) => {
        const { tipo, eroe } = tipoDi(banda, g.tipoId);
        if (tipo.animale) return '<span class="nota">Armi naturali</span>';
        const voci = g.equip.map((id, i) => `
            <li class="equip-voce">${escapeHtml(Dati.equip[id].nome)}
                <button type="button" class="btn-togli" data-azione="confrontoTogli" data-gruppo="${k}" data-indice="${i}" title="Togli">✕</button>
            </li>`).join('');
        return `
            <ul class="equip"><li class="equip-voce gratuito">Pugnale</li>${voci}</ul>
            ${selettoreEquip(banda, tipo, eroe, g.equip, `data-azione="confrontoEquip" data-gruppo="${k}"`)}`;
    };

    // Righe dei risultati: [etichetta, funzione(risultato, gruppo) → { testo, valore }, meglio: 'alto'|'basso'|null]
    const righe = [
        ['Costo', (r) => ({ testo: `${r.costo} corone` }), null],
        ['Combatte con', (r) => ({ testo: escapeHtml(r.valutazione.configurazione.descrizione) }), null],
        ['Dadi (attacchi)', (r, g) => ({ testo: formatta(r.valutazione.attacco.dadi * g.numero) }), null],
        ['Per colpire', (r) => ({ testo: testoTiro(r.valutazione.attacco.serveColpire) }), null],
        ['Colpi attesi', (r, g) => {
            const a = r.valutazione.attacco;
            const parati = a.colpiParati > 0.0005 ? ` <span class="nota">(${formatta(a.colpiParati * g.numero)} parati)</span>` : '';
            return { testo: formatta(a.colpiAttesi * g.numero) + parati, valore: a.colpiAttesi * g.numero };
        }, 'alto'],
        ['Per ferire', (r) => ({ testo: perArma(r.valutazione.configurazione, r.valutazione.attacco.colpi, par => testoTiro(par.serveFerire)) }), null],
        ['Tiri per ferire riusciti', (r, g) => {
            // Colpi attesi per la probabilità media di ferire delle armi usate
            const a = r.valutazione.attacco;
            const pMedia = a.colpi.reduce((s, par) => s + probD6(par.serveFerire), 0) / a.colpi.length;
            const v = a.colpiAttesi * pMedia * g.numero;
            return { testo: formatta(v), valore: v };
        }, 'alto'],
        ['Tiro salvezza del bersaglio', (r) => ({ testo: perArma(r.valutazione.configurazione, r.valutazione.attacco.colpi, par => par.serveTS ? par.serveTS + '+' : 'nessuno') }), null],
        ['Ferite inflitte (critici compresi, dopo il tiro salvezza)', (r, g) => ({ testo: formatta(r.valutazione.attacco.feriteAttese * g.numero), valore: r.valutazione.attacco.feriteAttese * g.numero }), 'alto'],
        ['Fuori combattimento attesi', (r, g) => ({
            testo: `<strong>${formatta(r.valutazione.attacco.pFuori * g.numero)}</strong> <span class="nota">(${percentuale(r.valutazione.attacco.pFuori)} a modello)</span>`,
            valore: r.valutazione.attacco.pFuori * g.numero
        }), 'alto'],
        ['Fuori combattimento ogni 100 corone', (r, g) => {
            const v = r.costo > 0 ? r.valutazione.attacco.pFuori * g.numero / r.costo * 100 : 0;
            return { testo: formatta(v), valore: v };
        }, 'alto'],
        ['Il bersaglio lo mette fuori combattimento', (r) => ({ testo: percentuale(r.valutazione.subito.pFuori) + ' a turno', valore: r.valutazione.subito.pFuori }), 'basso'],
        ['Tiro (fuori combattimento per turno)', (r, g) => {
            const t = r.valutazione.tiro;
            if (!t) return { testo: '—', valore: 0 };
            return {
                testo: `${escapeHtml(t.arma.nome)}: colpisce ${testoTiro(t.serveColpire)}, ferisce ${testoTiro(t.colpo.serveFerire)} → <strong>${formatta(t.fuoriPerTurno * g.numero)}</strong>`,
                valore: t.fuoriPerTurno * g.numero
            };
        }, 'alto']
    ];

    const corpo = righe.map(([etichetta, calcola, meglio]) => {
        const celle = risultati.map((r, k) => calcola(r, confronto.gruppi[k]));
        let migliore = -1;
        if (meglio && celle.every(c => c.valore !== undefined) && Math.abs(celle[0].valore - celle[1].valore) > 1e-6) {
            const primoMeglio = meglio === 'alto' ? celle[0].valore > celle[1].valore : celle[0].valore < celle[1].valore;
            migliore = primoMeglio ? 0 : 1;
        }
        return `<tr><th scope="row">${etichetta}</th>${celle.map((c, k) => `<td class="${k === migliore ? 'migliore' : ''}">${c.testo}</td>`).join('')}</tr>`;
    }).join('');

    document.getElementById('confronto').innerHTML = `
        <h2>Confronto contro il bersaglio</h2>
        <p class="nota">Ogni modello attacca un bersaglio diverso, per un turno di corpo a corpo. In verde il gruppo che rende di più.</p>
        <table class="tabella-confronto">
            <thead><tr><th></th>${NOMI_GRUPPI.map(n => `<th scope="col">Gruppo ${n}</th>`).join('')}</tr></thead>
            <tbody class="confronto-impostazioni">
                <tr><th scope="row">Modello</th>${confronto.gruppi.map(cellaTipo).join('')}</tr>
                <tr><th scope="row">Quanti</th>${confronto.gruppi.map((g, k) => `<td>${cellaNumero(g, k)}</td>`).join('')}</tr>
                <tr><th scope="row">Equipaggiamento</th>${confronto.gruppi.map((g, k) => `<td>${cellaEquip(g, k)}</td>`).join('')}</tr>
            </tbody>
            <tbody>${corpo}</tbody>
        </table>`;
}

// --------------------------------------------------------------------------
// Comandi
// --------------------------------------------------------------------------

function gruppoDa(elemento) {
    return confrontoCorrente().gruppi[Number(elemento.dataset.gruppo)];
}

// Restituisce true se ha gestito l'evento
function gestisciComandoProbabilita(elemento, evento) {
    const azione = elemento.dataset.azione;
    switch (azione) {
        case 'bersaglioValore': {
            const valore = parseInt(elemento.value, 10);
            if (!Number.isInteger(valore) || valore < 0 || valore > 10) return true;
            modificaBersaglio(b => { b.profilo[elemento.dataset.voce] = valore; });
            break;
        }
        case 'bersaglioAnimale': modificaBersaglio(b => { b.animale = elemento.checked; }); break;
        case 'bersaglioGrosso': modificaBersaglio(b => { b.grosso = elemento.checked; }); break;
        case 'bersaglioEquip':
            if (!elemento.value) return true;
            modificaBersaglio(b => { if (oggettoAggiungibile(b.equip, elemento.value)) b.equip.push(elemento.value); });
            break;
        case 'bersaglioTogli': modificaBersaglio(b => { b.equip.splice(Number(elemento.dataset.indice), 1); }); break;
        case 'lungaGittata': impostazioni.lungaGittata = elemento.checked; break;
        case 'copertura': impostazioni.copertura = elemento.checked; break;
        case 'muovere': impostazioni.muovere = elemento.checked; break;
        case 'confrontoTipo': {
            const g = gruppoDa(elemento);
            g.tipoId = elemento.value;
            g.equip = [];
            break;
        }
        case 'confrontoNumero': {
            const valore = parseInt(elemento.value, 10);
            if (!Number.isInteger(valore) || valore < 1 || valore > 20) return true;
            gruppoDa(elemento).numero = valore;
            break;
        }
        case 'confrontoEquip': {
            const g = gruppoDa(elemento);
            if (elemento.value && oggettoAggiungibile(g.equip, elemento.value)) g.equip.push(elemento.value);
            break;
        }
        case 'confrontoTogli': gruppoDa(elemento).equip.splice(Number(elemento.dataset.indice), 1); break;
        default:
            if (elemento.name === 'turno') { impostazioni.turno = elemento.value; break; }
            return false;
    }
    return true;
}
