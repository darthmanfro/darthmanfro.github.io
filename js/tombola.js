// --- STATO DEL GIOCO ---
const numeriEstratti = new Set(); // Set attivo per tracciare i numeri usciti
let numeriDaEstrarre = [];
const premi = ['AMBO', 'TERNO', 'QUATERNA', 'CINQUINA', 'TOMBOLA'];
// LISTA MASTER DEI PREMI
const PREMI_DEFAULT = ['AMBO', 'TERNO', 'QUATERNA', 'CINQUINA', 'TOMBOLA'];
let premiAttivi = ['AMBO', 'TERNO', 'QUATERNA', 'CINQUINA', 'TOMBOLA'];
let indicePremioAttuale = 0;
let linguaSmorfia = 'nap';
// --- DIZIONARI SMORFIA ---
const smorfiaNapoletana = [
  '', "L'Italia", "A' piccerella", "A' gatta", "O' maiale", "A' mano",
  "O' fatto", "A' vaso 'e terracotta", "A' Madonna", "E' figliuole", "E' fasule",
  "E' sorce", "E meze susdate", "Sant'Antuono", "O' 'mbriaco", "O' guaglione",
  "O' culo", "A' sfortuna", "O' sangue", "A' risata", "A' festa",
  "A' femmena o' balcone", "O' pazzo", "O' pazzariello", "A' guardia", "O' Natale",
  'Nanninella', "O' canterino", "E' 'mbrelle", "O' pate d' 'e criature", "O' tenente",
  "O' padrone 'e casa", "O' capitone", "E' anni 'e Cristo", "A' capa", "O' uccello",
  "A' castagnella", "O' monaco", "E' mazzate", "A' fune 'ncopp' o' cielo", "O' noia",
  "O' cortello", "O' cafè", "A' bella femmena", "E' carcere", "O' vino buono",
  "E' denare", "O' morto", "O' morto che parla", 'O meza notte', "O' pane",
  "O' giardino", "A' mamma", "O' vecchio", "O' cappello", "A' musica",
  "A' caduta", "O' scartellato", "O' siaggedda", "E' peli", "O' lamento",
  "O' cacciatore", "O' morto ammazzato", "A' sposa", "A' pioggia", "O' pianto",
  "E' doje zitelle", "O' seppellitore", "A' zuppa cotta", "Sott'e 'ncoppa", "O' palazzo",
  "L'ommo 'e mmerda", "A' meraviglia", "O' spitale", "A' Mamma Maria", "O' Festino",
  'A meza fontana', "E' gamme d' 'e ffemmene", "A' bella figliola", "O' ladro", "A' bocca",
  "E' fiori", "A' tavola 'mbandita", "O' maletiempo", "A' chiesa", "E' anime d' o' Purgatorio",
  "A' puteca", "E' pidocchie", "E' caciocavalle", "A' vecchia", "A' paura"
];

const smorfiaItaliana = [
  '', "L'Italia", 'La bambina', 'La gatta', 'Il maiale', 'La mano',
  'Il fatto', 'Il vaso di terracotta', 'La Madonna', 'I figli', 'I fagioli',
  'I topi', 'I soldati', "Sant'Antonio", "L'ubriaco", 'Il ragazzo',
  'Il culo', 'La sfortuna', 'Il sangue', 'La risata', 'La festa',
  'La donna al balcone', 'Il pazzo', 'Il banditore', 'La guardia', 'Natale',
  'Anna', 'Il cantante', 'Gli ombrelli (i becchini)', 'Il fallo (il padre dei bambini)', 'Il tenente',
  'Il padrone di casa', 'Il capitone', 'Gli anni di Cristo', 'La testa', "L'uccello",
  'La nacchera', 'Il monaco', 'Le bastonate', 'La corda in cielo', 'La noia',
  'Il coltello', 'Il caffè', 'La bella donna', 'La prigione', 'Il vino buono',
  'I soldi', 'Il morto', 'Il morto che parla', 'Il carnevale', 'Il pane',
  'Il giardino', 'La mamma', 'Il vecchio', 'Il cappello', 'La musica',
  'La caduta', 'Il gobbo', 'La sedia', 'I peli', 'Il lamento',
  'Il cacciatore', 'Il morto ammazzato', 'La sposa', 'La pioggia', 'Il pianto',
  'Le due zitelle', 'Il becchino', 'La zuppa cotta', 'Sottosopra', 'Il palazzo',
  "L'uomo di merda", 'La meraviglia', "L'ospedale", 'Mamma Maria', 'La festa',
  'La mezza fontana', 'Le gambe delle donne', 'La bella ragazza', 'Il ladro', 'La bocca',
  'I fiori', 'La tavola imbandita', 'Il brutto tempo', 'La chiesa', 'Le anime del Purgatorio',
  'La bottega', 'I pidocchi', 'I caciocavalli', 'La vecchia', 'La paura'
];

