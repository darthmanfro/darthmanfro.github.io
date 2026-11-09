// --- STATO DEL GIOCO ---
let numeriEstratti = new Set();
let ultimaEstrazione = null;
let linguaCorrente = 'nap'; // 'nap' o 'ita'
let numeriAdiacentiRichiesti = true; // Opzione numeri adiacenti (default true)

// Premi in palio ordinati
const listaPremi = ['AMBO', 'TERNO', 'QUATERNA', 'CINQUINA', 'TOMBOLA'];
let premiAttivi = ['AMBO', 'TERNO', 'QUATERNA', 'CINQUINA', 'TOMBOLA'];
let indicePremioAttuale = 0;

// --- STATO PARTITA CARICATA E CONTROLLO VINCITE ---
let cartelleCaricate = [];
let premiAssegnati = new Set(); // Traccia i premi già assegnati (es. 'AMBO')
let cartelleScartatePerPremio = new Set(); // Gestisce le cartelle marcate come invendute per un determinato premio

// Dizionario Smorfia Napoletana e Italiana
const smorfia = {
    1: { nap: "L'Italia", ita: "L'Italia" },
    2: { nap: "'A piccerella", ita: "La bambina" },
    3: { nap: "'A jatta", ita: "La gatta" },
    4: { nap: "'O puorco", ita: "Il maiale" },
    5: { nap: "'A mano", ita: "La mano" },
    6: { nap: "Chella che guarda 'nterra", ita: "Quella che guarda a terra" },
    7: { nap: "'O vasetto", ita: "Il vasetto" },
    8: { nap: "'A Maronna", ita: "La Madonna" },
    9: { nap: "'A figliata", ita: "La prole" },
    10: { nap: "'E fasule", ita: "I fagioli" },
    11: { nap: "'E suricille", ita: "I topolini" },
    12: { nap: "'E surdate", ita: "I soldati" },
    13: { nap: "Sant'Antonio", ita: "Sant'Antonio" },
    14: { nap: "'O mbriaco", ita: "L'ubriaco" },
    15: { nap: "'O guaglione", ita: "Il ragazzo" },
    16: { nap: "'O culo", ita: "Il sedere" },
    17: { nap: "'A disgrazia", ita: "La disgrazia" },
    18: { nap: "'O sanghe", ita: "Il sangue" },
    19: { nap: "'A resata", ita: "La risata" },
    20: { nap: "'A festa", ita: "La festa" },
    21: { nap: "'A femmena annura", ita: "La donna nuda" },
    22: { nap: "'O pazzo", ita: "Il pazzo" },
    23: { nap: "'O scemo", ita: "Lo scemo" },
    24: { nap: "'E gguardie", ita: "Le guardie" },
    25: { nap: "Natale", ita: "Natale" },
    26: { nap: "Nanninella", ita: "La piccola Anna" },
    27: { nap: "'O cantero", ita: "Il vaso da notte" },
    28: { nap: "'E zzizze", ita: "Le tette" },
    29: { nap: "'O pate d''e criature", ita: "Il padre dei bambini" },
    30: { nap: "'E palle d''o tenente", ita: "Le palle del tenente" },
    31: { nap: "'O padrone 'e casa", ita: "Il padrone di casa" },
    32: { nap: "'O capitone", ita: "Il capitone" },
    33: { nap: "Ll'anne 'e Cristo", ita: "Gli anni di Cristo" },
    34: { nap: "'A capa", ita: "La testa" },
    35: { nap: "L'aucelluzzo", ita: "L'uccellino" },
    36: { nap: "'E castagnelle", ita: "Le nacchere" },
    37: { nap: "'O monaco", ita: "Il monaco" },
    38: { nap: "'E mmazzate", ita: "Le botte" },
    39: { nap: "'A funa 'nganna", ita: "La corda al collo" },
    40: { nap: "'A noia", ita: "La noia" },
    41: { nap: "'O curtiello", ita: "Il coltello" },
    42: { nap: "'O ccafè", ita: "Il caffè" },
    43: { nap: "'A femmena 'ncopp' 'o balcone", ita: "La donna al balcone" },
    44: { nap: "'E ccancelle", ita: "Il carcere" },
    45: { nap: "'O vino bbuono", ita: "Il vino buono" },
    46: { nap: "'E denare", ita: "I soldi" },
    47: { nap: "'O muorto", ita: "Il morto" },
    48: { nap: "'O muorto che parla", ita: "Il morto che parla" },
    49: { nap: "'O piezzo 'e carne", ita: "Il pezzo di carne" },
    50: { nap: "'O ppane", ita: "Il pane" },
    51: { nap: "'O ciardino", ita: "Il giardino" },
    52: { nap: "'A mamma", ita: "La mamma" },
    53: { nap: "'O viecchio", ita: "Il vecchio" },
    54: { nap: "'O cappiello", ita: "Il cappello" },
    55: { nap: "'A museca", ita: "La musica" },
    56: { nap: "'A caruta", ita: "La caduta" },
    57: { nap: "'O scartellato", ita: "Il gobbo" },
    58: { nap: "'O paccotto", ita: "Il pacco" },
    59: { nap: "'E pile", ita: "I peli" },
    60: { nap: "Se lamenta", ita: "Il lamento" },
    61: { nap: "'O cacciatore", ita: "Il cacciatore" },
    62: { nap: "'O muorto acciso", ita: "Il morto ammazzato" },
    63: { nap: "'A sposa", ita: "La sposa" },
    64: { nap: "'A sciammeria", ita: "La marsina" },
    65: { nap: "'O chianto", ita: "Il pianto" },
    66: { nap: "'E ddoje zetelle", ita: "Le due zitelle" },
    67: { nap: "'O totaro int'â chitarra", ita: "Il totano nella chitarra" },
    68: { nap: "'A zuppa cotta", ita: "La zuppa cotta" },
    69: { nap: "Sott'e'ncoppa", ita: "Sottosopra" },
    70: { nap: "'O palazzo", ita: "Il palazzo" },
    71: { nap: "L'ommo 'e merda", ita: "L'uomo di merda" },
    72: { nap: "'A maraviglia", ita: "La meraviglia" },
    73: { nap: "'O spitale", ita: "L'ospedale" },
    74: { nap: "'A rotta", ita: "La grotta" },
    75: { nap: "Pullecenella", ita: "Pulcinella" },
    76: { nap: "'A funtana", ita: "La fontana" },
    77: { nap: "'E riavulille", ita: "I diavoli" },
    78: { nap: "'A bella figliola", ita: "La bella ragazza" },
    79: { nap: "'O mariuolo", ita: "Il ladro" },
    80: { nap: "'A vocca", ita: "La bocca" },
    81: { nap: "'E sciure", ita: "I fiori" },
    82: { nap: "'A tavula 'mbandita", ita: "La tavola imbandita" },
    83: { nap: "'O maletiempo", ita: "Il maltempo" },
    84: { nap: "'A chiesa", ita: "La chiesa" },
    85: { nap: "Ll'aneme 'o priatorio", ita: "Le anime del purgatorio" },
    86: { nap: "'A puteca", ita: "La bottega" },
    87: { nap: "'E perucchie", ita: "I pidocchi" },
    88: { nap: "'E casecavalle", ita: "I caciocavalli" },
    89: { nap: "'A vecchia", ita: "La vecchia" },
    90: { nap: "'A paura", ita: "La paura" }
};

