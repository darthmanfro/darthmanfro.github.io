// ==========================================================================
// MOTORE DELLE PROBABILITÀ
// Calcolo esatto (niente simulazioni casuali) di un turno di corpo a corpo
// o di un tiro tra un modello che attacca e un bersaglio, con le tabelle di
// dati/regole.json e i flag di dati/equipaggiamento.json.
//
// Un "modello" per il motore è:
//   { nome, profilo: { AC, AB, F, R, Fe, A, ... }, equip: [id, ...],
//     animale: true|false, modTS: penalità extra al tiro salvezza }
// Il pugnale gratuito è sottinteso (tranne per gli animali, che combattono
// con armi naturali).
//
// Sequenza in corpo a corpo: per colpire (AC contro AC) → parata → per
// ferire (F contro R; un 6 è un critico, uno per modello) → tiro salvezza
// dell'armatura → ferite gravi quando finiscono le Ferite (si tira per ogni
// ferita in più e vale il risultato peggiore).
// Esiti: 0 nessuno, 1 a terra, 2 stordito, 3 fuori combattimento.
// Non calcolati: incantesimi, abilità, regole speciali non elencate nei
// flag, colpi automatici contro modelli già a terra o storditi.
// ==========================================================================

const ESITO_NESSUNO = 0, ESITO_A_TERRA = 1, ESITO_STORDITO = 2, ESITO_FUORI = 3;

// Pugnale gratuito e armi naturali (animali), che non sono nel file JSON
const PUGNALE_GRATUITO_ID = 'pugnale';
const ARMI_NATURALI = { id: 'naturali', nome: 'Armi naturali', tipo: 'corpo' };

let regoleMotore = null;   // dati/regole.json
let equipMotore = {};      // oggetti per id

function impostaDatiMotore(regole, equipPerId) {
    regoleMotore = regole;
    equipMotore = equipPerId;
}

const limita = (v, min, max) => Math.max(min, Math.min(max, v));

// --------------------------------------------------------------------------
// Tabelle
// --------------------------------------------------------------------------

function serveColpireCC(acAttacco, acBersaglio) {
    return regoleMotore.colpireCorpoACorpo.tabella[limita(acAttacco, 1, 10) - 1][limita(acBersaglio, 1, 10) - 1];
}

// Risultato minimo per ferire, null se impossibile
function serveFerire(forza, resistenza) {
    return regoleMotore.ferire.tabella[limita(forza, 1, 10) - 1][limita(resistenza, 1, 10) - 1];
}

function modificatoreTS(forza) {
    return regoleMotore.modificatoreTSPerForza[String(limita(forza, 1, 10))] || 0;
}

// Probabilità di riuscire un tiro di D6 con risultato minimo "serve"
// (1 fallisce sempre; oltre il 6 serve un 6 e poi 4+, 5+, 6)
function probD6(serve) {
    if (serve === null || serve === undefined) return 0;
    if (serve <= 2) return 5 / 6;
    if (serve <= 6) return (7 - serve) / 6;
    if (serve <= 9) return (1 / 6) * ((7 - (serve - 3)) / 6);
    return 0;
}

// --------------------------------------------------------------------------
// Configurazioni di combattimento
// --------------------------------------------------------------------------

function oggettiDi(modello) {
    return modello.equip.map(id => equipMotore[id]).filter(Boolean);
}