// --- FUNZIONE DI ALTO LIVELLO (ORCHESTRATORE) ---
function estraiNumero () {
  if (numeriDaEstrarre.length === 0) {
    gestisciFineGioco();
    return;
  }

  const numero = pescaProssimoNumero();
  registraEstrazione(numero);

  segnaNumero(numero);
  aggiornaStoricoUI();
}

// --- FUNZIONALITÀ SPECIALIZZATE ---

// 1. Logica pura di estrazione
function pescaProssimoNumero () {
  return numeriDaEstrarre.shift();
}

// 2. Aggiornamento dello stato dati
function registraEstrazione (numero) {
  numeriEstratti.add(numero);
  storicoEstratti.push(numero);
}

// 3. Gestione fine partita
function gestisciFineGioco () {
  alert('Tutti i 90 numeri sono stati estratti!');
  const btnEstrai = document.getElementById('btnEstrai');
  if (btnEstrai) btnEstrai.disabled = true;
}

// 4. Inizializzazione / Reset dello stato
function init () {
  numeriEstratti.clear();
  storicoEstratti = [];

  impostaPremio(0); // Ripristina ad "Ambo" ad ogni nuova partita
  inizializzaArrayDaEstrarre();
  rigeneraTabelloneDOM();
  aggiornaStoricoUI();

  const btnEstrai = document.getElementById('btnEstrai');
  if (btnEstrai) btnEstrai.disabled = false;

// Legge quali premi sono attualmente spuntati nelle checkbox della modale
  leggiPremiSelezionati();

  // Riparte dal PRIMO premio abilitato nella lista corrente
  indicePremioAttuale = 0;
  aggiornaGraficaPremio();
}

// FUNZIONE DI SUPPORTO PER LEGGERE LE CHECKBOX
function leggiPremiSelezionati() {
  const checkboxes = document.querySelectorAll('.premi-checkbox-group input[type="checkbox"]');

  if (checkboxes.length > 0) {
    const selezionati = Array.from(checkboxes)
        .filter(cb => cb.checked)
        .map(cb => cb.value);

    // Se c'è almeno un premio selezionato, aggiorna la lista attiva
    if (selezionati.length > 0) {
      premiAttivi = selezionati;
    }
  }
}

// SALVATAGGIO CONFIGURAZIONE
function salvaChiudiConfig() {
  const checkboxes = document.querySelectorAll('.premi-checkbox-group input[type="checkbox"]');
  const selezionati = Array.from(checkboxes)
      .filter(cb => cb.checked)
      .map(cb => cb.value);

  if (selezionati.length === 0) {
    alert('Seleziona almeno un premio!');
    return;
  }

  premiAttivi = selezionati;

  // Se il premio in corso non è più tra quelli abilitati, riparti dal primo
  if (indicePremioAttuale >= premiAttivi.length) {
    indicePremioAttuale = 0;
  }

  aggiornaGraficaPremio();

  // Chiudi Modale
  document.getElementById('modal-config').classList.remove('visibile');
}