// Inizializzazione al caricamento della pagina
document.addEventListener("DOMContentLoaded", () => {
    creaTabellone();
    aggiornaInterfacciaPremio();
});

// Crea le celle da 1 a 90 sul tabellone
function creaTabellone() {
    const griglia = document.getElementById("griglia");
    if (!griglia) return;
    griglia.innerHTML = "";

    for (let i = 1; i <= 90; i++) {
        const cella = document.createElement("div");
        cella.className = "cella";
        cella.id = `cella-${i}`;
        cella.textContent = i;
        griglia.appendChild(cella);
    }
}


let timerOverlay = null;
let estrazioneBloccata = false; // Flag per il blocco temporaneo del pulsante

// Estrazione con debounce di 1 secondo sul pulsante
function estraiNumero() {
    if (estrazioneBloccata) return; // Se è bloccato, ignora il clic
    
    if (numeriEstratti.size >= 90) {
        alert("Tutti i 90 numeri sono stati estratti!");
        return;
    }

    // Attiva il blocco
    estrazioneBloccata = true;
    const btnEstrai = document.getElementById("btnEstrai");
    if (btnEstrai) btnEstrai.disabled = true;

    // Sblocca il pulsante dopo 1 secondo esatto
    setTimeout(() => {
        estrazioneBloccata = false;
        if (btnEstrai) btnEstrai.disabled = false;
    }, 1000);

    let numero;
    do {
        numero = Math.floor(Math.random() * 90) + 1;
    } while (numeriEstratti.has(numero));

    registraEstrazione(numero);
}