// Tutti i modi in cui il modello può combattere in corpo a corpo con ciò che ha:
// [{ armi: [arma di ogni attacco], descrizione, scudo, parata (0/1/2 = con ripetizione) }]
function configurazioniCC(modello) {
    const A = modello.profilo.A;
    if (modello.animale) {
        return [{ armi: Array(A).fill(ARMI_NATURALI), descrizione: 'Armi naturali', scudo: false, parata: 0 }];
    }
    const oggetti = oggettiDi(modello);
    const corpo = oggetti.filter(o => o.tipo === 'corpo');
    const scudo = oggetti.find(o => o.tipo === 'scudo' && o.bonusTS);
    const brocchiere = oggetti.find(o => o.tipo === 'scudo' && o.parata);
    const unaMano = [...corpo.filter(o => !o.dueMani && !o.coppia), equipMotore[PUGNALE_GRATUITO_ID]];
    const configurazioni = [];
    const aggiungi = (armi, descrizione, conScudo, conBrocchiere) => {
        const parataArmi = armi.some(a => a.parata);
        const parata = conBrocchiere && parataArmi ? 2 : (conBrocchiere || parataArmi ? 1 : 0);
        configurazioni.push({ armi, descrizione, scudo: !!conScudo, parata });
    };
    corpo.filter(o => o.dueMani).forEach(o => aggiungi(Array(A).fill(o), o.nome, false, false));
    corpo.filter(o => o.coppia).forEach(o => aggiungi(Array(A + 1).fill(o), o.nome + ' (coppia)', false, false));
    unaMano.forEach((principale, i) => {
        // Un'arma sola, con scudo e/o brocchiere nell'altra mano
        const mano = [scudo && 'scudo', brocchiere && 'brocchiere'].filter(Boolean);
        const testo = principale.nome + (mano.length ? ' + ' + mano.join(' e ') : '');
        aggiungi(Array(A).fill(principale), testo, scudo, brocchiere);
        // Due armi a una mano: +1 attacco con la seconda
        if (principale.conScudoOSola) return;
        unaMano.forEach((seconda, j) => {
            if (i === j || seconda.conScudoOSola) return;
            // Con un solo attacco l'ordine delle due armi non conta
            if (A === 1 && j < i && !unaMano[j].conScudoOSola) return;
            aggiungi([...Array(A).fill(principale), seconda], principale.nome + ' + ' + seconda.nome.toLowerCase(), false, false);
        });
    });
    return configurazioni;
}

// Difesa del modello: tiro salvezza base (7 = nessuno), elmo, parata
function difesa(modello, configurazione, inCorpoACorpo) {
    const oggetti = oggettiDi(modello);
    const armatura = oggetti.find(o => o.tipo === 'armatura');
    const scudo = oggetti.find(o => o.tipo === 'scudo' && o.bonusTS);
    let ts = armatura ? armatura.ts : 7;
    const usaScudo = inCorpoACorpo ? configurazione && configurazione.scudo : !!scudo;
    if (usaScudo && scudo) ts -= scudo.bonusTS;
    return {
        ts,
        elmo: oggetti.some(o => o.tipo === 'elmo'),
        parata: inCorpoACorpo && configurazione ? configurazione.parata : 0
    };
}

// --------------------------------------------------------------------------
// Un colpo andato a segno: ferire, critico, tiro salvezza
// --------------------------------------------------------------------------

// Forza di un attacco con quell'arma
function forzaArma(profilo, arma, primoTurno) {
    if (arma.forzaFissa !== undefined) return arma.forzaFissa;
    let forza = profilo.F;
    if (arma.forzaBonus && (!arma.pesante || primoTurno)) forza += arma.forzaBonus;
    return limita(forza, 1, 10);
}

// Dati di un colpo: risultati minimi per ferire e per salvarsi, modificatore alle ferite gravi
function parametriColpo(attaccante, arma, bersaglio, difesaBersaglio, primoTurno) {
    const forza = forzaArma(attaccante.profilo, arma, primoTurno);
    let serveF = arma.ferisceSempre || serveFerire(forza, bersaglio.profilo.R);
    if (serveF && arma.bonusFerire) serveF = Math.max(2, serveF - arma.bonusFerire);
    let serveTS = difesaBersaglio.ts - (arma.pugnale ? 1 : 0);
    serveTS += modificatoreTS(forza) + (arma.modTS || 0) + (attaccante.modTS || 0);
    const pSalvo = serveTS <= 6 ? (7 - Math.max(2, serveTS)) / 6 : 0;
    return { forza, serveFerire: serveF, serveTS: serveTS <= 6 ? Math.max(2, serveTS) : null, pSalvo, concussione: !!arma.concussione };
}

// Esiti di un colpo a segno: [{ p, ferite, bonusFG, critico }]
// critico = true se il colpo usa il critico (anche se poi salvato)
function esitiColpo(par, criticoDisponibile) {
    const esiti = [];
    if (!par.serveFerire) return [{ p: 1, ferite: 0, bonusFG: 0, critico: false }];
    const pSei = 1 / 6;
    const pNormale = par.serveFerire <= 5 ? (6 - Math.max(2, par.serveFerire)) / 6 : 0;
    // Ferita normale (risultati da serveFerire a 5)
    esiti.push({ p: pNormale * (1 - par.pSalvo), ferite: 1, bonusFG: 0, critico: false });
    if (criticoDisponibile) {
        for (const c of regoleMotore.critici.risultati) {
            const pc = pSei * (c.a - c.da + 1) / 6;
            if (c.ignoraArmatura) {
                esiti.push({ p: pc, ferite: c.ferite, bonusFG: c.bonusFeriteGravi, critico: true });
            } else {
                esiti.push({ p: pc * (1 - par.pSalvo), ferite: c.ferite, bonusFG: c.bonusFeriteGravi, critico: true });
                esiti.push({ p: pc * par.pSalvo, ferite: 0, bonusFG: 0, critico: true });
            }
        }
    } else {
        esiti.push({ p: pSei * (1 - par.pSalvo), ferite: 1, bonusFG: 0, critico: false });
    }
    const pNiente = 1 - esiti.reduce((s, e) => s + e.p, 0);
    esiti.push({ p: pNiente, ferite: 0, bonusFG: 0, critico: false });
    return esiti.filter(e => e.p > 1e-12);
}

