// ==========================================================================
// BANDA
// Stato della banda composta a mano: unità (un eroe o un gruppo di truppe),
// costi, controllo delle regole di composizione, salvataggio nel browser.
// ==========================================================================

const CHIAVE_BANDA = 'mordheim-banda-v1';
const MAX_GRUPPO = 5;          // modelli per gruppo di truppe, se la banda non dice altro
const MAX_ARMI_CORPO = 2;      // armi da corpo a corpo oltre al pugnale gratuito
const MAX_ARMI_TIRO = 2;

// unita: [{ uid, tipoId, numero, equip: [id, ...] }]
let statoBanda = { bandaId: null, corone: 500, unita: [], prossimoUid: 1 };

function bandaCorrente() {
    return Dati.bande[statoBanda.bandaId];
}

// Costo di un oggetto per quel tipo di modello (dalla lista della banda)
function costoOggetto(banda, tipo, eroe, id) {
    const voce = oggettiAcquistabili(banda, tipo, eroe).find(v => v.id === id);
    return voce ? voce.costo : Dati.equip[id].costo;
}

function costoModello(banda, unita) {
    const { tipo, eroe } = tipoDi(banda, unita.tipoId);
    return unita.equip.reduce((somma, id) => somma + costoOggetto(banda, tipo, eroe, id), tipo.costo);
}

function costoUnita(banda, unita) {
    return costoModello(banda, unita) * unita.numero;
}

function costoTotale(banda, unitaElenco) {
    return unitaElenco.reduce((somma, u) => somma + costoUnita(banda, u), 0);
}

function contaModelli(unitaElenco) {
    return unitaElenco.reduce((somma, u) => somma + u.numero, 0);
}

function modelliDelTipo(unitaElenco, tipoId) {
    return unitaElenco.filter(u => u.tipoId === tipoId).reduce((s, u) => s + u.numero, 0);
}

// Quanti modelli di quel tipo si possono ancora aggiungere (Infinity = senza limite)
function postiLiberi(banda, unitaElenco, tipoId) {
    const { tipo } = tipoDi(banda, tipoId);
    const max = tipo.max === undefined ? Infinity : tipo.max;
    const perTipo = max - modelliDelTipo(unitaElenco, tipoId);
    const perBanda = banda.maxModelli - contaModelli(unitaElenco);
    return Math.min(perTipo, perBanda);
}

// --------------------------------------------------------------------------
// Equipaggiamento di un modello
// --------------------------------------------------------------------------

function contaPerTipo(equip, tipoOggetto) {
    return equip.filter(id => Dati.equip[id].tipo === tipoOggetto).length;
}

// Un oggetto si può aggiungere senza superare i limiti?
function oggettoAggiungibile(equip, id) {
    const oggetto = Dati.equip[id];
    switch (oggetto.tipo) {
        case 'corpo': return contaPerTipo(equip, 'corpo') < MAX_ARMI_CORPO;
        case 'tiro': return contaPerTipo(equip, 'tiro') < MAX_ARMI_TIRO && !equip.includes(id);
        case 'armatura': return contaPerTipo(equip, 'armatura') === 0;
        default: return !equip.includes(id);   // scudo, brocchiere, elmo: uno per tipo
    }
}

// --------------------------------------------------------------------------
// Modifiche allo stato
// --------------------------------------------------------------------------

function nuovaBanda(bandaId) {
    const banda = Dati.bande[bandaId];
    statoBanda = { bandaId, corone: banda.corone, unita: [], prossimoUid: 1 };
}

function aggiungiUnita(tipoId) {
    const banda = bandaCorrente();
    if (postiLiberi(banda, statoBanda.unita, tipoId) <= 0) return;
    statoBanda.unita.push({ uid: statoBanda.prossimoUid++, tipoId, numero: 1, equip: [] });
}

function trovaUnita(uid) {
    return statoBanda.unita.find(u => u.uid === uid);
}

function rimuoviUnita(uid) {
    statoBanda.unita = statoBanda.unita.filter(u => u.uid !== uid);
}

