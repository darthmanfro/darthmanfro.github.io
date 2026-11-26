// ==========================================================================
// OTTIMIZZATORE
// Cerca la composizione di banda (modelli ed equipaggiamento) che rende di
// più contro il bersaglio senza superare le corone.
//
// 1. Per ogni tipo di modello si provano tutte le combinazioni di
//    equipaggiamento (fino a 2 armi da corpo a corpo, un'arma da tiro,
//    armatura, scudo o brocchiere, elmo) e si tengono solo quelle che
//    nessun'altra batte insieme su costo, attacco e resistenza.
// 2. Valore di un modello. "Abbattuto" = a terra, stordito o fuori
//    combattimento: quale dei tre esca è fortuna, e chi è a terra o stordito
//    viene finito facilmente da un altro modello; pesati poco per esito
//    (fuori 1, stordito 0,9, a terra 0,8: PESI_ESITI in js/motore.js).
//    attacco = bersagli abbattuti a turno (corpo a corpo + tiro col suo
//    peso); pAbbattuto = probabilità di essere abbattuto in un turno di
//    attacchi del bersaglio;
//    resistenza = 1 / pAbbattuto, al massimo TURNI_PARTITA (una partita non
//    dura di più).
// 3. Indice della banda, secondo l'obiettivo:
//    - "duelli" (predefinito): bersagli abbattuti in una partita di
//      TURNI_PARTITA turni, uno contro uno (abbattutiInPartita): a ogni
//      turno ogni modello ancora in piedi abbatte "attacco" bersagli; da
//      quando la banda ha il 25% dei modelli fuori combattimento, all'inizio
//      di ogni turno fa il test di rotta sulla Disciplina del comandante e,
//      se lo fallisce, la partita finisce. Un modello forte vale quanto più
//      modelli deboli che costano uguale, ma un modello quasi invulnerabile
//      non conta all'infinito (la partita finisce) e una banda piccola
//      fugge prima (pochi modelli persi bastano per la rotta).
//    - "massa": attacco totale × resistenza totale (legge quadratica di
//      Lanchester). Cresce col quadrato dei modelli: premia sempre il
//      numero e porta quasi sempre al massimo di modelli. Senza rotta.
//    - "attacco": conta solo l'attacco totale.
//    A parità di risultato (scarto sotto SOGLIA_MENO_MODELLI) si
//    preferisce la banda con meno modelli.
//    Opzione campagna: i modelli che guadagnano esperienza (eroi e truppa non
//    animale) hanno attacco e resistenza aumentati della percentuale scelta,
//    perché cresceranno; gli animali (Ratti giganti, Mastini, Zombi...) no.
// 4. Ricerca: ricottura simulata (aggiunte, rimozioni, cambi di
//    equipaggiamento) da più partenze, con numeri casuali da un seme fisso:
//    con gli stessi dati il risultato è sempre lo stesso.
// ==========================================================================

const TURNI_PARTITA = 10;                 // durata di una partita nei conti
const RESISTENZA_MASSIMA = TURNI_PARTITA;
const QUOTA_ROTTA = 0.25;                // test di rotta con il 25% dei modelli fuori combattimento
const PASSI_RICERCA = 15000;
const PARTENZE = 16;
const RIFINITE = 5;                 // la salita locale (lenta) parte solo dalle migliori ricerche diverse
const SOGLIA_MENO_MODELLI = 0.005;   // un modello in più deve migliorare l'indice di almeno lo 0,5%

// Probabilità di superare un test di Disciplina (2D6 <= Cd)
function superaDisciplina(cd) {
    let riusciti = 0;
    for (let a = 1; a <= 6; a++) for (let b = 1; b <= 6; b++) if (a + b <= cd) riusciti++;
    return riusciti / 36;
}

// Disciplina usata per il test di rotta: quella del comandante
function cdComandante(banda) {
    const capo = banda.eroi.find(t => t.capo) || banda.eroi[0];
    return capo ? capo.profilo.Cd : 7;
}