function registraEstrazione(numero) {
    if (numeriEstratti.has(numero)) return;
    
    numeriEstratti.add(numero);
    ultimaEstrazione = numero;

    const cella = document.getElementById(`cella-${numero}`);
    if (cella) cella.classList.add("estratto");

    mostraOverlayNumero(numero);
    aggiornaStorico(numero);
    verificaVinciteAutomatiche();
}

// Overlay con reset del timer in modo che duri sempre i suoi 3.5 secondi pieni
function mostraOverlayNumero(num) {
    const overlay = document.getElementById("overlay-numero");
    if (!overlay) return;

    // Se c'è un timer attivo precedente, lo puliamo così non chiude in anticipo il nuovo numero
    if (timerOverlay) {
        clearTimeout(timerOverlay);
        timerOverlay = null;
    }

    const infoSmorfia = smorfia[num] ? smorfia[num][linguaCorrente] : "";

    overlay.innerHTML = `
        <div class="overlay-num">${num}</div>
        <div class="overlay-smorfia">${infoSmorfia}</div>
    `;
    
    overlay.classList.add("mostra");

    // Il nuovo numero parte con i suoi 3.5 secondi completi garantiti
    timerOverlay = setTimeout(() => {
        overlay.classList.remove("mostra");
        timerOverlay = null;
    }, 3500);
}

// Aggiorna gli ultimi numeri estratti nella barra
function aggiornaStorico(ultimoNum) {
    const container = document.getElementById("storico-numeri");
    if (!container) return;

    container.innerHTML = "";
    // Prendi gli ultimi 5 estratti in ordine inverso
    const arrayEstratti = Array.from(numeriEstratti);
    const ultimi = arrayEstratti.slice(-5).reverse();

    ultimi.forEach(n => {
        const badge = document.createElement("span");
        badge.className = "storico-badge";
        badge.textContent = n;
        container.appendChild(badge);
    });
}

// Gestione Avanzamento Premi in Palio
function avanzaPremio() {
    if (premiAttivi.length === 0) return;
    indicePremioAttuale = (indicePremioAttuale + 1) % premiAttivi.length;
    aggiornaInterfacciaPremio();
}

function aggiornaInterfacciaPremio() {
    const badgePremio = document.getElementById("premio-attuale");
    if (!badgePremio) return;
    if (premiAttivi.length > 0) {
        badgePremio.textContent = premiAttivi[indicePremioAttuale];
    } else {
        badgePremio.textContent = "NESSUNO";
    }
    // Il premio in palio è cambiato: ricalcola le possibili vincite
    verificaVinciteAutomatiche();
}

// --- CONFIGURAZIONE PARTITA E MODALI ---
// Lingua scelta nella modale ma non ancora salvata
let linguaSelezionata = linguaCorrente;

function apriConfig() {
    // Riallinea i controlli della modale allo stato salvato
    linguaSelezionata = linguaCorrente;
    aggiornaPulsantiLingua();

    const checkAdiacenti = document.getElementById("checkNumeriAdiacenti");
    if (checkAdiacenti) checkAdiacenti.checked = numeriAdiacentiRichiesti;

    document.querySelectorAll(".premi-checkbox-group input[type='checkbox'][value]").forEach(cb => {
        cb.checked = premiAttivi.includes(cb.value);
    });

    aggiornaStatoPartita();
    document.getElementById("modal-config").classList.add("visibile");
}

// Chiude la configurazione scartando le modifiche non salvate
function chiudiConfigSenzaSalvare() {
    document.getElementById("modal-config").classList.remove("visibile");
}

function aggiornaStatoPartita() {
    const stato = document.getElementById("stato-partita");
    if (!stato) return;
    if (cartelleCaricate.length > 0) {
        stato.textContent = `${cartelleCaricate.length} cartelle caricate`;
        stato.classList.add("caricata");
    } else {
        stato.textContent = "Nessuna partita caricata";
        stato.classList.remove("caricata");
    }
}

