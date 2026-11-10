// ==========================================================================
// FINESTRA DI CONFIGURAZIONE
// Lingua Smorfia, regola dei numeri adiacenti, premi attivi e caricamento
// del file partita (.JSON). Le impostazioni si applicano solo con
// "Salva e Chiudi"; "Chiudi" scarta le modifiche.
// ==========================================================================

const SELETTORE_CHECK_PREMI = ".premi-checkbox-group input[type='checkbox'][value]";

// Lingua scelta nella finestra ma non ancora salvata
let linguaSelezionata = impostazioni.lingua;

function apriConfig() {
    // Riallinea i controlli allo stato salvato
    linguaSelezionata = impostazioni.lingua;
    aggiornaPulsantiLingua();

    const checkAdiacenti = document.getElementById("checkNumeriAdiacenti");
    if (checkAdiacenti) checkAdiacenti.checked = impostazioni.numeriAdiacentiRichiesti;

    const checkSuono = document.getElementById("checkSuonoVincite");
    if (checkSuono) checkSuono.checked = impostazioni.suonoVincite;

    document.querySelectorAll(SELETTORE_CHECK_PREMI).forEach(cb => {
        cb.checked = partita.premiAttivi.includes(cb.value);
    });

    aggiornaStatoPartita();

    // Il download per uso offline ha senso solo dalla versione online
    const sezioneOffline = document.getElementById("sezione-offline");
    if (sezioneOffline) sezioneOffline.classList.toggle("nascosto", !downloadOfflineDisponibile());

    // Il riquadro informazioni parte sempre chiuso
    document.getElementById("info-app").classList.add("nascosto");

    document.getElementById("modal-config").classList.add("visibile");
}

// Mostra/nasconde il riquadro con versione, autore ed email
function mostraInfoApp() {
    document.getElementById("versione-app").textContent =
        typeof VERSIONE_APP !== "undefined" ? VERSIONE_APP : "sconosciuta";
    document.getElementById("info-app").classList.toggle("nascosto");
}

function chiudiConfigSenzaSalvare() {
    document.getElementById("modal-config").classList.remove("visibile");
}

function salvaChiudiConfig() {
    impostazioni.lingua = linguaSelezionata;

    const checkAdiacenti = document.getElementById("checkNumeriAdiacenti");
    if (checkAdiacenti) impostazioni.numeriAdiacentiRichiesti = checkAdiacenti.checked;

    const checkSuono = document.getElementById("checkSuonoVincite");
    if (checkSuono) impostazioni.suonoVincite = checkSuono.checked;

    const attivi = Array.from(document.querySelectorAll(SELETTORE_CHECK_PREMI))
        .filter(cb => cb.checked)
        .map(cb => cb.value);

    // Almeno un premio deve restare attivo
    if (attivi.length > 0) {
        partita.premiAttivi = attivi;
        if (partita.indicePremioAttuale >= attivi.length) partita.indicePremioAttuale = 0;
    }

    aggiornaInterfacciaPremio(); // Ricalcola anche le vincite con le nuove regole
    document.getElementById("modal-config").classList.remove("visibile");
}

// --- LINGUA SMORFIA ---

function selezionaLingua(lingua) {
    linguaSelezionata = lingua;
    aggiornaPulsantiLingua();
}

function aggiornaPulsantiLingua() {
    document.getElementById("btnLinguaNap").classList.toggle("attivo", linguaSelezionata === 'nap');
    document.getElementById("btnLinguaIta").classList.toggle("attivo", linguaSelezionata === 'ita');
}

// --- FILE PARTITA (.JSON) ---

function caricaFilePartita(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const dati = JSON.parse(e.target.result);
            if (dati && Array.isArray(dati.cartelle)) {
                impostaCartellePartita(dati.cartelle);
                alert(`Partita caricata con successo! ${partita.cartelleCaricate.length} cartelle in ascolto per i premi.`);
            } else {
                alert('File JSON non valido per la Tombola.');
            }
        } catch (err) {
            alert('Errore nella lettura del file JSON.');
        }
    };
    reader.readAsText(file);
    // Permette di ricaricare lo stesso file una seconda volta
    event.target.value = "";
}

// Scritta accanto al pulsante di caricamento ("N cartelle caricate")
function aggiornaStatoPartita() {
    const stato = document.getElementById("stato-partita");
    if (!stato) return;
    const quante = partita.cartelleCaricate.length;
    stato.textContent = quante > 0 ? `${quante} cartelle caricate` : "Nessuna partita caricata";
    stato.classList.toggle("caricata", quante > 0);
}
