// ==========================================================================
// MOTORE DELLE PROBABILITÀ
// Calcolo esatto (niente simulazioni casuali) di un turno di corpo a corpo
// o di un tiro tra un modello che attacca e un bersaglio, con le tabelle di
// dati/regole.js e i flag di dati/equipaggiamento.js.
//
// Un "modello" per il motore è:
//   { nome, profilo: { AC, AB, F, R, Fe, A, ... }, equip: [id, ...],
//     animale: true|false, modTS: penalità extra al tiro salvezza }
// Il pugnale gratuito è sottinteso (tranne per gli animali, che combattono
// con armi naturali).
//
// Sequenza in corpo a corpo: per colpire (AC contro AC) → parata → per
// ferire (F contro R; un 6 è un critico, uno per modello, ma non se serve
// proprio un 6) → tiro salvezza dell'armatura → ferite gravi quando finiscono
// le Ferite (si tira per ogni ferita in più e vale il risultato peggiore).
// Armi avvelenate: con un 6 per colpire la ferita è automatica.
// Esiti: 0 nessuno, 1 a terra, 2 stordito, 3 fuori combattimento.
// "Abbattuto" = a terra, stordito o fuori combattimento: quale dei tre esca è
// fortuna, e un modello a terra o stordito viene finito facilmente da un altro
// (regolamento p. 38: chi è stordito va fuori combattimento se un nemico lo
// attacca in corpo a corpo, chi è a terra viene colpito in automatico).
// La scelta di come combattere e l'ottimizzatore usano gli abbattuti, pesati poco
// per esito (PESI_ESITI): fa un po' più male chi manda più spesso fuori combattimento.
// Così contano anche lo stordimento delle armi da botta e l'elmo.
// Non calcolati: incantesimi, abilità, regole speciali non elencate nei
// flag, colpi automatici contro modelli già a terra o storditi.
// ==========================================================================

const ESITO_NESSUNO = 0, ESITO_A_TERRA = 1, ESITO_STORDITO = 2, ESITO_FUORI = 3;
// Valore di ogni esito per gli abbattuti: nessuno, a terra, stordito, fuori combattimento
const PESI_ESITI = [0, 0.8, 0.9, 1];
const abbattutoPesato = esiti => esiti.reduce((s, p, x) => s + p * PESI_ESITI[x], 0);

// Pugnale gratuito e armi naturali (animali), che non sono nel file JSON
const PUGNALE_GRATUITO_ID = 'pugnale';
const ARMI_NATURALI = { id: 'naturali', nome: 'Armi naturali', tipo: 'corpo' };

