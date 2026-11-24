// ==========================================================================
// BERSAGLIO E IMPOSTAZIONI
// Il bersaglio di riferimento (da dati/bersagli.json, dai modelli delle
// bande o personalizzato) contro cui si calcolano le probabilità: è anche
// l'avversario che attacca i tuoi modelli. Le impostazioni (bersaglio,
// turno, opzioni di tiro, scheda aperta, confronto) restano nel browser.
// ==========================================================================

const CHIAVE_IMPOSTAZIONI = 'mordheim-impostazioni-v1';
const VOCI_BERSAGLIO = ['AC', 'AB', 'F', 'R', 'Fe', 'I', 'A'];

let impostazioni = {
    bersaglio: 'p:umano',      // p:<id bersaglio>, b:<banda>:<tipo>, personalizzato
    personalizzato: null,      // { nome, profilo, equip, animale, grosso }
    turno: 'media',            // media | primo | successivi
    lungaGittata: false,
    copertura: false,
    muovere: false,            // il tiratore ha mosso (-1, le armi "muovi o tira" non sparano)
    scheda: 'banda',
    confronto: null,           // vedi js/probabilita.js
    obiettivo: 'equilibrio',   // ottimizzatore: equilibrio | attacco
    pesoTiro: 0.5              // ottimizzatore: peso del tiro rispetto al corpo a corpo
};

let bersaglioInUso = null;     // modello per il motore, rifatto quando cambia il bersaglio

function salvaImpostazioni() {
    try {
        localStorage.setItem(CHIAVE_IMPOSTAZIONI, JSON.stringify(impostazioni));
    } catch (e) { /* si lavora senza salvataggio */ }
}

function caricaImpostazioni() {
    try {
        const salvate = JSON.parse(localStorage.getItem(CHIAVE_IMPOSTAZIONI));
        if (salvate && typeof salvate === 'object') impostazioni = { ...impostazioni, ...salvate };
    } catch (e) { /* impostazioni predefinite */ }
    if (!datiBersaglio(impostazioni.bersaglio)) impostazioni.bersaglio = 'p:umano';
}

// Dati del bersaglio indicato: { nome, profilo, equip, animale, grosso } oppure null
function datiBersaglio(chiave) {
    if (chiave === 'personalizzato') return impostazioni.personalizzato;
    if (chiave.startsWith('p:')) return Dati.bersagli.find(b => b.id === chiave.slice(2)) || null;
    if (chiave.startsWith('b:')) {
        const [, bandaId, tipoId] = chiave.split(':');
        const banda = Dati.bande[bandaId];
        const trovato = banda && tipoDi(banda, tipoId);
        if (!trovato) return null;
        return { ...trovato.tipo, nome: trovato.tipo.nome + ' (' + banda.nome + ')', equip: [] };
    }
    return null;
}

function bersaglioCorrente() {
    if (!bersaglioInUso) {
        const d = datiBersaglio(impostazioni.bersaglio);
        bersaglioInUso = { ...modelloPerMotore(d, d.equip || []), nome: d.nome };
    }
    return bersaglioInUso;
}

function scegliBersaglio(chiave) {
    if (!datiBersaglio(chiave)) return;
    impostazioni.bersaglio = chiave;
    bersaglioInUso = null;
}

// Modifica del bersaglio: si parte da una copia di quello attuale, che diventa "personalizzato"
function modificaBersaglio(modifica) {
    const attuale = datiBersaglio(impostazioni.bersaglio);
    const copia = {
        nome: 'Personalizzato',
        profilo: { ...attuale.profilo },
        equip: [...(attuale.equip || [])],
        animale: !!attuale.animale,
        grosso: !!attuale.grosso
    };
    modifica(copia);
    if (copia.animale) copia.equip = [];
    impostazioni.personalizzato = copia;
    impostazioni.bersaglio = 'personalizzato';
    bersaglioInUso = null;
}

// Opzioni per il motore
function opzioniCalcolo() {
    return { turno: impostazioni.turno, lungaGittata: impostazioni.lungaGittata, copertura: impostazioni.copertura, muovere: impostazioni.muovere };
}

// Menu di scelta del bersaglio (nella testata)
function riempiSceltaBersaglio() {
    const scelta = document.getElementById('sceltaBersaglio');
    const opzione = (valore, testo) => `<option value="${valore}">${escapeHtml(testo)}</option>`;
    let html = `<optgroup label="Bersagli di riferimento">${Dati.bersagli.map(b => opzione('p:' + b.id, b.nome)).join('')}</optgroup>`;
    Dati.indice.forEach(voce => {
        const banda = Dati.bande[voce.id];
        html += `<optgroup label="${escapeHtml(banda.nome)}">`
            + [...banda.eroi, ...banda.truppe].map(t => opzione(`b:${banda.id}:${t.id}`, t.nome)).join('')
            + '</optgroup>';
    });
    if (impostazioni.personalizzato) html += opzione('personalizzato', 'Personalizzato');
    scelta.innerHTML = html;
    scelta.value = impostazioni.bersaglio;
}