function cambiaNumero(uid, delta) {
    const banda = bandaCorrente();
    const unita = trovaUnita(uid);
    const { tipo, eroe } = tipoDi(banda, unita.tipoId);
    if (eroe) return;
    const maxGruppo = tipo.maxGruppo || MAX_GRUPPO;
    if (delta > 0 && (unita.numero >= maxGruppo || postiLiberi(banda, statoBanda.unita, unita.tipoId) <= 0)) return;
    if (delta < 0 && unita.numero <= 1) return;
    unita.numero += delta;
}

function aggiungiEquip(uid, id) {
    const unita = trovaUnita(uid);
    if (oggettoAggiungibile(unita.equip, id)) unita.equip.push(id);
}

function rimuoviEquip(uid, indice) {
    trovaUnita(uid).equip.splice(indice, 1);
}

// --------------------------------------------------------------------------
// Controllo della composizione
// --------------------------------------------------------------------------

// Restituisce l'elenco dei problemi: [{ grave: true|false, testo }]
function controllaBanda(banda, unitaElenco, corone) {
    const problemi = [];
    const totale = costoTotale(banda, unitaElenco);
    if (totale > corone) {
        problemi.push({ grave: true, testo: 'Superi il budget di ' + (totale - corone) + ' corone.' });
    }
    const modelli = contaModelli(unitaElenco);
    if (modelli > banda.maxModelli) {
        problemi.push({ grave: true, testo: 'Troppi modelli: ' + modelli + ' su un massimo di ' + banda.maxModelli + '.' });
    }
    [...banda.eroi, ...banda.truppe].forEach(tipo => {
        const n = modelliDelTipo(unitaElenco, tipo.id);
        if (tipo.max !== undefined && n > tipo.max) {
            problemi.push({ grave: true, testo: tipo.nome + ': al massimo ' + tipo.max + '.' });
        }
        if (tipo.min && n < tipo.min) {
            problemi.push({ grave: true, testo: 'Manca: ' + tipo.nome + (tipo.capo ? ' (il capo è obbligatorio)' : '') + '.' });
        }
    });
    if (unitaElenco.length > 0 && modelli < 3) {
        problemi.push({ grave: false, testo: 'Una banda deve avere almeno 3 modelli.' });
    }
    return problemi;
}

// --------------------------------------------------------------------------
// Salvataggio nel browser
// --------------------------------------------------------------------------

// Archivio: { ultima: bandaId, bande: { bandaId: statoBanda } }
// Ogni banda ha il suo salvataggio: cambiando banda non si perde niente.
function leggiArchivio() {
    try {
        const archivio = JSON.parse(localStorage.getItem(CHIAVE_BANDA));
        if (archivio && typeof archivio.bande === 'object') return archivio;
    } catch (e) { /* archivio non disponibile o rovinato */ }
    return { ultima: null, bande: {} };
}

function salvaBanda() {
    const archivio = leggiArchivio();
    archivio.ultima = statoBanda.bandaId;
    archivio.bande[statoBanda.bandaId] = statoBanda;
    try {
        localStorage.setItem(CHIAVE_BANDA, JSON.stringify(archivio));
    } catch (e) { /* si lavora senza salvataggio */ }
}

// Ultima banda usata (se ancora presente nei dati)
function ultimaBandaSalvata() {
    const ultima = leggiArchivio().ultima;
    return Dati.bande[ultima] ? ultima : null;
}

// Apre la banda indicata: quella salvata se è ancora valida, altrimenti una nuova
function apriBanda(bandaId) {
    const salvata = leggiArchivio().bande[bandaId];
    const banda = Dati.bande[bandaId];
    const valida = salvata && Array.isArray(salvata.unita) && Number.isFinite(salvata.corone)
        && salvata.unita.every(u => {
            const t = tipoDi(banda, u.tipoId);
            return t && Number.isInteger(u.numero) && u.numero >= 1 && Array.isArray(u.equip)
                && u.equip.every(id => oggettiAcquistabili(banda, t.tipo, t.eroe).some(v => v.id === id));
        });
    if (!valida) {
        nuovaBanda(bandaId);
        return;
    }
    statoBanda = { bandaId, corone: salvata.corone, unita: salvata.unita, prossimoUid: 1 };
    statoBanda.prossimoUid = Math.max(0, ...salvata.unita.map(u => u.uid)) + 1;
}