let regoleMotore = null;   // dati/regole.js
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
// (1 fallisce sempre; oltre il 6 è impossibile)
function probD6(serve) {
    if (serve === null || serve === undefined || serve > 6) return 0;
    return (7 - Math.max(2, serve)) / 6;
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
    const unaMano = [...corpo.filter(o => !o.dueMani && !o.coppia && !o.esclusiva), equipMotore[PUGNALE_GRATUITO_ID]];
    const configurazioni = [];
    // Parata: 1 = un tentativo, 2 = si ripete (spada e brocchiere, artigli); due spade non ripetono
    const aggiungi = (armi, descrizione, conScudo, conBrocchiere) => {
        const parataArmi = armi.some(a => a.parata);
        const ripete = armi.some(a => a.parataRipetuta) || (conBrocchiere && parataArmi);
        const parata = ripete ? 2 : (conBrocchiere || parataArmi ? 1 : 0);
        configurazioni.push({ armi, descrizione, scudo: !!conScudo, parata });
    };
    corpo.filter(o => o.dueMani || (o.esclusiva && !o.coppia)).forEach(o => aggiungi(Array(A).fill(o), o.nome, false, false));
    corpo.filter(o => o.coppia).forEach(o => aggiungi(Array(A + 1).fill(o), o.nome + ' (coppia)', false, false));
    unaMano.forEach((principale, i) => {
        // Un'arma sola, con scudo e/o brocchiere nell'altra mano
        const mano = [scudo && 'scudo', brocchiere && 'brocchiere'].filter(Boolean);
        const testo = principale.nome + (mano.length ? ' + ' + mano.join(' e ') : '');
        aggiungi(Array(A).fill(principale), testo, scudo, brocchiere);
        // Due armi a una mano: +1 attacco con la seconda (con un solo attacco l'ordine non conta)
        unaMano.forEach((seconda, j) => {
            if (i === j || (A === 1 && j < i)) return;
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
    const serveF = serveFerire(forza, bersaglio.profilo.R);
    let serveTS = difesaBersaglio.ts - (arma.piuUnoTA ? 1 : 0);
    serveTS += modificatoreTS(forza) + (arma.modTS || 0) + (attaccante.modTS || 0);
    const pSalvo = serveTS <= 6 ? (7 - Math.max(2, serveTS)) / 6 : 0;
    return {
        forza,
        serveFerire: serveF,
        serveTS: serveTS <= 6 ? Math.max(2, serveTS) : null,
        pSalvo,
        concussione: !!arma.concussione,
        // Niente critici se per ferire serve un 6 o se l'arma non li causa (cerbottana)
        critici: !!serveF && serveF < 6 && !arma.maiCritici,
        veleno: arma.veleno || null
    };
}

// Esiti di un colpo a segno: [{ p, ferite, bonusFG, critico }]
// critico = true se il colpo usa il critico (anche se poi salvato)
// quotaSei: probabilità che il tiro per colpire di questo colpo sia stato un 6
// (conta solo per le armi avvelenate, che con un 6 feriscono in automatico)
function esitiColpo(par, criticoDisponibile, quotaSei = 0) {
    if (!par.veleno || quotaSei <= 0) return esitiFerire(par, criticoDisponibile, par.serveFerire);
    const normali = esitiFerire(par, criticoDisponibile, par.serveFerire);
    // Loto Nero: ferita automatica, si tira comunque il dado (6 = critico).
    // Cerbottana: ferita automatica, mai critici.
    const avvelenati = par.veleno === 'lotoNero'
        ? esitiFerire({ ...par, critici: true }, criticoDisponibile, 1)
        : esitiFerire({ ...par, critici: false }, criticoDisponibile, 1);
    return [
        ...normali.map(e => ({ ...e, p: e.p * (1 - quotaSei) })),
        ...avvelenati.map(e => ({ ...e, p: e.p * quotaSei }))
    ].filter(e => e.p > 1e-12);
}

// Tiro per ferire con risultato minimo "serve" (1 = ferita automatica)
function esitiFerire(par, criticoDisponibile, serve) {
    const esiti = [];
    if (!serve) return [{ p: 1, ferite: 0, bonusFG: 0, critico: false }];
    const pSei = 1 / 6;
    // Ferita normale: risultati da "serve" a 5 (con la ferita automatica da 1 a 5)
    const pNormale = serve <= 5 ? (6 - serve) / 6 : 0;
    esiti.push({ p: pNormale * (1 - par.pSalvo), ferite: 1, bonusFG: 0, critico: false });
    if (criticoDisponibile && par.critici) {
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

// colpi: [{ peso: probabilità che il colpo vada a segno, par, quotaSei: probabilità che sia un 6 per colpire }]
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
            for (const e of esitiColpo(colpo.par, !critico, colpo.quotaSei || 0)) {
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
    let feriteAttese = 0, pFerito = 0;
    for (const [chiave, p] of stati) {
        const [, , esito, inflitte] = chiave.split('|').map(Number);
        esiti[esito] += p;
        feriteAttese += p * inflitte;
        if (inflitte > 0) pFerito += p;
    }
    // pFerito: probabilità di infliggere almeno una ferita (dopo il tiro salvezza)
    return { esiti, feriteAttese, pFerito };
}

// Somma pesata di due risultati di sequenzaColpi
function accumula(totale, parziale, peso) {
    for (let x = 0; x < 4; x++) totale.esiti[x] += parziale.esiti[x] * peso;
    totale.feriteAttese += parziale.feriteAttese * peso;
    totale.pFerito += parziale.pFerito * peso;
}

// --------------------------------------------------------------------------
// Un turno di corpo a corpo
// --------------------------------------------------------------------------

// Risultato: { dadi, serveColpire, pColpo, colpiAttesi, colpiParati, feriteAttese, pFerito, esiti[4], pFuori,
//             pAbbattuto (esiti pesati con PESI_ESITI), colpi: [par] }
// esiti: probabilità che nel turno il bersaglio resti senza conseguenze, sia atterrato, stordito, fuori combattimento
function turnoCorpoACorpo(attaccante, confA, bersaglio, confB, primoTurno) {
    const difB = difesa(bersaglio, confB, true);
    const serve = serveColpireCC(attaccante.profilo.AC, bersaglio.profilo.AC);
    const pc = probD6(serve);
    const parametri = confA.armi.map(arma => parametriColpo(attaccante, arma, bersaglio, difB, primoTurno));
    const n = confA.armi.length;
    const totale = { esiti: [0, 0, 0, 0], feriteAttese: 0, pFerito: 0 };
    let colpiParati = 0;

    if (difB.parata === 0) {
        const quotaSei = pc > 0 ? (1 / 6) / pc : 0;
        accumula(totale, sequenzaColpi(parametri.map(par => ({ peso: pc, par, quotaSei })), bersaglio.profilo.Fe, difB.elmo), 1);
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
                // Non si para un 6, un'arma che non può essere parata o un colpo con Forza doppia
                const imparabile = v >= 6 || confA.armi[j].nonParabile || parametri[j].forza >= 2 * bersaglio.profilo.F;
                let pParata = imparabile ? 0 : (6 - v) / 6;
                if (difB.parata === 2) pParata = 1 - Math.pow(1 - pParata, 2);
                colpiParati += pScenario * pParata;
                // Quota di 6 per colpire (veleno): j ha proprio v; dopo j i colpi vanno da serve a v
                const quota = i => (i === j ? (v === 6 ? 1 : 0) : (i > j && v === 6 ? 1 / (v - serve + 1) : 0));
                const altri = parametri.map((par, i) => ({ peso: i === j ? 1 : pesi[i] / (pesi[i] + pMancato), par, quotaSei: quota(i) }));
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
        pFerito: totale.pFerito,
        esiti: totale.esiti,
        pFuori: totale.esiti[ESITO_FUORI],
        pAbbattuto: abbattutoPesato(totale.esiti),
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
        pFerito: media(primo.pFerito, dopo.pFerito),
        esiti: primo.esiti.map((p, x) => media(p, dopo.esiti[x])),
        pFuori: media(primo.pFuori, dopo.pFuori),
        pAbbattuto: media(primo.pAbbattuto, dopo.pAbbattuto)
    };
}

// --------------------------------------------------------------------------
// Tiro
// --------------------------------------------------------------------------

// opzioni: { lungaGittata, copertura, muovere }
// Armi da lancio: niente penalità per gittata lunga e movimento.
// Armi "muovi o tira": se il modello ha mosso non tirano.
function tiro(attaccante, arma, bersaglio, opzioni = {}) {
    const mod = regoleMotore.colpireTiro.modificatori;
    let serve = regoleMotore.colpireTiro.base - attaccante.profilo.AB + (arma.modColpire || 0);
    if (opzioni.lungaGittata && !arma.daLancio) serve += mod.lungaGittata;
    if (opzioni.muovere && !arma.daLancio) serve += mod.muovere;
    if (opzioni.copertura) serve += mod.copertura;
    if (bersaglio.grosso) serve += mod.bersaglioGrosso;
    const puoTirare = attaccante.profilo.AB > 0 && !(opzioni.muovere && arma.muoviOTira);
    const pc = puoTirare ? probD6(serve) : 0;
    const difB = difesa(bersaglio, null, false);
    const par = parametriColpo(attaccante, arma, bersaglio, difB, false);
    const quotaSei = pc > 0 ? (1 / 6) / pc : 0;
    const uno = sequenzaColpi([{ peso: pc, par, quotaSei }], bersaglio.profilo.Fe, difB.elmo);
    const colpiPerTurno = arma.tiriPerTurno ?? 1;
    return {
        arma,
        serveColpire: serve,
        pColpo: pc,
        colpo: par,
        pFuoriPerTiro: uno.esiti[ESITO_FUORI],
        esitiPerTiro: uno.esiti,
        pFeritoPerTiro: uno.pFerito,
        feritePerTiro: uno.feriteAttese,
        tiriPerTurno: colpiPerTurno,
        fuoriPerTurno: uno.esiti[ESITO_FUORI] * colpiPerTurno,
        abbattutiPerTurno: abbattutoPesato(uno.esiti) * colpiPerTurno
    };
}

// Miglior arma da tiro del modello contro il bersaglio (null se non ne ha)
function migliorTiro(modello, bersaglio, opzioni) {
    if (modello.animale) return null;
    const armi = oggettiDi(modello).filter(o => o.tipo === 'tiro');
    let migliore = null;
    for (const arma of armi) {
        const r = tiro(modello, arma, bersaglio, opzioni);
        if (!migliore || r.abbattutiPerTurno > migliore.abbattutiPerTurno) migliore = r;
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
            const offesa = turnoMedio(bersaglio, c, pari, confPari).pAbbattuto;
            const subisce = Math.max(0.005, turnoMedio(pari, confPari, bersaglio, c).pAbbattuto);
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
// I risultati restano memorizzati nel bersaglio (_memoria): l'attacco dipende solo
// dal profilo e dalle armi usate, la difesa solo dal profilo e da armatura, scudo,
// parata ed elmo. L'ottimizzatore valuta così migliaia di equipaggiamenti.
function valutaModello(modello, bersaglio, opzioni = {}) {
    const confB = configurazioneBersaglio(bersaglio);
    const memoria = bersaglio._memoria || (bersaglio._memoria = new Map());
    const p = modello.profilo;
    const chiaveProfilo = [p.AC, p.F, p.R, p.Fe, p.A, modello.modTS || 0, opzioni.turno || 'media'].join(',');
    const ricorda = (chiave, calcola) => {
        if (!memoria.has(chiave)) memoria.set(chiave, calcola());
        return memoria.get(chiave);
    };
    let migliore = null;
    for (const conf of configurazioniCC(modello)) {
        const attacco = ricorda(chiaveProfilo + '|A|' + conf.armi.map(a => a.id).join(','),
            () => turnoScelto(modello, conf, bersaglio, confB, opzioni.turno));
        const d = difesa(modello, conf, true);
        const subito = ricorda(chiaveProfilo + '|D|' + [d.ts, d.parata, d.elmo].join(','),
            () => turnoScelto(bersaglio, confB, modello, conf, opzioni.turno));
        const rapporto = attacco.pAbbattuto / Math.max(0.005, subito.pAbbattuto);
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