// Distribuzione di un tiro sulle ferite gravi: [p a terra, p stordito, p fuori]
function tiroFeriteGravi(bonus, concussione, elmo) {
    const p = [0, 0, 0, 0];
    for (let d = 1; d <= 6; d++) {
        const v = d + bonus;
        let esito = v >= 5 ? ESITO_FUORI : (v >= 3 || (concussione && v >= 2) ? ESITO_STORDITO : ESITO_A_TERRA);
        if (esito === ESITO_STORDITO && elmo) {
            p[ESITO_A_TERRA] += 1 / 12;   // elmo: 4+ e lo stordito diventa a terra
            p[ESITO_STORDITO] += 1 / 12;
            continue;
        }
        p[esito] += 1 / 6;
    }
    return p;
}

// --------------------------------------------------------------------------
// Sequenza di colpi (programmazione dinamica sugli stati del bersaglio)
// --------------------------------------------------------------------------

// colpi: [{ peso: probabilità (o peso) che il colpo vada a segno, par }]
// Restituisce la distribuzione degli esiti e le ferite attese.
function sequenzaColpi(colpi, feriteBersaglio, elmo) {
    // Stato: feriteRimaste|criticoUsato|esito|feriteInflitte → probabilità
    let stati = new Map([[`${feriteBersaglio}|0|0|0`, 1]]);
    const somma = (mappa, chiave, p) => mappa.set(chiave, (mappa.get(chiave) || 0) + p);
    for (const colpo of colpi) {
        const nuovi = new Map();
        for (const [chiave, p] of stati) {
            const [rimaste, critico, esito, inflitte] = chiave.split('|').map(Number);
            if (colpo.peso < 1) somma(nuovi, chiave, p * (1 - colpo.peso));
            if (colpo.peso <= 0) continue;
            for (const e of esitiColpo(colpo.par, !critico)) {
                const pe = p * colpo.peso * e.p;
                const nuovoCritico = critico || (e.critico ? 1 : 0);
                if (e.ferite === 0) {
                    somma(nuovi, `${rimaste}|${nuovoCritico}|${esito}|${inflitte}`, pe);
                    continue;
                }
                const dopo = Math.max(0, rimaste - e.ferite);
                const tiri = rimaste === 0 ? e.ferite : (e.ferite >= rimaste ? e.ferite - rimaste + 1 : 0);
                const totInflitte = Math.min(inflitte + e.ferite, 20);
                if (tiri === 0) {
                    somma(nuovi, `${dopo}|${nuovoCritico}|${esito}|${totInflitte}`, pe);
                    continue;
                }
                // Peggiore tra "tiri" tiri sulle ferite gravi e l'esito già subito
                const uno = tiroFeriteGravi(e.bonusFG, colpo.par.concussione, elmo);
                const cumulata = [];
                let acc = 0;
                for (let x = 0; x <= ESITO_FUORI; x++) { acc += uno[x]; cumulata[x] = Math.pow(acc, tiri); }
                for (let x = ESITO_A_TERRA; x <= ESITO_FUORI; x++) {
                    const px = cumulata[x] - (x > 0 ? cumulata[x - 1] : 0);
                    if (px <= 0) continue;
                    somma(nuovi, `${dopo}|${nuovoCritico}|${Math.max(esito, x)}|${totInflitte}`, pe * px);
                }
            }
        }
        stati = nuovi;
    }
    const esiti = [0, 0, 0, 0];
    let feriteAttese = 0;
    for (const [chiave, p] of stati) {
        const [, , esito, inflitte] = chiave.split('|').map(Number);
        esiti[esito] += p;
        feriteAttese += p * inflitte;
    }
    return { esiti, feriteAttese };
}

