// ==========================================================================
// APP
// Avvio: carica i dati, sceglie la banda, collega i comandi e disegna la
// scheda aperta (Banda, Probabilità o Ottimizzatore).
// ==========================================================================

const SCHEDE = {
    banda: disegnaBanda,
    probabilita: disegnaProbabilita,
    ottimizzatore: disegnaOttimizzatore
};

// Salva e ridisegna la scheda aperta
function aggiornaTutto() {
    salvaBanda();
    salvaImpostazioni();
    document.querySelectorAll('.scheda-pulsante').forEach(p => {
        p.classList.toggle('attiva', p.dataset.scheda === impostazioni.scheda);
    });
    Object.keys(SCHEDE).forEach(nome => {
        document.getElementById('scheda-' + nome).classList.toggle('attiva', nome === impostazioni.scheda);
    });
    SCHEDE[impostazioni.scheda]();
}

function riempiSceltaBanda() {
    const scelta = document.getElementById('sceltaBanda');
    scelta.innerHTML = Dati.indice
        .map(b => `<option value="${b.id}">${escapeHtml(b.nome)} (${Dati.bande[b.id].corone})</option>`)
        .join('');
    scelta.value = statoBanda.bandaId;
}

function mostraCorone() {
    document.getElementById('corone').value = statoBanda.corone;
}

// Pulsanti con data-azione della scheda Banda e del confronto
function gestisciClic(evento) {
    const schedaPulsante = evento.target.closest('button[data-scheda]');
    if (schedaPulsante) {
        impostazioni.scheda = schedaPulsante.dataset.scheda;
        aggiornaTutto();
        return;
    }
    const pulsante = evento.target.closest('button[data-azione]');
    if (!pulsante) return;
    const uid = Number(pulsante.dataset.uid);
    switch (pulsante.dataset.azione) {
        case 'aggiungiUnita': aggiungiUnita(pulsante.dataset.tipo); break;
        case 'rimuoviUnita': rimuoviUnita(uid); break;
        case 'meno': cambiaNumero(uid, -1); break;
        case 'piu': cambiaNumero(uid, +1); break;
        case 'togliEquip': rimuoviEquip(uid, Number(pulsante.dataset.indice)); break;
        default:
            if (!gestisciComandoProbabilita(pulsante, evento) && !gestisciComandoOttimizzatore(pulsante)) return;
    }
    aggiornaTutto();
}

// Menu, caselle e campi numerici
function gestisciCambio(evento) {
    const elemento = evento.target;
    if (!elemento.dataset.azione && elemento.name !== 'turno') return;
    if (elemento.dataset.azione === 'aggiungiEquip') {
        if (!elemento.value) return;
        aggiungiEquip(Number(elemento.dataset.uid), elemento.value);
    } else if (!gestisciComandoProbabilita(elemento, evento) && !gestisciComandoOttimizzatore(elemento)) {
        return;
    }
    if (impostazioni.bersaglio === 'personalizzato') riempiSceltaBersaglio();
    aggiornaTutto();
}

// "Svuota banda" chiede conferma con un secondo clic entro 3 secondi
let timerSvuota = null;
function premiSvuota() {
    const pulsante = document.getElementById('btnSvuota');
    if (!pulsante.classList.contains('conferma')) {
        pulsante.classList.add('conferma');
        pulsante.textContent = 'Sicuro? Clicca ancora';
        timerSvuota = setTimeout(ripristinaSvuota, 3000);
        return;
    }
    ripristinaSvuota();
    nuovaBanda(statoBanda.bandaId);
    mostraCorone();
    aggiornaTutto();
}

function ripristinaSvuota() {
    clearTimeout(timerSvuota);
    const pulsante = document.getElementById('btnSvuota');
    pulsante.classList.remove('conferma');
    pulsante.textContent = 'Svuota banda';
}

function collegaComandi() {
    document.getElementById('sceltaBanda').addEventListener('change', evento => {
        apriBanda(evento.target.value);
        mostraCorone();
        aggiornaTutto();
    });
    document.getElementById('corone').addEventListener('input', evento => {
        const valore = parseInt(evento.target.value, 10);
        if (Number.isInteger(valore) && valore >= 0) {
            statoBanda.corone = valore;
            aggiornaTutto();
        }
    });
    document.getElementById('sceltaBersaglio').addEventListener('change', evento => {
        scegliBersaglio(evento.target.value);
        aggiornaTutto();
    });
    document.getElementById('btnSvuota').addEventListener('click', premiSvuota);
    document.addEventListener('click', gestisciClic);
    document.addEventListener('change', gestisciCambio);
}

async function avvia() {
    try {
        await caricaDati();
    } catch (errore) {
        document.getElementById('errore-caricamento').classList.remove('nascosto');
        document.getElementById('schede').classList.add('nascosto');
        document.getElementById('errore-dettaglio').textContent = errore.message;
        return;
    }
    impostaDatiMotore(Dati.regole, Dati.equip);
    caricaImpostazioni();
    if (!SCHEDE[impostazioni.scheda]) impostazioni.scheda = 'banda';
    apriBanda(ultimaBandaSalvata() || Dati.indice[0].id);
    riempiSceltaBanda();
    riempiSceltaBersaglio();
    mostraCorone();
    collegaComandi();
    aggiornaTutto();
}

document.addEventListener('DOMContentLoaded', avvia);
