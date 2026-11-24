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
    const numero = eroe ? '' : `
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
            <div class="unita-statistiche" data-uid="${unita.uid}"></div>
        </article>`;
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
        ${selettoreEquip(banda, tipo, eroe, unita)}`;
}

function selettoreEquip(banda, tipo, eroe, unita) {
    const acquistabili = oggettiAcquistabili(banda, tipo, eroe);
    const gruppi = Object.keys(NOMI_TIPI_OGGETTO).map(tipoOggetto => {
        const opzioni = acquistabili
            .filter(v => v.oggetto.tipo === tipoOggetto)
            .map(v => `<option value="${v.id}" ${oggettoAggiungibile(unita.equip, v.id) ? '' : 'disabled'}>${escapeHtml(v.oggetto.nome)} (${v.costo})</option>`)
            .join('');
        return opzioni ? `<optgroup label="${NOMI_TIPI_OGGETTO[tipoOggetto]}">${opzioni}</optgroup>` : '';
    }).join('');
    return `
        <select class="equip-aggiungi" data-azione="aggiungiEquip" data-uid="${unita.uid}" aria-label="Aggiungi equipaggiamento">
            <option value="">+ Equipaggiamento…</option>
            ${gruppi}
        </select>`;
}
