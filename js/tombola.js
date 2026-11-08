// --- STATO DEL GIOCO ---
let numeriEstratti = new Set();
let ultimaEstrazione = null;
let linguaCorrente = 'nap'; // 'nap' o 'ita'

// Premi in palio ordinati
const listaPremi = ['AMBO', 'TERNO', 'QUATERNA', 'CINQUINA', 'TOMBOLA'];
let premiAttivi = ['AMBO', 'TERNO', 'QUATERNA', 'CINQUINA', 'TOMBOLA'];
let indicePremioAttuale = 0;

// --- STATO PARTITA CARICATA E CONTROLLO VINCITE ---
let cartelleCaricate = [];
let premiAssegnati = new Set(); // Traccia i premi già assegnati (es. 'AMBO')
let vincitaCorrenteInAttesa = null; // Memorizza la vincita in attesa di conferma/scarto
let cartelleScartatePerPremio = new Set(); // Gestisce le cartelle marcate come invendute per un determinato premio

// Dizionario Smorfia Napoletana e Italiana
const smorfia = {
    1: { nap: "L'Italia", ita: "L'Italia" },
    2: { nap: "La picciridda", ita: "La bambina" },
    3: { nap: "A gatta", ita: "Il gatto" },
    4: { nap: "U puorco", ita: "Il maiale" },
    5: { nap: "A mano", ita: "La mano" },
    6: { nap: "Quaglia quaglia", ita: "Quella che guarda" },
    7: { nap: "A scartellata", ita: "Il vaso di coccio" },
    8: { nap: "A maronna", ita: "La Madonna" },
    9: { nap: "A figghia", ita: "La figlia" },
    10: { nap: "I fasuli", ita: "I fagioli" },
    11: { nap: "E surice", ita: "I topi" },
    12: { nap: "E surdate", ita: "I soldati" },
    13: { nap: "Sant'アントニオ", ita: "Sant'Antonio" },
    14: { nap: "U casatiello", ita: "Il cappotto" },
    15: { nap: "U guaglione", ita: "Il ragazzo" },
    16: { nap: "O culo", ita: "Il culo" },
    17: { nap: "A disgrazia", ita: "La disgrazia" },
    18: { nap: "A sangunosa", ita: "Il sangue" },
    19: { nap: "A risata", ita: "La risata" },
    20: { nap: "A festa", ita: "La festa" },
    21: { nap: "A femmena annura", ita: "La donna nuda" },
    22: { nap: "O pazzo", ita: "Il pazzo" },
    23: { nap: "O scemo", ita: "Lo scemo" },
    24: { nap: "E guardie", ita: "Le guardie" },
    25: { nap: "Natale", ita: "Natale" },
    26: { nap: "Nanninella", ita: "La piccola Anna" },
    27: { nap: "U cantero", ita: "Il vaso da notte" },
    28: { nap: "E zzite", ita: "Le zitelle" },
    29: { nap: "O padre d''e criature", ita: "Il padre dei bambini" },
    30: { nap: "E palle d''o furtunato", ita: "Le palle del fortunato" },
    31: { nap: "O padrone 'e casa", ita: "Il padrone di casa" },
    32: { nap: "O capitone", ita: "Il capitone" },
    33: { nap: "A ancona", ita: "Gli anni di Cristo" },
    34: { nap: "A capa", ita: "La testa" },
    35: { nap: "L'aucielluzzo", ita: "L'uccellino" },
    36: { nap: "E castagnelle", ita: "Le nacchere" },
    37: { nap: "O monaco", ita: "Il monaco" },
    38: { nap: "E mazzate", ita: "Le botte" },
    39: { nap: "A funa", ita: "La fune" },
    40: { nap: "A patana", ita: "La patata" },
    41: { nap: "O curtiello", ita: "Il coltello" },
    42: { nap: "O caffe", ita: "Il caffè" },
    43: { nap: "A femmena seduta", ita: "La donna al balcone" },
    44: { nap: "A carcere", ita: "Il carcere" },
    45: { nap: "O vino", ita: "Il vino" },
    46: { nap: "E denare", ita: "I soldi" },
    47: { nap: "O muorto", ita: "Il morto" },
    48: { nap: "O muorto che parla", ita: "Il morto che parla" },
    49: { nap: "A carne", ita: "La carne" },
    50: { nap: "O panaro", ita: "Il paniere" },
    51: { nap: "O ciardino", ita: "Il giardino" },
    52: { nap: "A mamma", ita: "La mamma" },
    53: { nap: "O viecchio", ita: "Il vecchio" },
    54: { nap: "O compare", ita: "Il compare" },
    55: { nap: "A museca", ita: "La musica" },
    56: { nap: "A caruta", ita: "La caduta" },
    57: { nap: "O scartellato", ita: "Il gobbo" },
    58: { nap: "O paccotto", ita: "Il pacco" },
    59: { nap: "E pile", ita: "I peli" },
    60: { nap: "Se lamenta", ita: "Il lamento" },
    61: { nap: "O cacciatore", ita: "Il cacciatore" },
    62: { nap: "O muorto acciso", ita: "Il morto ammazzato" },
    63: { nap: "A sposa", ita: "La sposa" },
    64: { nap: "A sciameria", ita: "La caciara" },
    65: { nap: "O chianto", ita: "Il pianto" },
    66: { nap: "A roja", ita: "Le zite" },
    67: { nap: "O totano", ita: "Il totano" },
    68: { nap: "A cotognata", ita: "La minestra cotta" },
    69: { nap: "Sotto e ncoppa", ita: "Sottosopra" },
    70: { nap: "O palazzo", ita: "Il palazzo" },
    71: { nap: "L'omm' e merda", ita: "L'uomo di merda" },
    72: { nap: "A meraviglia", ita: "Lo stupore" },
    73: { nap: "L'ospedale", ita: "L'ospedale" },
    74: { nap: "O schiaffo", ita: "Lo schiaffo" },
    75: { nap: "Pulecenella", ita: "Pulcinella" },
    76: { nap: "A funtana", ita: "La fontana" },
    77: { nap: "E diavule", ita: "I diavoli" },
    78: { nap: "A bella figghiuola", ita: "La bella ragazza" },
    79: { nap: "O mariuolo", ita: "Il ladro" },
    80: { nap: "A vocca", ita: "La bocca" },
    81: { nap: "I sciure", ita: "I fiori" },
    82: { nap: "A tavula 'e Cristo", ita: "La tavola imbandita" },
    83: { nap: "O malato", ita: "Il malato" },
    84: { nap: "A chiesa", ita: "La chiesa" },
    85: { nap: "L'anima d''o priatorio", ita: "Le anime del purgatorio" },
    86: { nap: "A puteca", ita: "Il negozio" },
    87: { nap: "I perucchie", ita: "I pidocchi" },
    88: { nap: "E case cavate", ita: "I cimiteri" },
    89: { nap: "A vecchia", ita: "La vecchia" },
    90: { nap: "A paura", ita: "La paura" }
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
}