// Somma pesata di due risultati di sequenzaColpi
function accumula(totale, parziale, peso) {
    for (let x = 0; x < 4; x++) totale.esiti[x] += parziale.esiti[x] * peso;
    totale.feriteAttese += parziale.feriteAttese * peso;
}

// --------------------------------------------------------------------------
// Un turno di corpo a corpo
// --------------------------------------------------------------------------

// Risultato: { dadi, serveColpire, pColpo, colpiAttesi, feriteAttese, esiti[4], pFuori, colpi: [par] }
function turnoCorpoACorpo(attaccante, confA, bersaglio, confB, primoTurno) {
    const difB = difesa(bersaglio, confB, true);
    const serve = serveColpireCC(attaccante.profilo.AC, bersaglio.profilo.AC);
    const pc = probD6(serve);
    const parametri = confA.armi.map(arma => parametriColpo(attaccante, arma, bersaglio, difB, primoTurno));
    const n = confA.armi.length;
    const totale = { esiti: [0, 0, 0, 0], feriteAttese: 0 };
    let colpiParati = 0;

    if (difB.parata === 0) {
        accumula(totale, sequenzaColpi(parametri.map(par => ({ peso: pc, par })), bersaglio.profilo.Fe, difB.elmo), 1);
    } else {
        // Si para il colpo con il risultato più alto (il primo, a parità): per ogni attacco j
        // e risultato v si calcola il caso "j è il colpo più alto con v".
        const pMancato = (serve - 1) / 6;
        accumula(totale, sequenzaColpi([], bersaglio.profilo.Fe, difB.elmo), Math.pow(pMancato, n));
        for (let j = 0; j < n; j++) {
            for (let v = serve; v <= 6; v++) {
                // Prima di j: risultato < v; dopo j: risultato <= v (pesi non normalizzati)
                const pesi = confA.armi.map((_, i) => i < j ? (v - serve) / 6 : (v - serve + 1) / 6);
                const pesoMancati = confA.armi.reduce((prod, _, i) => i === j ? prod : prod * (pesi[i] + pMancato), 1);
                const pScenario = (1 / 6) * pesoMancati;
                if (pScenario <= 0) continue;
                let pParata = (v >= 6 || confA.armi[j].nonParabile) ? 0 : (6 - v) / 6;
                if (difB.parata === 2) pParata = 1 - Math.pow(1 - pParata, 2);
                colpiParati += pScenario * pParata;
                const altri = parametri.map((par, i) => ({ peso: i === j ? 1 : pesi[i] / (pesi[i] + pMancato), par }));
                const senzaJ = altri.filter((_, i) => i !== j);
                if (pParata > 0) accumula(totale, sequenzaColpi(senzaJ, bersaglio.profilo.Fe, difB.elmo), pScenario * pParata);
                if (pParata < 1) accumula(totale, sequenzaColpi(altri, bersaglio.profilo.Fe, difB.elmo), pScenario * (1 - pParata));
            }
        }
    }
    return {
        dadi: n,
        serveColpire: serve,
        pColpo: pc,
        colpiAttesi: n * pc - colpiParati,
        colpiParati,
        feriteAttese: totale.feriteAttese,
        esiti: totale.esiti,
        pFuori: totale.esiti[ESITO_FUORI],
        colpi: parametri
    };
}

// Turno scelto: 'primo' (bonus delle armi pesanti), 'successivi' o 'media' tra i due
function turnoScelto(attaccante, confA, bersaglio, confB, turno = 'media') {
    if (turno === 'primo') return turnoCorpoACorpo(attaccante, confA, bersaglio, confB, true);
    if (turno === 'successivi') return turnoCorpoACorpo(attaccante, confA, bersaglio, confB, false);
    return turnoMedio(attaccante, confA, bersaglio, confB);
}

// Media tra primo turno (bonus delle armi pesanti) e turni successivi
function turnoMedio(attaccante, confA, bersaglio, confB) {
    const primo = turnoCorpoACorpo(attaccante, confA, bersaglio, confB, true);
    const dopo = turnoCorpoACorpo(attaccante, confA, bersaglio, confB, false);
    const media = (a, b) => (a + b) / 2;
    return {
        ...primo,
        colpiAttesi: media(primo.colpiAttesi, dopo.colpiAttesi),
        colpiParati: media(primo.colpiParati, dopo.colpiParati),
        feriteAttese: media(primo.feriteAttese, dopo.feriteAttese),
        esiti: primo.esiti.map((p, x) => media(p, dopo.esiti[x])),
        pFuori: media(primo.pFuori, dopo.pFuori)
    };
}

