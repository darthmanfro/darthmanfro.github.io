// ==========================================================================
// APP
// Avvio: carica i dati, sceglie la banda e collega i comandi.
// ==========================================================================

function aggiornaTutto() {
    salvaBanda();
    disegnaBanda();
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

// Comandi delle schede (pulsanti e menu con data-azione)
function gestisciClic(evento) {
    const pulsante = evento.target.closest('button[data-azione]');
    if (!pulsante) return;
    const uid = Number(pulsante.dataset.uid);
    switch (pulsante.dataset.azione) {
        case 'aggiungiUnita': aggiungiUnita(pulsante.dataset.tipo); break;
        case 'rimuoviUnita': rimuoviUnita(uid); break;
        case 'meno': cambiaNumero(uid, -1); break;
        case 'piu': cambiaNumero(uid, +1); break;
        case 'togliEquip': rimuoviEquip(uid, Number(pulsante.dataset.indice)); break;
        default: return;
    }
    aggiornaTutto();
}

function gestisciCambio(evento) {
    const menu = evento.target.closest('select[data-azione="aggiungiEquip"]');
    if (!menu || !menu.value) return;
    aggiungiEquip(Number(menu.dataset.uid), menu.value);
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
    document.getElementById('btnSvuota').addEventListener('click', premiSvuota);
    document.addEventListener('click', gestisciClic);
    document.addEventListener('change', gestisciCambio);
}

async function avvia() {
    try {
        await caricaDati();
    } catch (errore) {
        document.getElementById('errore-caricamento').classList.remove('nascosto');
        document.getElementById('errore-dettaglio').textContent = errore.message;
        return;
    }
    apriBanda(ultimaBandaSalvata() || Dati.indice[0].id);
    riempiSceltaBanda();
    mostraCorone();
    collegaComandi();
    aggiornaTutto();
}

document.addEventListener('DOMContentLoaded', avvia);
