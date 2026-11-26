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
const PASSI_RICERCA = 6000;
const PARTENZE = 8;
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

// Tiene solo i candidati che nessun altro batte (costo <=, attacco >=, pAbbattuto <=)
function frontiera(candidati) {
    const ordinati = [...candidati].sort((a, b) => a.costo - b.costo || b.attacco - a.attacco || a.pAbbattuto - b.pAbbattuto);
    const tenuti = [];
    for (const c of ordinati) {
        const battuto = tenuti.some(t => t.costo <= c.costo && t.attacco >= c.attacco - 1e-9 && t.pAbbattuto <= c.pAbbattuto + 1e-12);
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

// Candidati di un tipo: [{ equip, costo (a modello), attacco, resistenza, pAbbattuto, vivo, corpo, tiro }]
// attacco e resistenza comprendono il bonus campagna; corpo, tiro, pAbbattuto e vivo no
// (nella partita il bonus conta una volta sola, sull'attacco).
async function candidatiDelTipo(banda, tipo, eroe, bersaglio, opzioni) {
    const crescita = tipo.animale ? 1 : 1 + (opzioni.pesoCampagna || 0);
    const conCrescita = c => ({ ...c, attacco: c.attacco * crescita, resistenza: resistenzaDa(c.pAbbattuto) * crescita,
        vivo: sopravvivenza(c.pAbbattuto) });
    return (await candidatiSenzaCrescita(banda, tipo, eroe, bersaglio, opzioni)).map(conCrescita);
}

async function candidatiSenzaCrescita(banda, tipo, eroe, bersaglio, opzioni) {
    const costoDi = equip => equip.reduce((s, id) => s + costoOggetto(banda, tipo, eroe, id), tipo.costo);
    const valuta = equip => {
        const v = valutaModello(modelloPerMotore(tipo, equip), bersaglio, opzioni);
        return {
            equip,
            costo: costoDi(equip),
            corpo: v.attacco.pAbbattuto,
            tiro: 0,
            attacco: v.attacco.pAbbattuto,
            pAbbattuto: v.subito.pAbbattuto
        };
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
    const tiri = [{ id: null, costo: 0, fuori: 0 }, ...acquistabili
        .filter(v => v.oggetto.tipo === 'tiro')
        .map(v => ({ id: v.id, costo: v.costo, fuori: tiro(modello, v.oggetto, bersaglio, opzioni).abbattutiPerTurno }))];
    const tutti = [];
    for (const c of migliori) {
        for (const t of tiri) {
            tutti.push({
                ...c,
                equip: t.id ? [...c.equip, t.id] : c.equip,
                costo: c.costo + t.costo,
                tiro: t.fuori,
                attacco: c.corpo + opzioni.pesoTiro * t.fuori
            });
        }
    }
    return frontiera(tutti);
}

// Attacco, resistenza e indice di una banda già composta (per esempio fatta a
// mano nella scheda Banda), con gli stessi conti delle proposte.
// unitaElenco: [{ tipoId, numero, equip }]; opzioni come ottimizzaBanda (senza corone)
function valoriBanda(banda, unitaElenco, bersaglio, opzioni) {
    let attacco = 0, resistenza = 0;
    const gruppi = [];
    for (const u of unitaElenco) {
        const { tipo } = tipoDi(banda, u.tipoId);
        const v = valutaModello(modelloPerMotore(tipo, u.equip), bersaglio, opzioni);
        const crescita = tipo.animale ? 1 : 1 + (opzioni.pesoCampagna || 0);
        const tiroTurno = v.tiro ? v.tiro.abbattutiPerTurno : 0;
        const att = (v.attacco.pAbbattuto + opzioni.pesoTiro * tiroTurno) * crescita;
        attacco += att * u.numero;
        resistenza += resistenzaDa(v.subito.pAbbattuto) * crescita * u.numero;
        gruppi.push({ attacco: att, vivo: sopravvivenza(v.subito.pAbbattuto), n: u.numero });
    }
    const indice = indiceObiettivo(opzioni.obiettivo, { attacco, resistenza }, gruppi, cdComandante(banda));
    return { attacco, resistenza, indice };
}

// --------------------------------------------------------------------------
// Ricerca della composizione
// --------------------------------------------------------------------------

// Stato: [{ tipoId, eroe, c (indice del candidato), n }]
// opzioni: { obiettivo, cd (Disciplina del comandante) }
function valutaStato(stato, candidati, opzioni) {
    let attacco = 0, resistenza = 0, costo = 0, modelli = 0;
    const gruppi = [];
    for (const u of stato) {
        const c = candidati[u.tipoId][u.c];
        attacco += c.attacco * u.n;
        resistenza += c.resistenza * u.n;
        costo += c.costo * u.n;
        modelli += u.n;
        gruppi.push({ attacco: c.attacco, vivo: c.vivo, n: u.n });
    }
    const indice = indiceObiettivo(opzioni.obiettivo, { attacco, resistenza }, gruppi, opzioni.cd);
    return { attacco, resistenza, costo, modelli, indice };
}

function statoValido(stato, banda, candidati, corone, conteggioMinimi = false) {
    const v = valutaStato(stato, candidati, { obiettivo: 'attacco' });
    if (v.costo > corone || v.modelli > banda.maxModelli) return false;
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

// Rifinitura: le truppe dello stesso tipo prendono lo stesso equipaggiamento (gruppi
// più semplici da giocare) se l'indice cala meno dell'1%; poi si spendono le corone
// avanzate aggiungendo il modello che migliora di più.
function rifinisci(stato, banda, candidati, opzioni) {
    let attuale = compatta(stato);
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

// opzioni: { corone, obiettivo: 'duelli'|'massa'|'attacco', pesoTiro, pesoCampagna, turno, lungaGittata, copertura, muovere }
// avanzamento(frazione): chiamata durante il calcolo
// Restituisce fino a 3 proposte diverse, la migliore per prima:
// [{ unita: [{ tipoId, numero, equip }], attacco, resistenza, costo, modelli, indice }]
async function ottimizzaBanda(banda, bersaglio, opzioniScelte, avanzamento = () => {}) {
    const opzioni = { ...opzioniScelte, cd: cdComandante(banda) };
    const tipi = [...banda.eroi.map(t => ({ tipo: t, eroe: true })), ...banda.truppe.map(t => ({ tipo: t, eroe: false }))];
    const candidati = {};
    for (let i = 0; i < tipi.length; i++) {
        const { tipo, eroe } = tipi[i];
        candidati[tipo.id] = await candidatiDelTipo(banda, tipo, eroe, bersaglio, opzioni);
        avanzamento(0.5 * (i + 1) / tipi.length);
        await pausa();
    }

    const casuale = casualeConSeme(opzioni.corone * 7919 + banda.id.length * 131 + (opzioni.obiettivo === 'attacco' ? 1 : 0));
    const trovate = new Map();   // firma → { stato, valore }
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
                avanzamento(0.5 + 0.5 * (partenza + passo / PASSI_RICERCA) / PARTENZE);
                await pausa();
            }
        }
        if (statoValido(migliore.stato, banda, candidati, opzioni.corone, true)) {
            const rifinito = rifinisci(migliore.stato, banda, candidati, opzioni);
            trovate.set(firma(rifinito, candidati), { stato: rifinito, valore: valutaStato(rifinito, candidati, opzioni) });
        }
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