// --- CONFIGURAZIONE PARTITA E MODALI ---
function apriConfig() {
    document.getElementById("modal-config").classList.add("visibile");
}

function salvaChiudiConfig() {
    // Raccogli premi spuntati
    const checkboxes = document.querySelectorAll(".premi-checkbox-group input[type='checkbox']");
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

function selezionaLingua(lingua) {
    linguaCorrente = lingua;
    document.getElementById("btnLinguaNap").classList.toggle("attivo", lingua === 'nap');
    document.getElementById("btnLinguaIta").classList.toggle("attivo", lingua === 'ita');
}

// Reset Partita (mantiene le cartelle caricate, ma resetta tabellone, storico e stato dei premi)
function init() {
    if (confirm("Vuoi iniziare una nuova partita resettando il tabellone e azzerando i premi in palio?")) {
        numeriEstratti.clear();
        ultimaEstrazione = null;
        
        // Azzeriamo lo stato dei premi vinti e scartati, MA MANTENIAMO cartelleCaricate intatte!
        premiAssegnati.clear();
        cartelleScartatePerPremio.clear();
        vincitaCorrenteInAttesa = null;
        chiudiBannerVincita();

        // Riporta il contatore dei premi al primo premio disponibile (indice 0)
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
// --- SISTEMA DI CONTROLLO AUTOMATICO VINCITE & CARTELLE INVENDUTE ---
// ==========================================================================

function caricaFilePartita(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const dati = JSON.parse(e.target.result);
            if (dati && Array.isArray(dati.cartelle)) {
                cartelleCaricate = dati.cartelle;
                premiAssegnati.clear();
                cartelleScartatePerPremio.clear();
                vincitaCorrenteInAttesa = null;
                chiudiBannerVincita();
                alert(`Partita caricata con successo! ${cartelleCaricate.length} cartelle in ascolto per i premi.`);
            } else {
                alert('File JSON non valido per la Tombola.');
            }
        } catch (err) {
            alert('Errore nella lettura del file JSON.');
        }
    };
    reader.readAsText(file);
}

function verificaVinciteAutomatiche() {
    // Se non ci sono cartelle caricate o c'è già una vincita in attesa di scelta, non procedere
    if (cartelleCaricate.length === 0 || vincitaCorrenteInAttesa !== null) return;

    if (premiAttivi.length === 0) return;
    const premioAttuale = premiAttivi[indicePremioAttuale];

    // Se il premio corrente è già stato assegnato, non fare nulla
    if (premiAssegnati.has(premioAttuale)) return;

    const sogliaPremio = {
        'AMBO': 2,
        'TERNO': 3,
        'QUATERNA': 4,
        'CINQUINA': 5,
        'TOMBOLA': 15
    };

    const target = sogliaPremio[premioAttuale];
    if (!target) return;

    let cartellaTrovata = null;

    for (const cartella of cartelleCaricate) {
        const chiaveScarto = `${cartella.id}-${premioAttuale}`;
        // Se questa cartella era stata scartata come "invenduta" per questo premio, salta
        if (cartelleScartatePerPremio.has(chiaveScarto)) continue;

        let haVinto = false;

        if (premioAttuale === 'TOMBOLA') {
            const indovinati = cartella.numeri.filter(n => numeriEstratti.has(n)).length;
            if (indovinati === 15) haVinto = true;
        } else {
            for (let r = 0; r < 3; r++) {
                const numeriRiga = cartella.griglia[r].filter(n => n !== null);
                const indovinati = numeriRiga.filter(n => numeriEstratti.has(n)).length;
                if (indovinati >= target) {
                    haVinto = true;
                    break;
                }
            }
        }

        if (haVinto) {
            cartellaTrovata = cartella.id;
            break;
        }
    }

    if (cartellaTrovata !== null) {
        vincitaCorrenteInAttesa = {
            premio: premioAttuale,
            cartellaId: cartellaTrovata
        };
        mostraNotificaVincita(premioAttuale, cartellaTrovata);
    }
}

function mostraNotificaVincita(premio, cartellaId) {
    const banner = document.getElementById("banner-vincita");
    const testo = document.getElementById("testo-vincita");
    if (!banner || !testo) return;

    testo.textContent = `🎉 ${premio}! Raggiunto dalla Cartella N. ${cartellaId}`;
    banner.classList.add("visibile");
}

function confermaVincita() {
    if (vincitaCorrenteInAttesa) {
        premiAssegnati.add(vincitaCorrenteInAttesa.premio);
        vincitaCorrenteInAttesa = null;
        chiudiBannerVincita();
        avanzaPremio(); // Passa al premio successivo previsto
    }
}

function scartaCartellaInvenduta() {
    if (vincitaCorrenteInAttesa) {
        // Segna questa cartella come invenduta per il premio corrente così non viene più segnalata
        const chiaveScarto = `${vincitaCorrenteInAttesa.cartellaId}-${vincitaCorrenteInAttesa.premio}`;
        cartelleScartatePerPremio.add(chiaveScarto);

        vincitaCorrenteInAttesa = null;
        chiudiBannerVincita();

        // Controlla subito se ci sono altre cartelle valide che hanno fatto lo stesso premio
        verificaVinciteAutomatiche();
    }
}

function chiudiBannerVincita() {
    const banner = document.getElementById("banner-vincita");
    if (banner) banner.classList.remove("visibile");
}