function salvaChiudiConfig() {
    linguaCorrente = linguaSelezionata;

    // Leggi l'opzione numeri adiacenti
    const checkAdiacenti = document.getElementById("checkNumeriAdiacenti");
    if (checkAdiacenti) {
        numeriAdiacentiRichiesti = checkAdiacenti.checked;
    }

    // Raccogli premi spuntati
    const checkboxes = document.querySelectorAll(".premi-checkbox-group input[type='checkbox'][value]");
    const attivi = [];
    checkboxes.forEach(cb => {
        if (cb.checked) attivi.push(cb.value);
    });

    if (attivi.length > 0) {
        premiAttivi = attivi;
        if (indicePremioAttuale >= premiAttivi.length) {
            indicePremioAttuale = 0;
        }
    }

    aggiornaInterfacciaPremio();
    document.getElementById("modal-config").classList.remove("visibile");
}

// La lingua viene applicata solo con "Salva e Chiudi"
function selezionaLingua(lingua) {
    linguaSelezionata = lingua;
    aggiornaPulsantiLingua();
}

function aggiornaPulsantiLingua() {
    document.getElementById("btnLinguaNap").classList.toggle("attivo", linguaSelezionata === 'nap');
    document.getElementById("btnLinguaIta").classList.toggle("attivo", linguaSelezionata === 'ita');
}

// Reset Partita (mantiene le cartelle caricate, ma resetta tabellone, storico e stato dei premi)
function init() {
    if (confirm("Vuoi iniziare una nuova partita resettando il tabellone e azzerando i premi in palio?")) {
        numeriEstratti.clear();
        ultimaEstrazione = null;
        
        // Azzeriamo lo stato dei premi vinti e scartati, MA MANTENIAMO cartelleCaricate intatte!
        premiAssegnati.clear();
        cartelleScartatePerPremio.clear();

        // Riporta il contatore dei premi al primo premio disponibile (indice 0)
        // (aggiornaInterfacciaPremio ricalcola anche le vincite e spegne la lampadina)
        indicePremioAttuale = 0;
        aggiornaInterfacciaPremio();

        // Ricrea il tabellone visivo
        creaTabellone();
        
        // Pulisce lo storico
        const storico = document.getElementById("storico-numeri");
        if (storico) {
            storico.innerHTML = '<span class="storico-empty">Nessuno</span>';
        }
    }
}

// ==========================================================================
// --- CONTROLLO AUTOMATICO VINCITE (PROMEMORIA DISCRETO) ---
// ==========================================================================
// Le possibili vincite non vengono mai mostrate in grande sul tabellone:
// si accende una lampadina nella barra e il dettaglio si apre solo cliccandola.
// Così sul megaschermo non compaiono vincite non verificate
// (cartella invenduta, file JSON sbagliato, ecc.).

const sogliaPremio = { AMBO: 2, TERNO: 3, QUATERNA: 4, CINQUINA: 5, TOMBOLA: 15 };

// Cartelle che hanno raggiunto il premio in palio, in attesa di verifica
let possibiliVincite = []; // [{ premio, cartellaId, numeri }]

