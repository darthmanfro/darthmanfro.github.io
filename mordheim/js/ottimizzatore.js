// ==========================================================================
// OTTIMIZZATORE
// Cerca la composizione di banda (modelli ed equipaggiamento) che rende di
// più contro il bersaglio senza superare le corone.
//
// 1. Per ogni tipo di modello si provano tutte le combinazioni di
//    equipaggiamento (fino a 2 armi da corpo a corpo, un'arma da tiro,
//    armatura, scudo o brocchiere, elmo) e si tengono solo quelle che
//    nessun'altra batte insieme su costo, attacco e resistenza.
// 2. Valore di un modello: attacco = bersagli messi fuori combattimento a
//    turno (corpo a corpo + tiro col suo peso); resistenza = turni di
//    attacchi del bersaglio che servono in media per metterlo fuori
//    combattimento (1 / probabilità, al massimo 50).
// 3. Indice della banda (obiettivo "equilibrio"): attacco totale ×
//    resistenza totale, come nella legge di Lanchester: conta sia quanto
//    colpisci sia quanto a lungo resti in campo. Con l'obiettivo
//    "attacco" conta solo l'attacco totale.
// 4. Ricerca: ricottura simulata (aggiunte, rimozioni, cambi di
//    equipaggiamento) da più partenze, con numeri casuali da un seme fisso:
//    con gli stessi dati il risultato è sempre lo stesso.
// ==========================================================================

const RESISTENZA_MASSIMA = 50;
const PASSI_RICERCA = 6000;
const PARTENZE = 8;

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

// Tiene solo i candidati che nessun altro batte (costo <=, attacco >=, resistenza >=)
function frontiera(candidati) {
    const ordinati = [...candidati].sort((a, b) => a.costo - b.costo || b.attacco - a.attacco || b.resistenza - a.resistenza);
    const tenuti = [];
    for (const c of ordinati) {
        const battuto = tenuti.some(t => t.costo <= c.costo && t.attacco >= c.attacco - 1e-9 && t.resistenza >= c.resistenza - 1e-9);
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

// Candidati di un tipo: [{ equip, costo (a modello), attacco, resistenza, corpo, tiro }]
async function candidatiDelTipo(banda, tipo, eroe, bersaglio, opzioni) {
    const costoDi = equip => equip.reduce((s, id) => s + costoOggetto(banda, tipo, eroe, id), tipo.costo);
    const valuta = equip => {
        const v = valutaModello(modelloPerMotore(tipo, equip), bersaglio, opzioni);
        return {
            equip,
            costo: costoDi(equip),
            corpo: v.attacco.pFuori,
            tiro: 0,
            attacco: v.attacco.pFuori,
            resistenza: Math.min(RESISTENZA_MASSIMA, 1 / Math.max(v.subito.pFuori, 1 / RESISTENZA_MASSIMA))
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
        .map(v => ({ id: v.id, costo: v.costo, fuori: tiro(modello, v.oggetto, bersaglio, opzioni).fuoriPerTurno }))];
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

// --------------------------------------------------------------------------
// Ricerca della composizione
// --------------------------------------------------------------------------

// Stato: [{ tipoId, eroe, c (indice del candidato), n }]
function valutaStato(stato, candidati, obiettivo) {
    let attacco = 0, resistenza = 0, costo = 0, modelli = 0;
    for (const u of stato) {
        const c = candidati[u.tipoId][u.c];
        attacco += c.attacco * u.n;
        resistenza += c.resistenza * u.n;
        costo += c.costo * u.n;
        modelli += u.n;
    }
    const indice = obiettivo === 'attacco' ? attacco : attacco * resistenza;
    return { attacco, resistenza, costo, modelli, indice };
}

function statoValido(stato, banda, candidati, corone, conteggioMinimi = false) {
    const v = valutaStato(stato, candidati, 'attacco');
    if (v.costo > corone || v.modelli > banda.maxModelli) return false;
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
    const valore = s => valutaStato(s, candidati, opzioni.obiettivo).indice;
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
    // Corone avanzate
    for (let giri = 0; giri < 20; giri++) {
        let migliore = null;
        for (const tipo of [...banda.eroi, ...banda.truppe]) {
            const eroe = banda.eroi.includes(tipo);
            candidati[tipo.id].forEach((_, c) => {
                // Truppe: un modello in più in un gruppo che c'è già, oppure un gruppo nuovo
                const prova = compatta([...copiaStato(attuale), { tipoId: tipo.id, eroe, c, n: 1 }]);
                if (!statoValido(prova, banda, candidati, opzioni.corone, true)) return;
                const v = valore(prova);
                if (v > valore(attuale) + 1e-9 && (!migliore || v > migliore.v)) migliore = { prova, v };
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

// opzioni: { corone, obiettivo: 'equilibrio'|'attacco', pesoTiro, turno, lungaGittata, copertura }
// avanzamento(frazione): chiamata durante il calcolo
// Restituisce fino a 3 proposte diverse, la migliore per prima:
// [{ unita: [{ tipoId, numero, equip }], attacco, resistenza, costo, modelli, indice }]
async function ottimizzaBanda(banda, bersaglio, opzioni, avanzamento = () => {}) {
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
        let valore = valutaStato(stato, candidati, opzioni.obiettivo);
        let migliore = { stato, valore };
        for (let passo = 0; passo < PASSI_RICERCA; passo++) {
            const temperatura = 0.15 * (1 - passo / PASSI_RICERCA);
            const nuovo = mossa(stato, banda, candidati, tipi, casuale);
            if (!nuovo || !statoValido(nuovo, banda, candidati, opzioni.corone)) continue;
            const v = valutaStato(nuovo, candidati, opzioni.obiettivo);
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
            trovate.set(firma(rifinito, candidati), { stato: rifinito, valore: valutaStato(rifinito, candidati, opzioni.obiettivo) });
        }
    }
    avanzamento(1);

    return [...trovate.values()]
        .sort((a, b) => b.valore.indice - a.valore.indice)
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
