// ==========================================================================
// DATI
// Carica i file JSON di dati/ (regole, equipaggiamento, bande) e offre
// piccole funzioni per leggerli.
// ==========================================================================

const Dati = {
    regole: null,     // dati/regole.json
    equip: {},        // oggetti di dati/equipaggiamento.json per id
    indice: [],       // elenco bande di dati/bande/indice.json
    bande: {},        // bande per id
    bersagli: []      // bersagli di riferimento di dati/bersagli.json
};

async function caricaJSON(percorso) {
    const risposta = await fetch(percorso, { cache: 'no-cache' });
    if (!risposta.ok) throw new Error(percorso + ': errore ' + risposta.status);
    return risposta.json();
}

async function caricaDati() {
    const [regole, equip, indice, bersagli] = await Promise.all([
        caricaJSON('dati/regole.json'),
        caricaJSON('dati/equipaggiamento.json'),
        caricaJSON('dati/bande/indice.json'),
        caricaJSON('dati/bersagli.json')
    ]);
    Dati.regole = regole;
    Dati.bersagli = bersagli.bersagli;
    equip.oggetti.forEach(o => { Dati.equip[o.id] = o; });
    Dati.indice = indice.bande;
    const bande = await Promise.all(indice.bande.map(b => caricaJSON('dati/bande/' + b.file)));
    bande.forEach(b => { Dati.bande[b.id] = b; });
}

// Tipo di modello (eroe o truppa) di una banda: { tipo, eroe } oppure null
function tipoDi(banda, tipoId) {
    const eroe = banda.eroi.find(t => t.id === tipoId);
    if (eroe) return { tipo: eroe, eroe: true };
    const truppa = banda.truppe.find(t => t.id === tipoId);
    return truppa ? { tipo: truppa, eroe: false } : null;
}

// Oggetti che un tipo di modello può comprare: [{ id, costo, oggetto }]
// Nella lista della banda il valore è il costo oppure { "costo": n, "soloEroi": true }
function oggettiAcquistabili(banda, tipo, eroe) {
    if (tipo.animale || !tipo.lista) return [];
    const lista = banda.liste[tipo.lista] || {};
    return Object.keys(lista)
        .map(id => {
            const voce = lista[id];
            const costo = typeof voce === 'number' ? voce : voce.costo;
            const soloEroi = typeof voce === 'object' && voce.soloEroi;
            return { id, costo, soloEroi, oggetto: Dati.equip[id] };
        })
        .filter(v => v.oggetto && (eroe || !v.soloEroi));
}

// Modello per il motore delle probabilità (js/motore.js) da un tipo e dal suo equipaggiamento
function modelloPerMotore(tipo, equip) {
    return {
        nome: tipo.nome,
        profilo: tipo.profilo,
        equip: tipo.animale ? [] : equip,
        animale: !!tipo.animale,
        grosso: !!tipo.grosso,
        modTS: tipo.modTS || 0
    };
}

// Numero con la virgola e al massimo "cifre" decimali
function formatta(numero, cifre = 2) {
    return Number(numero.toFixed(cifre)).toLocaleString('it-IT');
}

function percentuale(p) {
    return formatta(p * 100, p < 0.1 ? 1 : 0) + '%';
}

function escapeHtml(testo) {
    return String(testo)
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
