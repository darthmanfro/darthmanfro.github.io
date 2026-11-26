// ==========================================================================
// ESPORTA E IMPORTA
// "Esporta" scarica un file .json con tutte le bande salvate, le impostazioni
// e le ultime proposte; "Importa" lo ricarica (anche su un altro browser o
// computer). Funziona anche aprendo la pagina con il doppio clic (file://):
// si scarica con un link e si legge con FileReader, senza fetch.
// ==========================================================================

const FORMATO_ESPORTAZIONE = 'mordheim';
const VERSIONE_ESPORTAZIONE = 1;

function esporta() {
    salvaBanda();
    salvaImpostazioni();
    const contenuto = {
        formato: FORMATO_ESPORTAZIONE,
        versione: VERSIONE_ESPORTAZIONE,
        esportato: new Date().toISOString(),
        archivio: leggiArchivio(),
        impostazioni,
        proposte: proposte ? { chiave: chiaveProposte, proposte } : null
    };
    const blob = new Blob([JSON.stringify(contenuto, null, 2)], { type: 'application/json' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `mordheim-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(link.href), 1000);
}

// Legge il file scelto con "Importa"
function leggiFileImportato(evento) {
    const file = evento.target.files[0];
    evento.target.value = '';           // così si può reimportare lo stesso file
    if (!file) return;
    const lettore = new FileReader();
    lettore.onload = () => {
        try {
            const bande = importa(JSON.parse(lettore.result));
            mostraEsitoImporta(`Importate ${bande} ${bande === 1 ? 'banda' : 'bande'} ✓`);
        } catch (errore) {
            alert('Non riesco a importare il file: ' + errore.message);
        }
    };
    lettore.onerror = () => alert('Non riesco a leggere il file.');
    lettore.readAsText(file);
}

// Le bande del file sostituiscono quelle con lo stesso nome; le altre restano.
// Restituisce il numero di bande importate.
function importa(contenuto) {
    if (!contenuto || contenuto.formato !== FORMATO_ESPORTAZIONE || !contenuto.archivio
        || typeof contenuto.archivio.bande !== 'object') {
        throw new Error('non è un file esportato da questa pagina.');
    }
    const archivio = leggiArchivio();
    const ids = Object.keys(contenuto.archivio.bande).filter(id => Dati.bande[id]);
    ids.forEach(id => { archivio.bande[id] = contenuto.archivio.bande[id]; });
    if (Dati.bande[contenuto.archivio.ultima]) archivio.ultima = contenuto.archivio.ultima;
    try {
        localStorage.setItem(CHIAVE_BANDA, JSON.stringify(archivio));
    } catch (e) { /* si lavora senza salvataggio */ }

    if (contenuto.impostazioni && typeof contenuto.impostazioni === 'object') {
        impostazioni = { ...impostazioni, ...contenuto.impostazioni };
        if (!datiBersaglio(impostazioni.bersaglio)) impostazioni.bersaglio = 'p:umano';
        controllaObiettivo();
        if (!SCHEDE[impostazioni.scheda]) impostazioni.scheda = 'banda';
        bersaglioInUso = null;
        salvaImpostazioni();
    }
    if (contenuto.proposte) {
        try {
            localStorage.setItem(CHIAVE_PROPOSTE, JSON.stringify(contenuto.proposte));
        } catch (e) { /* si lavora senza salvataggio */ }
        caricaProposte();
    }

    // Si riapre la banda (apriBanda controlla che il salvataggio sia valido) e si ridisegna tutto
    apriBanda(archivio.ultima && Dati.bande[archivio.ultima] ? archivio.ultima : statoBanda.bandaId);
    riempiSceltaBanda();
    riempiSceltaBersaglio();
    mostraCorone();
    aggiornaTutto();
    return ids.length;
}

// Esito sul pulsante per qualche secondo, come "Svuota banda"
let timerImporta = null;
function mostraEsitoImporta(testo) {
    const pulsante = document.getElementById('btnImporta');
    pulsante.textContent = testo;
    clearTimeout(timerImporta);
    timerImporta = setTimeout(() => { pulsante.textContent = 'Importa'; }, 3000);
}

function collegaEsportaImporta() {
    document.getElementById('btnEsporta').addEventListener('click', esporta);
    document.getElementById('btnImporta').addEventListener('click', () => document.getElementById('fileImporta').click());
    document.getElementById('fileImporta').addEventListener('change', leggiFileImportato);
}