// --------------------------------------------------------------------------
// Tiro
// --------------------------------------------------------------------------

// opzioni: { lungaGittata, copertura }
function tiro(attaccante, arma, bersaglio, opzioni = {}) {
    const mod = regoleMotore.colpireTiro.modificatori;
    let serve = regoleMotore.colpireTiro.base - attaccante.profilo.AB + (arma.modColpire || 0);
    if (opzioni.lungaGittata && arma.id !== 'coltelliDaLancio') serve += mod.lungaGittata;
    if (opzioni.copertura) serve += mod.copertura;
    if (bersaglio.grosso) serve += mod.bersaglioGrosso;
    const pc = attaccante.profilo.AB > 0 ? probD6(serve) : 0;
    const difB = difesa(bersaglio, null, false);
    const par = parametriColpo(attaccante, arma, bersaglio, difB, false);
    const uno = sequenzaColpi([{ peso: pc, par }], bersaglio.profilo.Fe, difB.elmo);
    const colpiPerTurno = arma.tiriPerTurno || 1;
    return {
        arma,
        serveColpire: serve,
        pColpo: pc,
        colpo: par,
        pFuoriPerTiro: uno.esiti[ESITO_FUORI],
        feritePerTiro: uno.feriteAttese,
        tiriPerTurno: colpiPerTurno,
        fuoriPerTurno: uno.esiti[ESITO_FUORI] * colpiPerTurno
    };
}

// Miglior arma da tiro del modello contro il bersaglio (null se non ne ha)
function migliorTiro(modello, bersaglio, opzioni) {
    if (modello.animale) return null;
    const armi = oggettiDi(modello).filter(o => o.tipo === 'tiro');
    let migliore = null;
    for (const arma of armi) {
        const r = tiro(modello, arma, bersaglio, opzioni);
        if (!migliore || r.fuoriPerTurno > migliore.fuoriPerTurno) migliore = r;
    }
    return migliore;
}

// --------------------------------------------------------------------------
// Valutazione complessiva di un modello contro un bersaglio
// --------------------------------------------------------------------------

// Il bersaglio combatte nel modo che rende di più contro un suo pari armato
// solo di pugnale: miglior rapporto tra colpi messi a segno e subiti.
// Il risultato resta memorizzato nel bersaglio (_configurazione).
function configurazioneBersaglio(bersaglio) {
    if (!bersaglio._configurazione) {
        const confs = configurazioniCC(bersaglio);
        const pari = { ...bersaglio, equip: [] };
        const confPari = configurazioniCC(pari)[0];
        let migliore = confs[0], valoreMigliore = -1;
        for (const c of confs) {
            const offesa = turnoMedio(bersaglio, c, pari, confPari).pFuori;
            const subisce = Math.max(0.005, turnoMedio(pari, confPari, bersaglio, c).pFuori);
            if (offesa / subisce > valoreMigliore) { valoreMigliore = offesa / subisce; migliore = c; }
        }
        bersaglio._configurazione = migliore;
    }
    return bersaglio._configurazione;
}

// { configurazione, attacco, subito (il bersaglio che attacca il modello), rapporto, tiro }
// La configurazione scelta è quella con il miglior rapporto tra bersagli messi fuori
// combattimento e probabilità di finire fuori combattimento.
// opzioni: { turno: 'media'|'primo'|'successivi', lungaGittata, copertura }
function valutaModello(modello, bersaglio, opzioni = {}) {
    const confB = configurazioneBersaglio(bersaglio);
    let migliore = null;
    for (const conf of configurazioniCC(modello)) {
        const attacco = turnoScelto(modello, conf, bersaglio, confB, opzioni.turno);
        const subito = turnoScelto(bersaglio, confB, modello, conf, opzioni.turno);
        const rapporto = attacco.pFuori / Math.max(0.005, subito.pFuori);
        if (!migliore || rapporto > migliore.rapporto) {
            migliore = { configurazione: conf, attacco, subito, rapporto };
        }
    }
    migliore.tiro = migliorTiro(modello, bersaglio, opzioni);
    return migliore;
}

if (typeof module !== 'undefined') {
    module.exports = { impostaDatiMotore, turnoCorpoACorpo, turnoMedio, turnoScelto, tiro, valutaModello, configurazioniCC, configurazioneBersaglio };
}