// Probabilità di sopravvivere t turni: vivo[t] = (1 - pAbbattuto)^t, t = 0..TURNI_PARTITA
function sopravvivenza(pAbbattuto) {
    const vivo = [1];
    for (let t = 1; t <= TURNI_PARTITA; t++) vivo.push(vivo[t - 1] * (1 - pAbbattuto));
    return vivo;
}

// Bersagli abbattuti in media in una partita, uno contro uno, con il test di rotta.
// gruppi: [{ attacco (a turno), vivo (vedi sopravvivenza), n }]; cd: Disciplina del comandante.
// Ogni modello combatte finché non è abbattuto. Dalla fine del turno in cui la banda
// ha almeno il 25% dei modelli abbattuti (contati come fuori combattimento), all'inizio di ogni turno
// si tira il test: se fallisce la partita finisce (la banda non abbatte più nessuno).
function abbattutiInPartita(gruppi, cd) {
    const modelli = gruppi.reduce((s, g) => s + g.n, 0);
    if (modelli === 0) return 0;
    const soglia = Math.ceil(modelli * QUOTA_ROTTA);
    const q = superaDisciplina(cd);
    const dp = new Array(soglia);
    let abbattuti = 0;
    let rottaPrima = 0;     // P(almeno "soglia" perdite alla fine del turno precedente)
    let testSuperati = 0;   // somma su k < t di P(soglia raggiunta al turno k) × q^(test fatti da allora)
    for (let t = 1; t <= TURNI_PARTITA; t++) {
        const inCampo = 1 - rottaPrima + testSuperati;
        let colpi = 0;
        for (const g of gruppi) colpi += g.attacco * g.n * g.vivo[t - 1];
        abbattuti += inCampo * colpi;
        // Perdite alla fine del turno t (somma di modelli indipendenti): servono solo le probabilità sotto la soglia
        dp.fill(0); dp[0] = 1;
        for (const g of gruppi) {
            const x = 1 - g.vivo[t];
            for (let m = 0; m < g.n; m++) {
                for (let j = soglia - 1; j >= 1; j--) dp[j] = dp[j] * (1 - x) + dp[j - 1] * x;
                dp[0] *= 1 - x;
            }
        }
        const rotta = 1 - dp.reduce((s, v) => s + v, 0);
        testSuperati = (testSuperati + rotta - rottaPrima) * q;
        rottaPrima = rotta;
    }
    return abbattuti;
}

// Indice di una banda: totali = { attacco, resistenza }, gruppi e cd per abbattutiInPartita
function indiceObiettivo(obiettivo, totali, gruppi, cd) {
    if (obiettivo === 'attacco') return totali.attacco;
    if (obiettivo === 'massa') return totali.attacco * totali.resistenza;
    return abbattutiInPartita(gruppi, cd);
}

const pausa = () => new Promise(r => setTimeout(r, 0));