// AGGIORNAMENTO BADGE GRAFICO
function aggiornaGraficaPremio() {
  const badge = document.getElementById('premio-attuale');
  if (badge && premiAttivi.length > 0) {
    badge.textContent = premiAttivi[indicePremioAttuale];
  }
}

function inizializzaArrayDaEstrarre () {
  numeriDaEstrarre = Array.from({ length: 90 }, (_, i) => i + 1);

  // Algoritmo Fisher-Yates
  for (let i = numeriDaEstrarre.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [numeriDaEstrarre[i], numeriDaEstrarre[j]] = [numeriDaEstrarre[j], numeriDaEstrarre[i]];
  }
}

// 5. Rendering del Tabellone
function rigeneraTabelloneDOM () {
  const griglia = document.getElementById('griglia');
  if (!griglia) return;

  griglia.innerHTML = '';
  for (let i = 1; i <= 90; i++) {
    const casella = document.createElement('div');
    casella.classList.add('casella');
    casella.id = 'casella-' + i;
    casella.textContent = i;
    griglia.appendChild(casella);
  }
}

// 6. Animazione e overlay numero estratto
function segnaNumero (numero) {
  const casella = document.getElementById('casella-' + numero);
  const griglia = document.getElementById('griglia');
  const overlay = document.getElementById('overlay-numero');

  if (!casella || !overlay || !griglia) return;

  const dizionario = linguaSmorfia === 'nap' ? smorfiaNapoletana : smorfiaItaliana;
  const testoSmorfia = dizionario[numero] || '';

  overlay.innerHTML = `
    <span class="numero-gigante">${numero}</span>
    <span class="testo-smorfia">${testoSmorfia}</span>
  `;

  casella.classList.add('estratto');
  griglia.classList.add('fade-out');
  overlay.classList.add('visibile');

  setTimeout(() => {
    overlay.classList.remove('visibile');
    griglia.classList.remove('fade-out');
  }, 1500);
}

// 7. Rendering dello storico
function aggiornaStoricoUI () {
  const container = document.getElementById('storico-numeri');
  if (!container) return;

  if (storicoEstratti.length === 0) {
    container.innerHTML = '<span class="storico-empty">Nessun numero estratto</span>';
    return;
  }

  const ultimiCinque = storicoEstratti.slice(-5).reverse();

  container.innerHTML = ultimiCinque.map((num, idx) => {
    const classeUltimo = idx === 0 ? 'badge-numero ultimo' : 'badge-numero';
    return `<div class="${classeUltimo}">${num}</div>`;
  }).join('');
}

// AVANZAMENTO DINAMICO PREMIO (cicla tra i soli premi spuntati)
function avanzaPremio() {
  if (premiAttivi.length === 0) return;
  indicePremioAttuale = (indicePremioAttuale + 1) % premiAttivi.length;
  aggiornaGraficaPremio();
}

// Imposta manualmente un premio specifico (o per reset)
function impostaPremio (indice) {
  indicePremioAttuale = indice;
  aggiornaPremioUI();
}

// Aggiorna la vista nel DOM
function aggiornaPremioUI () {
  const elPremio = document.getElementById('premio-attuale');
  if (elPremio) {
    elPremio.textContent = premi[indicePremioAttuale];
  }
}


// APERTURA / CHIUSURA CONFIGURAZIONE
function apriConfig() {
  document.getElementById('modal-config').classList.add('visibile');
}

// SELEZIONE LINGUA DALLA MODALE
function selezionaLingua(lingua) {
  linguaSmorfia = lingua;

  const btnNap = document.getElementById('btnLinguaNap');
  const btnIta = document.getElementById('btnLinguaIta');

  if (lingua === 'nap') {
    btnNap.classList.add('attivo');
    btnIta.classList.remove('attivo');
  } else {
    btnIta.classList.add('attivo');
    btnNap.classList.remove('attivo');
  }
}


// Avvio automatico al caricamento
init();