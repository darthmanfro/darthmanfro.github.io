// ==========================================================================
// BANDA - VISTA
// Disegna la scheda Banda: riepilogo dei costi, problemi di composizione,
// catalogo dei modelli da aggiungere e schede delle unità.
// I pulsanti hanno data-azione e sono gestiti da js/app.js.
// ==========================================================================

const VOCI_PROFILO = ['M', 'AC', 'AB', 'F', 'R', 'Fe', 'I', 'A', 'Cd'];
const NOMI_TIPI_OGGETTO = {
    corpo: 'Armi da corpo a corpo',
    tiro: 'Armi da tiro',
    armatura: 'Armature',
    scudo: 'Scudi',
    elmo: 'Elmi'
};

function disegnaBanda() {
    const banda = bandaCorrente();
    disegnaRiepilogo(banda);
    disegnaProblemi(banda);
    disegnaCatalogo(banda);
    disegnaUnita(banda);
}

function disegnaRiepilogo(banda) {
    const totale = costoTotale(banda, statoBanda.unita);
    const restano = statoBanda.corone - totale;
    const modelli = contaModelli(statoBanda.unita);
    const eroi = statoBanda.unita.filter(u => tipoDi(banda, u.tipoId).eroe).length;
    const classe = restano < 0 ? 'riepilogo-valore sforato' : 'riepilogo-valore';
    const rendimento = rendimentoBanda(banda);
    document.getElementById('riepilogo').innerHTML = `
        <div class="riepilogo-voce">
            <span class="riepilogo-etichetta">Spesa</span>
            <span class="${classe}">${totale} / ${statoBanda.corone}</span>
            <meter min="0" max="${statoBanda.corone}" low="${statoBanda.corone * 0.999}" high="${statoBanda.corone}"
                   optimum="0" value="${Math.min(totale, statoBanda.corone)}"></meter>
        </div>
        <div class="riepilogo-voce">
            <span class="riepilogo-etichetta">Restano</span>
            <span class="${classe}">${restano}</span>
        </div>
        <div class="riepilogo-voce">
            <span class="riepilogo-etichetta">Modelli</span>
            <span class="riepilogo-valore">${modelli} / ${banda.maxModelli}</span>
        </div>
        <div class="riepilogo-voce">
            <span class="riepilogo-etichetta">Eroi</span>
            <span class="riepilogo-valore">${eroi}</span>
        </div>
        <div class="riepilogo-voce">
            <span class="riepilogo-etichetta">Fuori comb. a turno ${iconaInfo('rendimentoBanda')}</span>
            <span class="riepilogo-valore">${formatta(rendimento.corpo)}${rendimento.tiro > 0 ? ` <small>+ ${formatta(rendimento.tiro)} al tiro</small>` : ''}</span>
        </div>
        ${riepilogoIndici(banda)}`;
}

// Attacco, resistenza e indice come nella scheda Ottimizzatore (stesse scelte
// di obiettivo, tiro e campagna), con l'indice della proposta migliore se calcolata
function riepilogoIndici(banda) {
    const v = valoriBanda(banda, statoBanda.unita, bersagliOttimizzatore(), opzioniOttimizzatore());
    const migliore = propostaMigliore()
        ? `<small>proposta 1: ${formatta(propostaMigliore().indice)}</small>` : '';
    return `
        <div class="riepilogo-voce">
            <span class="riepilogo-etichetta">Attacco</span>
            <span class="riepilogo-valore">${formatta(v.attacco)}</span>
        </div>
        <div class="riepilogo-voce">
            <span class="riepilogo-etichetta">Resistenza</span>
            <span class="riepilogo-valore">${formatta(v.resistenza, 1)}</span>
        </div>
        <div class="riepilogo-voce">
            <span class="riepilogo-etichetta">Indice ${iconaInfo('indiciBanda')}</span>
            <span class="riepilogo-valore">${formatta(v.indice)} ${migliore}</span>
        </div>
        <div class="riepilogo-voce riepilogo-comando">
            <button type="button" class="btn" data-azione="inviaBanda" ${statoBanda.unita.length === 0 ? 'disabled' : ''}
                    title="Mostra questa banda accanto alle proposte dell'Ottimizzatore">Confronta con le proposte</button>
        </div>`;
}

function disegnaProblemi(banda) {
    const problemi = controllaBanda(banda, statoBanda.unita, statoBanda.corone);
    document.getElementById('problemi').innerHTML = problemi
        .map(p => `<li class="${p.grave ? 'problema grave' : 'problema'}">${escapeHtml(p.testo)}</li>`)
        .join('');
}