// Generatore casuale con seme (mulberry32)
function casualeConSeme(seme) {
    let a = seme >>> 0;
    return function () {
        a = (a + 0x6D2B79F5) >>> 0;
        let t = a;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

const media = valori => valori.reduce((s, v) => s + v, 0) / valori.length;

// Tiene solo i candidati che nessun altro batte contro tutti i bersagli
// (costo <=, attacco >= e probabilità di essere abbattuto <= per ogni bersaglio)
function frontiera(candidati) {
    const ordinati = [...candidati].sort((a, b) => a.costo - b.costo || media(b.att) - media(a.att) || media(a.pAbb) - media(b.pAbb));
    const tenuti = [];
    for (const c of ordinati) {
        const battuto = tenuti.some(t => t.costo <= c.costo
            && t.att.every((v, k) => v >= c.att[k] - 1e-9) && t.pAbb.every((v, k) => v <= c.pAbb[k] + 1e-12));
        if (!battuto) tenuti.push(c);
    }
    return tenuti;
}

// Combinazioni di equipaggiamento da corpo a corpo e difesa di un tipo (senza armi da tiro)
function combinazioniCorpo(acquistabili) {
    const ids = tipo => acquistabili.filter(v => v.oggetto.tipo === tipo).map(v => v.id);
    const corpo = ids('corpo');
    const armi = [[]];
    corpo.forEach((a, i) => {
        armi.push([a]);
        corpo.forEach((b, j) => { if (j >= i) armi.push([a, b]); });
    });
    const combinazioni = [];
    for (const a of armi) {
        for (const armatura of [null, ...ids('armatura')]) {
            for (const scudo of [null, ...ids('scudo')]) {
                for (const elmo of [null, ...ids('elmo')]) {
                    combinazioni.push([...a, armatura, scudo, elmo].filter(Boolean));
                }
            }
        }
    }
    return combinazioni;
}

// Resistenza mostrata: turni che servono in media al bersaglio per abbattere il modello
function resistenzaDa(pAbbattuto) {
    return Math.min(RESISTENZA_MASSIMA, 1 / Math.max(pAbbattuto, 1 / RESISTENZA_MASSIMA));
}

// Si calcola contro uno o più bersagli (bersagli = [modello per il motore, ...]):
// ogni valore ha un elemento per bersaglio (k) e l'indice della banda è la media
// degli indici contro i singoli bersagli.
//
// Valori grezzi di un modello: { corpoK, tiroK (abbattuti a turno al tiro con la
// miglior arma), att (corpo + pesoTiro × tiro), pAbb (probabilità di essere
// abbattuto in un turno) }, un elemento per bersaglio.
// completaCandidato aggiunge il bonus campagna e i valori usati dalla ricerca:
// att con il bonus, vivo[k] (sopravvivenza turno per turno), res[k] (resistenza con
// il bonus), corpo e tiro medi senza bonus (righe delle proposte), attacco e
// resistenza medi con il bonus.
function completaCandidato(c, crescita) {
    const att = c.att.map(v => v * crescita);
    const res = c.pAbb.map(p => resistenzaDa(p) * crescita);
    return { ...c, att, res, vivo: c.pAbb.map(sopravvivenza), corpo: media(c.corpoK), tiro: media(c.tiroK),
        attacco: media(att), resistenza: media(res) };
}

function crescitaDi(tipo, opzioni) {
    return tipo.animale ? 1 : 1 + (opzioni.pesoCampagna || 0);
}

// Valori di un modello con il suo equipaggiamento (per le bande già composte)
function valoriModello(tipo, equip, bersagli, opzioni) {
    const modello = modelloPerMotore(tipo, equip);
    const vs = bersagli.map(b => valutaModello(modello, b, opzioni));
    const corpoK = vs.map(v => v.attacco.pAbbattuto);
    const tiroK = vs.map(v => (v.tiro ? v.tiro.abbattutiPerTurno : 0));
    return completaCandidato({ equip, corpoK, tiroK, att: corpoK.map((v, k) => v + opzioni.pesoTiro * tiroK[k]),
        pAbb: vs.map(v => v.subito.pAbbattuto) }, crescitaDi(tipo, opzioni));
}

// Candidati di un tipo: [{ equip, costo (a modello), ...valori (vedi completaCandidato) }]
async function candidatiDelTipo(banda, tipo, eroe, bersagli, opzioni) {
    const crescita = crescitaDi(tipo, opzioni);
    return (await candidatiSenzaCrescita(banda, tipo, eroe, bersagli, opzioni)).map(c => completaCandidato(c, crescita));
}

async function candidatiSenzaCrescita(banda, tipo, eroe, bersagli, opzioni) {
    const costoDi = equip => equip.reduce((s, id) => s + costoOggetto(banda, tipo, eroe, id), tipo.costo);
    const zeri = bersagli.map(() => 0);
    const valuta = equip => {
        const modello = modelloPerMotore(tipo, equip);
        const vs = bersagli.map(b => valutaModello(modello, b, opzioni));
        const corpoK = vs.map(v => v.attacco.pAbbattuto);
        return { equip, costo: costoDi(equip), corpoK, tiroK: zeri, att: corpoK, pAbb: vs.map(v => v.subito.pAbbattuto) };
    };
    if (tipo.animale) return [valuta([])];

    const acquistabili = oggettiAcquistabili(banda, tipo, eroe);
    const corpo = [];
    const combinazioni = combinazioniCorpo(acquistabili);
    for (let i = 0; i < combinazioni.length; i++) {
        corpo.push(valuta(combinazioni[i]));
        if (i % 200 === 199) await pausa();
    }
    const migliori = frontiera(corpo);

    // Armi da tiro: si sommano all'attacco con il loro peso
    const modello = modelloPerMotore(tipo, []);
    const tiri = [{ id: null, costo: 0, tiroK: zeri }, ...acquistabili
        .filter(v => v.oggetto.tipo === 'tiro')
        .map(v => ({ id: v.id, costo: v.costo, tiroK: bersagli.map(b => tiro(modello, v.oggetto, b, opzioni).abbattutiPerTurno) }))];
    const tutti = [];
    for (const c of migliori) {
        for (const t of tiri) {
            tutti.push({
                ...c,
                equip: t.id ? [...c.equip, t.id] : c.equip,
                costo: c.costo + t.costo,
                tiroK: t.tiroK,
                att: c.corpoK.map((v, k) => v + opzioni.pesoTiro * t.tiroK[k])
            });
        }
    }
    return frontiera(tutti);
}

// Indice di un elenco di gruppi [{ c (valori di completaCandidato), n }]: media degli
// indici contro i singoli bersagli; attacco e resistenza sono medie sui bersagli.
function valutaGruppi(elenco, opzioni, cd) {
    const quanti = elenco.length ? elenco[0].c.att.length : 1;
    let attacco = 0, resistenza = 0, indice = 0;
    for (let k = 0; k < quanti; k++) {
        let att = 0, res = 0;
        const gruppi = [];
        for (const { c, n } of elenco) {
            att += c.att[k] * n;
            res += c.res[k] * n;
            gruppi.push({ attacco: c.att[k], vivo: c.vivo[k], n });
        }
        attacco += att / quanti;
        resistenza += res / quanti;
        indice += indiceObiettivo(opzioni.obiettivo, { attacco: att, resistenza: res }, gruppi, cd) / quanti;
    }
    return { attacco, resistenza, indice };
}

// Attacco, resistenza e indice di una banda già composta (per esempio fatta a
// mano nella scheda Banda), con gli stessi conti delle proposte.
// unitaElenco: [{ tipoId, numero, equip }]; bersagli: [modello per il motore, ...];
// opzioni come ottimizzaBanda (senza corone)
function valoriBanda(banda, unitaElenco, bersagli, opzioni) {
    const elenco = unitaElenco.map(u => ({ c: valoriModello(tipoDi(banda, u.tipoId).tipo, u.equip, bersagli, opzioni), n: u.numero }));
    return valutaGruppi(elenco, opzioni, cdComandante(banda));
}

// --------------------------------------------------------------------------
// Ricerca della composizione
// --------------------------------------------------------------------------

// Stato: [{ tipoId, eroe, c (indice del candidato), n }]
// opzioni: { obiettivo, cd (Disciplina del comandante) }
function valutaStato(stato, candidati, opzioni) {
    let costo = 0, modelli = 0;
    for (const u of stato) {
        costo += candidati[u.tipoId][u.c].costo * u.n;
        modelli += u.n;
    }
    const v = valutaGruppi(stato.map(u => ({ c: candidati[u.tipoId][u.c], n: u.n })), opzioni, opzioni.cd);
    return { ...v, costo, modelli };
}

function statoValido(stato, banda, candidati, corone, conteggioMinimi = false) {
    let costo = 0, modelli = 0;
    for (const u of stato) { costo += candidati[u.tipoId][u.c].costo * u.n; modelli += u.n; }
    if (costo > corone || modelli > banda.maxModelli) return false;
    if (banda.maxEroi && stato.filter(u => u.eroe).reduce((s, u) => s + u.n, 0) > banda.maxEroi) return false;
    for (const tipo of [...banda.eroi, ...banda.truppe]) {
        const n = stato.filter(u => u.tipoId === tipo.id).reduce((s, u) => s + u.n, 0);
        if (tipo.max !== undefined && n > tipo.max) return false;
        if (conteggioMinimi && tipo.min && n < tipo.min) return false;
    }
    return true;
}

function copiaStato(stato) {
    return stato.map(u => ({ ...u }));
}

// Unisce le truppe con lo stesso tipo ed equipaggiamento
function compatta(stato) {
    const risultato = [];
    for (const u of stato) {
        const uguale = !u.eroe && risultato.find(r => !r.eroe && r.tipoId === u.tipoId && r.c === u.c);
        if (uguale) uguale.n += u.n; else if (u.n > 0) risultato.push({ ...u });
    }
    return risultato;
}

// Una mossa a caso: aggiunge, toglie o cambia l'equipaggiamento di un modello
function mossa(stato, banda, candidati, tipi, casuale) {
    const nuovo = copiaStato(stato);
    const scelta = casuale();
    const unaQualsiasi = () => nuovo[Math.floor(casuale() * nuovo.length)];
    const candidatoACaso = tipoId => Math.floor(casuale() * candidati[tipoId].length);
    if (scelta < 0.35 || nuovo.length === 0) {
        const t = tipi[Math.floor(casuale() * tipi.length)];
        nuovo.push({ tipoId: t.tipo.id, eroe: t.eroe, c: candidatoACaso(t.tipo.id), n: 1 });
    } else if (scelta < 0.6) {
        const u = unaQualsiasi();
        const tipo = tipoDi(banda, u.tipoId).tipo;
        const n = nuovo.filter(x => x.tipoId === u.tipoId).reduce((s, x) => s + x.n, 0);
        if (tipo.min && n <= tipo.min) return null;
        u.n -= 1;
    } else if (scelta < 0.75) {
        // Tutto un gruppo cambia equipaggiamento insieme (un modello alla volta servirebbero molti passi)
        const u = unaQualsiasi();
        u.c = candidatoACaso(u.tipoId);
    } else if (scelta < 0.9) {
        const u = unaQualsiasi();
        if (u.n > 1) {   // un solo modello del gruppo cambia equipaggiamento
            u.n -= 1;
            nuovo.push({ ...u, n: 1, c: candidatoACaso(u.tipoId) });
        } else {
            u.c = candidatoACaso(u.tipoId);
        }
    } else {
        // Toglie un modello e ne aggiunge un altro (per uscire dalle situazioni a budget pieno)
        const u = unaQualsiasi();
        const tipo = tipoDi(banda, u.tipoId).tipo;
        const n = nuovo.filter(x => x.tipoId === u.tipoId).reduce((s, x) => s + x.n, 0);
        if (!(tipo.min && n <= tipo.min)) u.n -= 1;
        const t = tipi[Math.floor(casuale() * tipi.length)];
        nuovo.push({ tipoId: t.tipo.id, eroe: t.eroe, c: candidatoACaso(t.tipo.id), n: 1 });
    }
    return compatta(nuovo);
}

// Stato iniziale: i modelli obbligatori con l'equipaggiamento più economico
function statoIniziale(banda) {
    const stato = [];
    for (const tipo of [...banda.eroi, ...banda.truppe]) {
        const eroe = banda.eroi.includes(tipo);
        for (let i = 0; i < (tipo.min || 0); i++) stato.push({ tipoId: tipo.id, eroe, c: 0, n: 1 });
    }
    return compatta(stato);
}

// Salita locale: prova tutte le modifiche vicine e tiene la migliore, finché ne trova
// una che migliora: un gruppo intero cambia equipaggiamento, oppure un modello di un
// gruppo diventa un altro tipo o un altro equipaggiamento (anche dello stesso tipo).
// Le truppe vanno trattate a gruppi: un modello alla volta la ricerca casuale ci mette troppo.
function salitaLocale(stato, banda, candidati, opzioni, tipi) {
    let attuale = compatta(stato);
    let valoreAttuale = valutaStato(attuale, candidati, opzioni).indice;
    for (let giri = 0; giri < 50; giri++) {
        let migliore = null;
        const prova = nuovo => {
            const s = compatta(nuovo);
            if (!statoValido(s, banda, candidati, opzioni.corone, true)) return;
            const v = valutaStato(s, candidati, opzioni).indice;
            if (v > valoreAttuale * (1 + 1e-9) && (!migliore || v > migliore.v)) migliore = { s, v };
        };
        // Un modello in più, di qualsiasi tipo ed equipaggiamento
        for (const t of tipi) {
            candidati[t.tipo.id].forEach((_, c) => prova([...attuale, { tipoId: t.tipo.id, eroe: t.eroe, c, n: 1 }]));
        }
        attuale.forEach((u, i) => {
            // Un modello in meno
            prova(attuale.map((x, j) => (j === i ? { ...x, n: x.n - 1 } : x)));
            // Tutto il gruppo con un altro equipaggiamento
            candidati[u.tipoId].forEach((_, c) => {
                if (c !== u.c) prova(attuale.map((x, j) => (j === i ? { ...x, c } : x)));
            });
            // Un modello del gruppo diventa un altro modello (tipo ed equipaggiamento qualsiasi)
            const senzaUno = attuale.map((x, j) => (j === i ? { ...x, n: x.n - 1 } : x));
            for (const t of tipi) {
                candidati[t.tipo.id].forEach((_, c) => {
                    if (t.tipo.id !== u.tipoId || c !== u.c) prova([...senzaUno, { tipoId: t.tipo.id, eroe: t.eroe, c, n: 1 }]);
                });
            }
        });
        if (!migliore) break;
        attuale = migliore.s;
        valoreAttuale = migliore.v;
    }
    return attuale;
}

// Rifinitura: dopo la salita locale, le truppe dello stesso tipo prendono lo stesso
// equipaggiamento (gruppi più semplici da giocare) se l'indice cala meno dell'1%; poi
// si tolgono i modelli inutili e si spendono le corone avanzate.
function rifinisci(stato, banda, candidati, opzioni, tipi) {
    let attuale = salitaLocale(stato, banda, candidati, opzioni, tipi);
    const valore = s => valutaStato(s, candidati, opzioni).indice;
    const tipiTruppa = [...new Set(attuale.filter(u => !u.eroe).map(u => u.tipoId))];
    for (const tipoId of tipiTruppa) {
        const gruppi = attuale.filter(u => u.tipoId === tipoId);
        if (gruppi.length < 2) continue;
        const totale = gruppi.reduce((s, u) => s + u.n, 0);
        const altri = attuale.filter(u => u.tipoId !== tipoId);
        let migliore = null;
        for (let c = 0; c < candidati[tipoId].length; c++) {
            const prova = [...altri, { tipoId, eroe: false, c, n: totale }];
            if (!statoValido(prova, banda, candidati, opzioni.corone, true)) continue;
            const v = valore(prova);
            if (!migliore || v > migliore.v) migliore = { prova, v };
        }
        if (migliore && migliore.v >= valore(attuale) * 0.99) attuale = migliore.prova;
    }
    // Poi due gruppi alla volta: uno prende l'equipaggiamento dell'altro (indice -0,5% al massimo)
    for (let unito = true; unito;) {
        unito = false;
        const truppe = attuale.filter(u => !u.eroe);
        for (const a of truppe) {
            for (const b of truppe) {
                if (unito || a === b || a.tipoId !== b.tipoId) continue;
                const prova = compatta(attuale.map(u => (u === b ? { ...u, c: a.c } : u)));
                if (statoValido(prova, banda, candidati, opzioni.corone, true) && valore(prova) >= valore(attuale) * 0.995) {
                    attuale = prova;
                    unito = true;
                }
            }
        }
    }
    // Meno modelli a parità di risultato: si tolgono quelli che valgono meno dello 0,5% dell'indice
    for (let tolto = true; tolto;) {
        tolto = false;
        let migliore = null;
        attuale.forEach((u, i) => {
            const prova = compatta(attuale.map((x, j) => (j === i ? { ...x, n: x.n - 1 } : x)));
            if (!statoValido(prova, banda, candidati, opzioni.corone, true)) return;
            const v = valore(prova);
            if (v >= valore(attuale) * (1 - SOGLIA_MENO_MODELLI) && (!migliore || v > migliore.v)) migliore = { prova, v };
        });
        if (migliore) { attuale = migliore.prova; tolto = true; }
    }
    // Corone avanzate: un modello in più solo se migliora l'indice di almeno lo 0,5%
    for (let giri = 0; giri < 20; giri++) {
        let migliore = null;
        for (const tipo of [...banda.eroi, ...banda.truppe]) {
            const eroe = banda.eroi.includes(tipo);
            candidati[tipo.id].forEach((_, c) => {
                // Truppe: un modello in più in un gruppo che c'è già, oppure un gruppo nuovo
                const prova = compatta([...copiaStato(attuale), { tipoId: tipo.id, eroe, c, n: 1 }]);
                if (!statoValido(prova, banda, candidati, opzioni.corone, true)) return;
                const v = valore(prova);
                if (v > valore(attuale) * (1 + SOGLIA_MENO_MODELLI) && (!migliore || v > migliore.v)) migliore = { prova, v };
            });
        }
        if (!migliore) break;
        attuale = migliore.prova;
    }
    return attuale;
}

function firma(stato, candidati) {
    return stato.map(u => `${u.n}x${u.tipoId}:${candidati[u.tipoId][u.c].equip.slice().sort().join('+')}`).sort().join('|');
}

// bersagli: [modello per il motore, ...] (uno o più: si ottimizza la media)
// opzioni: { corone, obiettivo: 'duelli'|'massa'|'attacco', pesoTiro, pesoCampagna, turno, lungaGittata, copertura, muovere }
// avanzamento(frazione): chiamata durante il calcolo
// Restituisce fino a 3 proposte diverse, la migliore per prima:
// [{ unita: [{ tipoId, numero, equip }], attacco, resistenza, costo, modelli, indice }]
async function ottimizzaBanda(banda, bersagli, opzioniScelte, avanzamento = () => {}) {
    const opzioni = { ...opzioniScelte, cd: cdComandante(banda) };
    const tipi = [...banda.eroi.map(t => ({ tipo: t, eroe: true })), ...banda.truppe.map(t => ({ tipo: t, eroe: false }))];
    const candidati = {};
    for (let i = 0; i < tipi.length; i++) {
        const { tipo, eroe } = tipi[i];
        candidati[tipo.id] = await candidatiDelTipo(banda, tipo, eroe, bersagli, opzioni);
        avanzamento(0.3 * (i + 1) / tipi.length);
        await pausa();
    }

    const casuale = casualeConSeme(opzioni.corone * 7919 + banda.id.length * 131 + (opzioni.obiettivo === 'attacco' ? 1 : 0));
    const finali = new Map();    // firma → { stato, valore } alla fine di ogni ricerca
    for (let partenza = 0; partenza < PARTENZE; partenza++) {
        let stato = statoIniziale(banda);
        if (!statoValido(stato, banda, candidati, opzioni.corone)) return [];
        let valore = valutaStato(stato, candidati, opzioni);
        let migliore = { stato, valore };
        for (let passo = 0; passo < PASSI_RICERCA; passo++) {
            const temperatura = 0.15 * (1 - passo / PASSI_RICERCA);
            const nuovo = mossa(stato, banda, candidati, tipi, casuale);
            if (!nuovo || !statoValido(nuovo, banda, candidati, opzioni.corone)) continue;
            const v = valutaStato(nuovo, candidati, opzioni);
            const relativo = (v.indice - valore.indice) / Math.max(valore.indice, 1e-6);
            // Si accetta se è meglio, oppure a volte se è di poco peggio (per non fermarsi troppo presto)
            const piuCaro = v.indice === valore.indice && v.costo > valore.costo;
            if (relativo > 0 || piuCaro || (temperatura > 0 && casuale() < Math.exp(relativo / temperatura))) {
                stato = nuovo;
                valore = v;
                if (v.indice > migliore.valore.indice + 1e-9
                    || (Math.abs(v.indice - migliore.valore.indice) <= 1e-9 && v.costo < migliore.valore.costo)) {
                    migliore = { stato, valore: v };
                }
            }
            if (passo % 1500 === 1499) {
                avanzamento(0.3 + 0.4 * (partenza + passo / PASSI_RICERCA) / PARTENZE);
                await pausa();
            }
        }
        if (statoValido(migliore.stato, banda, candidati, opzioni.corone, true)) {
            finali.set(firma(compatta(migliore.stato), candidati), migliore);
        }
    }

    // Rifinitura (con la salita locale) delle migliori ricerche diverse tra loro
    const daRifinire = [...finali.values()].sort((a, b) => b.valore.indice - a.valore.indice).slice(0, RIFINITE);
    const trovate = new Map();   // firma → { stato, valore }
    for (let i = 0; i < daRifinire.length; i++) {
        const rifinito = rifinisci(daRifinire[i].stato, banda, candidati, opzioni, tipi);
        trovate.set(firma(rifinito, candidati), { stato: rifinito, valore: valutaStato(rifinito, candidati, opzioni) });
        avanzamento(0.7 + 0.3 * (i + 1) / daRifinire.length);
        await pausa();
    }
    avanzamento(1);

    // La migliore per prima; se due sono quasi pari, prima quella con meno modelli
    const quasiPari = (a, b) => Math.abs(a.indice - b.indice) <= SOGLIA_MENO_MODELLI * Math.max(a.indice, b.indice);
    return [...trovate.values()]
        .sort((a, b) => (quasiPari(a.valore, b.valore) && a.valore.modelli !== b.valore.modelli
            ? a.valore.modelli - b.valore.modelli : b.valore.indice - a.valore.indice))
        .slice(0, 3)
        .map(({ stato, valore }) => ({
            ...valore,
            unita: stato.map(u => {
                const c = candidati[u.tipoId][u.c];
                return { tipoId: u.tipoId, numero: u.n, equip: c.equip, corpo: c.corpo, tiro: c.tiro, resistenza: c.resistenza };
            })
        }));
}

// Trasforma una proposta in unità della scheda Banda (truppe in gruppi da massimo 5)
function unitaDaProposta(banda, proposta) {
    const unita = [];
    let uid = 1;
    for (const u of proposta.unita) {
        const { tipo, eroe } = tipoDi(banda, u.tipoId);
        const maxGruppo = eroe ? 1 : (tipo.maxGruppo || MAX_GRUPPO);
        for (let resto = u.numero; resto > 0; resto -= maxGruppo) {
            unita.push({ uid: uid++, tipoId: u.tipoId, numero: Math.min(resto, maxGruppo), equip: [...u.equip] });
        }
    }
    return { unita, prossimoUid: uid };
}