function caricaFilePartita(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const dati = JSON.parse(e.target.result);
            if (dati && Array.isArray(dati.cartelle)) {
                impostaCartellePartita(dati.cartelle);
                alert(`Partita caricata con successo! ${cartelleCaricate.length} cartelle in ascolto per i premi.`);
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

// Imposta le cartelle da controllare (da file JSON o direttamente dal generatore)
function impostaCartellePartita(cartelle) {
    cartelleCaricate = cartelle;
    premiAssegnati.clear();
    cartelleScartatePerPremio.clear();
    aggiornaStatoPartita();
    verificaVinciteAutomatiche();
}

// Restituisce i numeri vincenti della cartella per il premio, oppure null
function trovaNumeriVincenti(cartella, premio) {
    const target = sogliaPremio[premio];
    if (!target) return null;

    if (premio === 'TOMBOLA') {
        const indovinati = cartella.numeri.filter(n => numeriEstratti.has(n));
        return indovinati.length === 15 ? indovinati : null;
    }

    // Ambo, Terno, Quaterna, Cinquina: controllo per riga
    for (let r = 0; r < 3; r++) {
        const numeriRiga = cartella.griglia[r].filter(n => n !== null); // I 5 numeri della riga

        if (numeriAdiacentiRichiesti) {
            // Servono 'target' numeri consecutivi estratti tra quelli della riga
            for (let i = 0; i <= numeriRiga.length - target; i++) {
                const sub = numeriRiga.slice(i, i + target);
                if (sub.every(n => numeriEstratti.has(n))) return sub;
            }
        } else {
            // Verifica classica (anche non adiacenti)
            const indovinati = numeriRiga.filter(n => numeriEstratti.has(n));
            if (indovinati.length >= target) return indovinati;
        }
    }
    return null;
}

// Ricalcola le possibili vincite per il premio in palio e aggiorna la lampadina
function verificaVinciteAutomatiche() {
    possibiliVincite = [];

    if (cartelleCaricate.length > 0 && premiAttivi.length > 0) {
        const premio = premiAttivi[indicePremioAttuale];
        if (!premiAssegnati.has(premio)) {
            for (const cartella of cartelleCaricate) {
                // Salta le cartelle segnate come invendute per questo premio
                if (cartelleScartatePerPremio.has(`${cartella.id}-${premio}`)) continue;
                const numeri = trovaNumeriVincenti(cartella, premio);
                if (numeri) possibiliVincite.push({ premio, cartellaId: cartella.id, numeri });
            }
        }
    }

    aggiornaSpiaVincite();
}

function aggiornaSpiaVincite() {
    const spia = document.getElementById("spia-vincite");
    const contatore = document.getElementById("spia-contatore");
    if (!spia) return;

    const accesa = possibiliVincite.length > 0;
    // Senza cartelle caricate la lampadina non viene proprio mostrata
    spia.classList.toggle("inattiva", cartelleCaricate.length === 0);
    spia.classList.toggle("accesa", accesa);
    if (contatore) contatore.textContent = accesa ? possibiliVincite.length : "";
    spia.title = accesa
        ? `Vincite da verificare: ${possibiliVincite.length} (clicca per i dettagli)`
        : "Nessuna vincita da verificare";

    if (!accesa) {
        chiudiPannelloVincite();
    } else if (pannelloVinciteAperto()) {
        renderPannelloVincite();
    }
}

function pannelloVinciteAperto() {
    const pannello = document.getElementById("pannello-vincite");
    return !!pannello && pannello.classList.contains("visibile");
}

function togglePannelloVincite() {
    if (pannelloVinciteAperto()) {
        chiudiPannelloVincite();
        return;
    }
    if (possibiliVincite.length === 0) return;
    renderPannelloVincite();
    document.getElementById("pannello-vincite").classList.add("visibile");
}

function chiudiPannelloVincite() {
    const pannello = document.getElementById("pannello-vincite");
    if (pannello) pannello.classList.remove("visibile");
}

function renderPannelloVincite() {
    const titolo = document.getElementById("pannello-vincite-titolo");
    const lista = document.getElementById("pannello-vincite-lista");
    if (!titolo || !lista) return;

    titolo.textContent = possibiliVincite.length > 0
        ? `${possibiliVincite[0].premio}: da verificare`
        : "";

    lista.innerHTML = possibiliVincite.map(v => `
        <div class="vincita-riga">
            <div class="vincita-info">
                <span class="vincita-cartella">Cartella N. ${v.cartellaId}</span>
                <span class="vincita-numeri">${v.numeri.join(', ')}</span>
            </div>
            <div class="vincita-azioni">
                <button type="button" class="btn-vincita-ok" onclick="confermaVincita(${v.cartellaId})" title="Conferma la vincita e passa al premio successivo">Conferma</button>
                <button type="button" class="btn-vincita-no" onclick="scartaCartellaInvenduta(${v.cartellaId})" title="Cartella non venduta: ignorala per questo premio">Invenduta</button>
            </div>
        </div>
    `).join('');
}

function confermaVincita(cartellaId) {
    const vincita = possibiliVincite.find(v => v.cartellaId === cartellaId);
    if (!vincita) return;
    premiAssegnati.add(vincita.premio);
    chiudiPannelloVincite();
    avanzaPremio(); // Passa al premio successivo e ricalcola le vincite
}

function scartaCartellaInvenduta(cartellaId) {
    const vincita = possibiliVincite.find(v => v.cartellaId === cartellaId);
    if (!vincita) return;
    // La cartella non verrà più segnalata per questo premio
    cartelleScartatePerPremio.add(`${cartellaId}-${vincita.premio}`);
    verificaVinciteAutomatiche();
}

// Chiude il pannello vincite cliccando fuori
document.addEventListener("click", (e) => {
    if (!pannelloVinciteAperto()) return;
    const wrapper = document.querySelector(".spia-wrapper");
    if (wrapper && !wrapper.contains(e.target)) chiudiPannelloVincite();
});