function disegnaCatalogo(banda) {
    const pulsante = (tipo, eroe) => {
        const liberi = postiLiberi(banda, statoBanda.unita, tipo.id);
        const limite = tipo.max === undefined ? '' : `${tipo.min || 0}-${tipo.max}`;
        return `
            <button type="button" class="catalogo-voce" data-azione="aggiungiUnita" data-tipo="${tipo.id}"
                    ${liberi <= 0 ? 'disabled' : ''} title="${eroe ? 'Aggiungi un eroe' : 'Aggiungi un gruppo di truppe'}">
                <span class="catalogo-nome">${escapeHtml(tipo.nome)}${tipo.capo ? ' <em>(capo)</em>' : ''}</span>
                <span class="catalogo-limite">${limite}</span>
                <span class="catalogo-costo">${tipo.costo}</span>
            </button>`;
    };
    document.getElementById('catalogo').innerHTML = `
        <h2>Eroi</h2>
        ${banda.eroi.map(t => pulsante(t, true)).join('')}
        <h2>Truppe</h2>
        ${banda.truppe.map(t => pulsante(t, false)).join('')}`;
}

function disegnaUnita(banda) {
    const contenitore = document.getElementById('elenco-unita');
    if (statoBanda.unita.length === 0) {
        contenitore.innerHTML = '<p class="vuoto">La banda è vuota: aggiungi il capo e gli altri modelli dall\'elenco.</p>';
        return;
    }
    // Prima gli eroi, poi le truppe, nell'ordine della banda
    const ordine = [...banda.eroi, ...banda.truppe].map(t => t.id);
    const unita = [...statoBanda.unita].sort((a, b) => ordine.indexOf(a.tipoId) - ordine.indexOf(b.tipoId));
    contenitore.innerHTML = unita.map(u => schedaUnita(banda, u)).join('');
}

function tabellaProfilo(profilo) {
    return `
        <table class="profilo">
            <tr>${VOCI_PROFILO.map(v => `<th>${v}</th>`).join('')}</tr>
            <tr>${VOCI_PROFILO.map(v => `<td>${profilo[v]}</td>`).join('')}</tr>
        </table>`;
}

function schedaUnita(banda, unita) {
    const { tipo, eroe } = tipoDi(banda, unita.tipoId);
    const costoUno = costoModello(banda, unita);
    const numero = eroe || tipo.max === 1 ? '' : `
        <div class="numero">
            <button type="button" class="btn-piccolo" data-azione="meno" data-uid="${unita.uid}" title="Un modello in meno">−</button>
            <span class="numero-valore">${unita.numero}</span>
            <button type="button" class="btn-piccolo" data-azione="piu" data-uid="${unita.uid}" title="Un modello in più">+</button>
        </div>`;
    const costo = eroe ? `${costoUno}` : `${costoUno} cad. · <strong>${costoUno * unita.numero}</strong>`;
    return `
        <article class="${eroe ? 'unita eroe' : 'unita truppa'}">
            <header class="unita-testata">
                <h3>${escapeHtml(tipo.nome)}${tipo.capo ? ' <span class="etichetta-capo">capo</span>' : ''}</h3>
                ${numero}
                <span class="unita-costo">${costo}</span>
                <button type="button" class="btn-piccolo btn-rimuovi" data-azione="rimuoviUnita" data-uid="${unita.uid}" title="Togli dalla banda">✕</button>
            </header>
            ${tabellaProfilo(tipo.profilo)}
            ${elencoEquip(banda, tipo, eroe, unita)}
            ${tipo.regole ? `<ul class="unita-regole">${tipo.regole.map(r => `<li>${escapeHtml(r)}</li>`).join('')}</ul>` : ''}
            ${statisticheUnita(tipo, unita)}
        </article>`;
}

