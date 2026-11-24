// ==========================================================================
// DATI
// Carica i file di dati/ (regole, equipaggiamento, bersagli, bande) e offre
// piccole funzioni per leggerli.
//
// Ogni file di dati è un .js che contiene JSON dentro registraDati("nome", {...}):
// si carica con un tag <script>, che funziona anche aprendo la pagina con il
// doppio clic (file://), dove il browser blocca la lettura dei file .json.
// ==========================================================================

const Dati = {
    regole: null,     // dati/regole.js
    equip: {},        // oggetti di dati/equipaggiamento.js per id
    indice: [],       // elenco bande di dati/bande/indice.js
    bande: {},        // bande per id
    bersagli: []      // bersagli di riferimento di dati/bersagli.js
};

const datiRegistrati = {};

// Chiamata dai file di dati
function registraDati(nome, contenuto) {
    datiRegistrati[nome] = contenuto;
}

// Carica un file .js con un tag <script>; si risolve quando è stato eseguito
function caricaScript(percorso) {
    return new Promise((risolvi, rifiuta) => {
        const script = document.createElement('script');
        script.src = percorso;
        script.onload = risolvi;
        script.onerror = () => rifiuta(new Error('File mancante o non leggibile: ' + percorso));
        document.head.appendChild(script);
    });
}

function richiesto(nome, percorso) {
    if (!datiRegistrati[nome]) throw new Error(percorso + ': il file non registra "' + nome + '" (controlla le virgole e le virgolette)');
    return datiRegistrati[nome];
}

async function caricaDati() {
    await Promise.all(['regole', 'equipaggiamento', 'bersagli', 'bande/indice'].map(f => caricaScript('dati/' + f + '.js')));
    const indice = richiesto('indice', 'dati/bande/indice.js');
    await Promise.all(indice.bande.map(b => caricaScript('dati/bande/' + b.file)));
    applicaDati();
}

// Riempie Dati con quanto registrato dai file
function applicaDati() {
    Dati.regole = richiesto('regole', 'dati/regole.js');
    Dati.bersagli = richiesto('bersagli', 'dati/bersagli.js').bersagli;
    richiesto('equipaggiamento', 'dati/equipaggiamento.js').oggetti.forEach(o => { Dati.equip[o.id] = o; });
    Dati.indice = richiesto('indice', 'dati/bande/indice.js').bande;
    Dati.indice.forEach(b => { Dati.bande[b.id] = richiesto('banda:' + b.id, 'dati/bande/' + b.file); });
}

// Tipo di modello (eroe o truppa) di una banda: { tipo, eroe } oppure null
function tipoDi(banda, tipoId) {
    const eroe = banda.eroi.find(t => t.id === tipoId);
    if (eroe) return { tipo: eroe, eroe: true };
    const truppa = banda.truppe.find(t => t.id === tipoId);
    return truppa ? { tipo: truppa, eroe: false } : null;
}

// Oggetti che un tipo di modello può comprare: [{ id, costo, oggetto }]
// Nella lista della banda il valore è il costo oppure { "costo": n, "soloEroi": true };
// "vieta" nel tipo esclude interi tipi di oggetto (es. l'Augure: niente armature né scudi)
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
        .filter(v => v.oggetto && (eroe || !v.soloEroi) && !(tipo.vieta || []).includes(v.oggetto.tipo));
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
