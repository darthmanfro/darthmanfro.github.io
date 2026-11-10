// ==========================================================================
// STATO DELL'APPLICAZIONE
// Unico punto in cui vive lo stato: gli altri file leggono e modificano
// questi due oggetti, senza variabili globali sparse.
// ==========================================================================

// Premi in ordine di gioco e quanti numeri servono per vincerli
const PREMI = ['AMBO', 'TERNO', 'QUATERNA', 'CINQUINA', 'TOMBOLA'];
const SOGLIA_PREMIO = { AMBO: 2, TERNO: 3, QUATERNA: 4, CINQUINA: 5, TOMBOLA: 15 };

// Impostazioni scelte nella finestra di configurazione
const impostazioni = {
    lingua: 'nap',                  // Lingua della Smorfia: 'nap' o 'ita'
    numeriAdiacentiRichiesti: true, // Premi di riga solo con numeri consecutivi nella riga
    suonoVincite: true,             // "Ding" quando compare una possibile vincita
    bloccoEstrazioneSec: 1,         // Pulsante "Estrai" bloccato dopo il clic (evita doppi clic)
    durataNumeroSec: 3.5,           // Quanto resta a schermo il numero estratto
    autoEstrazione: false,          // Pulsante Estrai come Play/Pausa
    intervalloAutoSec: 7            // Secondi tra due estrazioni automatiche
};

// Stato della partita in corso
const partita = {
    numeriEstratti: new Set(),

    // Premio in palio
    premiAttivi: [...PREMI],        // Premi spuntati nella configurazione
    indicePremioAttuale: 0,         // Indice in premiAttivi
    premiAssegnati: new Set(),      // Premi già confermati (es. 'AMBO')

    // Controllo automatico vincite
    cartelleCaricate: [],             // Cartelle da file .JSON o dal generatore
    cartelleScartatePerPremio: new Set(), // Chiavi "idCartella-PREMIO" segnate come invendute
    possibiliVincite: [],             // [{ premio, cartellaId, numeri }] in attesa di verifica
    vinciteGiaSegnalate: new Set()    // Chiavi "idCartella-PREMIO" già annunciate con scintilla/suono
};