// Rendimento dell'unità contro il bersaglio (js/motore.js); ogni riga ha la sua icona i
function statisticheUnita(tipo, unita) {
    const v = valutaModello(modelloPerMotore(tipo, unita.equip), bersaglioCorrente(), opzioniCalcolo());
    const a = v.attacco;
    const info = chiave => iconaInfo(chiave, `data-uid="${unita.uid}"`);
    const gruppo = unita.numero > 1
        ? ` · gruppo di ${unita.numero}: <strong>${formatta(a.pFuori * unita.numero)}</strong> fuori combattimento` : '';
    const t = v.tiro;
    const tiro = t
        ? `<li><span>Tiro con ${escapeHtml(t.arma.nome.toLowerCase())} (colpisce al ${tiroMinimo(t.serveColpire)}, ferisce al ${tiroMinimo(t.colpo.serveFerire)}):
            ferisce il ${percentuale(t.pFeritoPerTiro)} dei tiri, fuori combattimento ${formatta(t.fuoriPerTurno * unita.numero)} a turno</span>${info('tiro')}</li>`
        : '';
    return `
        <ul class="unita-statistiche">
            <li><span>Combatte con <strong>${escapeHtml(v.configurazione.descrizione.toLowerCase())}</strong></span>${info('combatte')}</li>
            <li><span>Contro il bersaglio: ${quantita(a.dadi, 'dado', 'dadi')} (colpisce al ${tiroMinimo(a.serveColpire)}), ${quantita(a.colpiAttesi, 'colpo', 'colpi')},
                ${quantita(a.feriteAttese, 'ferita', 'ferite')} (ferisce al ${risultatiPerArma(a.colpi.map(p => p.serveFerire))})</span>${info('attacco')}</li>
            <li><span>A turno: ${testoEsiti(a.pFerito, a.esiti, true)}${gruppo}</span>${info('esiti')}</li>
            <li><span>Il bersaglio contro di lui: ${testoEsiti(v.subito.pFerito, v.subito.esiti)}</span>${info('subito')}</li>
            ${tiro}
        </ul>`;
}

// "4+" per un risultato minimo, "impossibile" se non si può
function tiroMinimo(serve) {
    return serve ? Math.max(2, serve) + '+' : 'impossibile';
}

// Risultati minimi delle armi usate: "4+" se uguali, altrimenti "4+/3+"
function risultatiPerArma(valori) {
    return [...new Set(valori.map(tiroMinimo))].join('/');
}

// Fuori combattimento attesi in un turno da tutta la banda: { corpo, tiro }
function rendimentoBanda(banda) {
    return statoBanda.unita.reduce((totale, u) => {
        const { tipo } = tipoDi(banda, u.tipoId);
        const v = valutaModello(modelloPerMotore(tipo, u.equip), bersaglioCorrente(), opzioniCalcolo());
        totale.corpo += v.attacco.pFuori * u.numero;
        totale.tiro += v.tiro ? v.tiro.fuoriPerTurno * u.numero : 0;
        return totale;
    }, { corpo: 0, tiro: 0 });
}

function elencoEquip(banda, tipo, eroe, unita) {
    if (tipo.animale) return '<p class="equip-nota">Niente equipaggiamento.</p>';
    const voci = unita.equip.map((id, i) => `
        <li class="equip-voce">
            ${escapeHtml(Dati.equip[id].nome)} <span class="equip-costo">${costoOggetto(banda, tipo, eroe, id)}</span>
            <button type="button" class="btn-togli" data-azione="togliEquip" data-uid="${unita.uid}" data-indice="${i}" title="Togli">✕</button>
        </li>`).join('');
    return `
        <ul class="equip">
            <li class="equip-voce gratuito">Pugnale <span class="equip-costo">gratis</span></li>
            ${voci}
        </ul>
        ${selettoreEquip(banda, tipo, eroe, unita.equip, `data-azione="aggiungiEquip" data-uid="${unita.uid}"`)}`;
}

// Menu per aggiungere un oggetto; "attributi" dice a chi va (data-azione, data-uid...)
function selettoreEquip(banda, tipo, eroe, equip, attributi) {
    const acquistabili = oggettiAcquistabili(banda, tipo, eroe);
    const gruppi = Object.keys(NOMI_TIPI_OGGETTO).map(tipoOggetto => {
        const opzioni = acquistabili
            .filter(v => v.oggetto.tipo === tipoOggetto)
            .map(v => `<option value="${v.id}" ${oggettoAggiungibile(equip, v.id) ? '' : 'disabled'}>${escapeHtml(v.oggetto.nome)} (${v.costo})</option>`)
            .join('');
        return opzioni ? `<optgroup label="${NOMI_TIPI_OGGETTO[tipoOggetto]}">${opzioni}</optgroup>` : '';
    }).join('');
    return `
        <select class="equip-aggiungi" ${attributi} aria-label="Aggiungi equipaggiamento">
            <option value="">+ Equipaggiamento…</option>
            ${gruppi}
        </select>`;
}
