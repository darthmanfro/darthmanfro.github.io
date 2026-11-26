// ==========================================================================
// SPIEGAZIONI
// Icone "i" accanto alle righe: un clic apre una finestra che spiega la
// frase. Se l'icona appartiene a un'unità (data-uid) o a un gruppo del
// confronto (data-gruppo), la spiegazione usa i numeri di quella riga.
// ==========================================================================

// Icona da mettere accanto a una riga; "attributi" aggiunge data-uid / data-gruppo
function iconaInfo(chiave, attributi = '') {
    return `<button type="button" class="info" data-info="${chiave}" ${attributi} title="Cosa vuol dire?" aria-label="Spiegazione">i</button>`;
}

// "ferito 49% · atterrato 11% · stordito 15% · fuori combattimento 23%"
function testoEsiti(pFerito, esiti, evidenziaFuori = false) {
    const fuori = `fuori combattimento ${percentuale(esiti[ESITO_FUORI])}`;
    return `ferito ${percentuale(pFerito)} · atterrato ${percentuale(esiti[ESITO_A_TERRA])} · `
        + `stordito ${percentuale(esiti[ESITO_STORDITO])} · ${evidenziaFuori ? `<strong>${fuori}</strong>` : fuori}`;
}

// --------------------------------------------------------------------------
// Contesto: i numeri della riga su cui si è cliccato
// --------------------------------------------------------------------------

function contestoInfo(elemento) {
    const bersaglio = bersaglioCorrente();
    const ctx = { bersaglio, confBersaglio: configurazioneBersaglio(bersaglio) };
    const banda = bandaCorrente();
    let tipo = null, equip = null;
    if (elemento.dataset.uid) {
        const unita = trovaUnita(Number(elemento.dataset.uid));
        if (unita) { tipo = tipoDi(banda, unita.tipoId).tipo; equip = unita.equip; ctx.numero = unita.numero; }
    } else if (elemento.dataset.gruppo !== undefined) {
        const gruppo = confrontoCorrente().gruppi[Number(elemento.dataset.gruppo)];
        if (gruppo) { tipo = tipoDi(banda, gruppo.tipoId).tipo; equip = gruppo.equip; ctx.numero = gruppo.numero; }
    }
    if (tipo) {
        ctx.nome = tipo.nome;
        ctx.modello = modelloPerMotore(tipo, equip);
        ctx.v = valutaModello(ctx.modello, bersaglio, opzioniCalcolo());
    }
    return ctx;
}

const p = testo => `<p>${testo}</p>`;
const elenco = voci => `<ul>${voci.map(v => `<li>${v}</li>`).join('')}</ul>`;
const caso = testo => `<div class="spiegazione-caso"><strong>In questo caso.</strong> ${testo}</div>`;
const nomeB = ctx => `<em>${escapeHtml(ctx.bersaglio.nome)}</em>`;
const nomeM = ctx => `<em>${escapeHtml(ctx.nome)}</em>`;

// Tiro salvezza per arma che colpisce: "6+ contro il pugnale, nessuno contro la spada"
function testoTS(conf, colpi) {
    const voci = colpi.map((par, i) => `${par.serveTS ? par.serveTS + '+' : 'nessuno'} contro ${conf.armi[i].nome.toLowerCase()}`);
    const unici = [...new Set(voci)];
    const valori = [...new Set(colpi.map(par => par.serveTS || 0))];
    return valori.length === 1 ? (valori[0] ? valori[0] + '+' : 'nessuno') : unici.join(', ');
}

// Spiegazione del calcolo di un attacco (usata per il modello e per il bersaglio)
function casoAttacco(att, conf, dif, r) {
    const pc = probD6(r.serveColpire);
    const ferire = r.colpi.map(par => par.serveFerire);
    const base = r.colpiAttesi * (r.colpi.reduce((s, par) => s + probD6(par.serveFerire) * (1 - par.pSalvo), 0) / r.colpi.length);
    return `${att} tira <strong>${quantita(r.dadi, 'dado', 'dadi')}</strong> e colpisce al <strong>${tiroMinimo(r.serveColpire)}</strong>
        (${percentuale(pc)} per dado): ${formatta(r.dadi)} × ${percentuale(pc)} = ${quantita(r.dadi * pc, 'colpo', 'colpi')}${r.colpiParati > 0.0005 ? `, meno ${formatta(r.colpiParati)} parati in media = <strong>${formatta(r.colpiAttesi)}</strong>` : ''}.
        Ferisce al <strong>${risultatiPerArma(ferire)}</strong>; il tiro salvezza di ${dif} è ${testoTS(conf, r.colpi)}.
        Senza critici le ferite sarebbero circa ${formatta(base)}; con i critici (un 6 per ferire vale 2 ferite) la media è <strong>${formatta(r.feriteAttese)}</strong>.`;
}

function casoEsiti(chi, contro, r, feriteBersaglio) {
    const su100 = x => formatta(x * 100, 0);
    let testo = `Su 100 turni di ${chi} contro ${contro}: in circa <strong>${su100(r.pFerito)}</strong> lo ferisce;
        in ${su100(r.esiti[ESITO_A_TERRA])} ${contro} resta atterrato, in ${su100(r.esiti[ESITO_STORDITO])} stordito,
        in ${su100(r.esiti[ESITO_FUORI])} va fuori combattimento.`;
    const soloFerito = r.pFerito - r.esiti[ESITO_A_TERRA] - r.esiti[ESITO_STORDITO] - r.esiti[ESITO_FUORI];
    if (feriteBersaglio > 1) {
        testo += ` ${contro} ha <strong>Fe ${feriteBersaglio}</strong>: negli altri ${su100(Math.max(0, soloFerito))} turni
            la ferita gli toglie solo una Ferita e resta in piedi.`;
    } else if (r.pFerito > 0) {
        testo += ` Quando lo ferisce, va fuori combattimento il ${percentuale(r.esiti[ESITO_FUORI] / r.pFerito)} delle volte
            (un terzo esatto sarebbe 33%: la differenza viene da critici, armi ed elmo).`;
    }
    return testo;
}

const TABELLA_FERITE = `
    <table class="spiegazione-tabella">
        <tr><th>D6</th><th>Risultato</th></tr>
        <tr><td>1-2</td><td><strong>Atterrato</strong>: a terra, nel turno dopo si rialza (con 1 Ferita).</td></tr>
        <tr><td>3-4</td><td><strong>Stordito</strong>: privo di sensi, per un turno non fa nulla, poi diventa atterrato.</td></tr>
        <tr><td>5-6</td><td><strong>Fuori combattimento</strong>: rimosso dal tavolo per il resto della partita.</td></tr>
    </table>`;

const PERCHE_NON_UN_TERZO = elenco([
    '<strong>Mazza, martello, randello, martello sigmarita</strong> (stordimento): 2-4 è stordito → 17% atterrato, 50% stordito, 33% fuori.',
    "<strong>Elmo</strong> sul bersaglio: con 4+ uno stordito diventa atterrato → 50% atterrato, 17% stordito, 33% fuori.",
    '<strong>Colpo da maestro</strong> (critico 5-6): +2 al tiro → 33% stordito, 67% fuori.',
    "<strong>Più ferite oltre lo zero</strong> nello stesso turno (per esempio un critico da 2 ferite su un modello con Fe 1): si tira per ognuna e vale il risultato più alto → con due tiri il fuori combattimento sale al 56%.",
    "<strong>Bersaglio con più Ferite</strong> (Fe 2 o più, come Vampiri, Posseduti, Rattorco): finché ha Ferite la ferita gliene toglie solo una e non si tira; si tira solo quando arriva a zero nello stesso turno."
]);

// --------------------------------------------------------------------------
// Testi
// --------------------------------------------------------------------------

const SPIEGAZIONI = {
    combatte: {
        titolo: 'Combatte con…',
        testo: ctx => p('Con le armi che ha, un modello può combattere in più modi:')
            + elenco([
                "<strong>due armi a una mano</strong> (anche il pugnale gratuito): +1 Attacco con la seconda arma;",
                "<strong>un'arma e lo scudo</strong> (+1 al tiro salvezza) o <strong>il brocchiere</strong> (parata);",
                "<strong>un'arma a due mani</strong> (flagello, alabarda, arma a due mani): niente seconda arma né scudo;",
                "<strong>il mazzafrusto</strong>: da solo, senza altre armi né scudo;",
                "<strong>armi in coppia</strong> (lame del pianto, artigli): +1 Attacco."
            ])
            + p("Spada e brocchiere permettono di <strong>parare</strong>; con tutti e due (o con gli artigli) si ripete la parata fallita, con due spade no. Il calcolo prova tutti i modi possibili e sceglie quello con il miglior rapporto tra la probabilità di mettere fuori combattimento il bersaglio e quella di esserne messo fuori combattimento.")
            + (ctx.v ? caso(`${nomeM(ctx)} combatte con <strong>${escapeHtml(ctx.v.configurazione.descrizione.toLowerCase())}</strong>: ${quantita(ctx.v.attacco.dadi, 'attacco', 'attacchi')} a turno.`) : '')
    },

    attacco: {
        titolo: 'Dadi, colpi e ferite',
        testo: ctx => p('La frase descrive <strong>un turno di corpo a corpo</strong> in cui il modello attacca il bersaglio scelto in alto:')
            + elenco([
                '<strong>Dadi</strong>: uno per Attacco. Sono gli Attacchi del profilo (A), più 1 se combatte con due armi o con armi in coppia.',
                "<strong>Colpisce al X+</strong>: il risultato minimo su ogni dado, dalla tabella per colpire che confronta l'AC dell'attaccante con quella del difensore: AC dell'attaccante più alta → 3+; uguale o più bassa → 4+; AC del difensore più del doppio → 5+.",
                "<strong>Colpi</strong>: quanti colpi vanno a segno <em>in media</em> (dadi × probabilità). Se il bersaglio può parare (spada, brocchiere) si tolgono i colpi parati: para il colpo con il risultato più alto se il suo D6 fa di più; un 6 non si para, né un colpo con Forza doppia della sua.",
                "<strong>Ferisce al Y+</strong>: risultato minimo per ferire, dalla tabella che confronta la Forza del colpo (Forza del modello più i bonus dell'arma) con la Resistenza del bersaglio. Se le armi danno valori diversi compaiono tutti (per esempio 4+/3+).",
                "<strong>Ferite</strong>: quante ferite subisce <em>in media</em> il bersaglio, dopo il tiro per ferire e il suo tiro salvezza (armatura e scudo, peggiorati dalla Forza e da ascia, armi da fuoco, Killer perfetto; il pugnale invece gli dà +1). Un 6 per ferire è un <strong>colpo critico</strong> (uno a turno, mai quando serve proprio un 6): vale <strong>2 ferite</strong>; con 3-6 sul dado del critico ignora il tiro salvezza, con 5-6 dà anche +2 sulla tabella delle ferite. Per questo la media può superare colpi × probabilità di ferire."
            ])
            + p('Sono medie: in un turno vero le ferite sono 0, 1, 2… La riga successiva dice cosa succede al bersaglio.')
            + (ctx.v ? caso(casoAttacco(nomeM(ctx), ctx.v.configurazione, nomeB(ctx), ctx.v.attacco)) : '')
    },

    esiti: {
        titolo: 'Ferito, atterrato, stordito, fuori combattimento',
        testo: ctx => p('Sono probabilità per <strong>un turno</strong> di corpo a corpo, con il bersaglio integro e un solo modello che attacca:')
            + elenco([
                "<strong>Ferito</strong>: almeno una ferita arriva al bersaglio (dopo il tiro salvezza).",
                '<strong>Atterrato, stordito, fuori combattimento</strong>: cosa gli succede nello stesso turno. Sono già comprese nel "ferito": la loro somma non lo supera mai.'
            ])
            + p('Quando un modello perde la sua ultima Ferita si tira un D6 sulla tabella delle ferite:') + TABELLA_FERITE
            + p('Nel caso base sono un terzo ciascuno, ma spesso no:') + PERCHE_NON_UN_TERZO
            + p("Atterrato e stordito non sono fuori dal gioco. Un modello a terra viene finito facilmente se un <em>altro</em> nemico lo attacca (colpito in automatico; stordito = fuori combattimento): qui non è calcolato, perché si considera un solo modello. Nel gruppo, il totale è la somma dei fuori combattimento di ogni modello, ognuno contro un bersaglio diverso.")
            + (ctx.v ? caso(casoEsiti(nomeM(ctx), nomeB(ctx), ctx.v.attacco, ctx.bersaglio.profilo.Fe)
                + (ctx.numero > 1 ? ` Il gruppo di ${ctx.numero} mette fuori combattimento in media <strong>${formatta(ctx.v.attacco.pFuori * ctx.numero)}</strong> bersagli a turno.` : '')) : '')
    },

    subito: {
        titolo: 'Il bersaglio contro di lui',
        testo: ctx => p("È la stessa cosa vista dall'altra parte: il <strong>bersaglio scelto in alto attacca il tuo modello</strong> per un turno, con le sue armi, e queste sono le probabilità che il tuo modello sia ferito, atterrato, stordito o messo fuori combattimento. Serve a capire quanto rischia il modello: con armatura, scudo, elmo o parata scendono.")
            + p('Valgono le stesse regole della riga sopra (tabella per colpire, per ferire, tiro salvezza, critici, tabella delle ferite).')
            + (ctx.v ? caso(casoAttacco(nomeB(ctx), ctx.confBersaglio, nomeM(ctx), ctx.v.subito) + ' '
                + casoEsiti(nomeB(ctx), nomeM(ctx), ctx.v.subito, ctx.modello.profilo.Fe)) : '')
    },

    tiro: {
        titolo: 'Tiro',
        testo: ctx => p("Se il modello ha un'arma da tiro, si calcola la migliore contro il bersaglio:")
            + elenco([
                "<strong>Colpisce al X+</strong>: 7 meno l'AB del modello; -1 se il bersaglio è al riparo, a gittata lunga o se il tiratore ha mosso (opzioni nella scheda Probabilità), +1 per un bersaglio grande; oltre il 6 è impossibile. Shuriken e coltelli da lancio non hanno penalità per gittata e movimento; balestra, archibugio e moschetto non tirano dopo aver mosso.",
                "<strong>Ferisce al Y+</strong>: Forza dell'arma (o del modello per shuriken e coltelli) contro Resistenza del bersaglio; poi il suo tiro salvezza. Cerbottana e Loto Nero feriscono in automatico con un 6 per colpire.",
                "<strong>Ferisce il …% dei tiri</strong>: su ogni tiro, la probabilità di colpire e ferire.",
                "<strong>Fuori combattimento a turno</strong>: media dei bersagli messi fuori combattimento in un turno di tiro, per tutto il gruppo. Pistole, archibugi e moschetti sparano un turno sì e uno no (conta mezzo tiro); la coppia di pistole ogni turno; la multibalestra due volte."
            ])
            + (ctx.v && ctx.v.tiro ? caso(`${nomeM(ctx)} tira con ${escapeHtml(ctx.v.tiro.arma.nome.toLowerCase())}: colpisce al ${tiroMinimo(ctx.v.tiro.serveColpire)} (${percentuale(ctx.v.tiro.pColpo)}),
                ferisce al ${tiroMinimo(ctx.v.tiro.colpo.serveFerire)}; ferisce il ${percentuale(ctx.v.tiro.pFeritoPerTiro)} dei tiri e mette fuori combattimento il bersaglio
                il ${percentuale(ctx.v.tiro.pFuoriPerTiro)} dei tiri.`) : '')
    },

    rendimentoBanda: {
        titolo: 'Fuori combattimento a turno (banda)',
        testo: () => p("Quanti bersagli metterebbe fuori combattimento <strong>in media</strong> tutta la banda in un turno, se ogni modello combattesse in corpo a corpo contro un bersaglio diverso (quello scelto in alto). È la somma delle probabilità di fuori combattimento di ogni modello.")
            + p("Il numero piccolo dopo il + è lo stesso per il tiro: i modelli con un'arma da tiro, in un turno di tiro. Serve per confrontare bande diverse con lo stesso bersaglio, non è una previsione della partita (non tiene conto di movimento, cariche, psicologia, magia).")
    },

    bersaglio: {
        titolo: 'Il bersaglio',
        testo: () => p("Il bersaglio è il modello contro cui si fanno tutti i calcoli: quello che i tuoi modelli attaccano e anche quello che <strong>attacca i tuoi modelli</strong> (per vedere quanto rischiano). Si sceglie in alto tra i bersagli di riferimento o tra i modelli di tutte le bande.")
            + p("Qui puoi cambiarne il profilo (AC, AB, F, R, Fe, I, A) e l'equipaggiamento: diventa <em>Personalizzato</em> e resta salvato. <em>Armi naturali</em> vuol dire che combatte senza armi (animali, Zombi, Posseduti); <em>Bersaglio grosso</em> dà +1 a chi gli tira. <em>Combatte con</em> dice quale combinazione di armi usa quando attacca.")
    },

    turno: {
        titolo: 'Turno di corpo a corpo',
        testo: () => p('Flagello e mazzafrusto danno il bonus di Forza (+2 e +1) solo nel <strong>primo turno</strong> di ogni corpo a corpo; dal secondo turno in poi colpiscono con la Forza normale.')
            + elenco([
                '<strong>Media</strong> (predefinito): la media tra il primo turno e i successivi, adatta a un combattimento di qualche turno.',
                '<strong>Primo turno</strong>: per esempio per valutare una carica.',
                '<strong>Turni successivi</strong>: un combattimento che si prolunga.'
            ])
            + p('Per le altre armi non cambia nulla.')
    },

    opzioniTiro: {
        titolo: 'Opzioni di tiro',
        testo: () => elenco([
            "<strong>Gittata lunga</strong>: il bersaglio è oltre metà della gittata dell'arma: -1 per colpire.",
            "<strong>Al riparo</strong>: una parte qualsiasi del bersaglio è coperta: -1 per colpire.",
            "<strong>Il tiratore ha mosso</strong>: -1 per colpire; balestra, archibugio e moschetto (muovi o tira) non tirano proprio."
        ]) + p('Shuriken e coltelli da lancio ignorano gittata lunga e movimento. Le opzioni valgono per tutte le righe di tiro e per l\'ottimizzatore.')
    },

    confronto: {
        titolo: 'Confronto tra gruppi',
        testo: () => p("Scegli due gruppi di modelli della banda (tipo, quanti, equipaggiamento) e confronta riga per riga cosa fanno in <strong>un turno di corpo a corpo</strong> contro il bersaglio scelto, come se ogni modello attaccasse un bersaglio diverso. In verde il gruppo migliore in ogni riga. Ogni riga ha la sua icona i.")
    },

    costo: {
        titolo: 'Costo',
        testo: () => p("Costo del gruppo in corone d'oro: (costo del modello + equipaggiamento dalla lista della banda) × numero di modelli. Il primo pugnale è gratuito.")
    },

    colpiAttesi: {
        titolo: 'Colpi attesi',
        testo: ctx => p("Colpi a segno in media in un turno da tutto il gruppo: dadi × probabilità di colpire, meno i colpi parati dal bersaglio (con spada o brocchiere para il colpo più alto se il suo D6 fa di più; un 6 non si para, né un colpo con Forza doppia della sua).")
            + (ctx.v ? caso(casoAttacco(nomeM(ctx), ctx.v.configurazione, nomeB(ctx), ctx.v.attacco) + ` Valori per un modello: moltiplica per ${ctx.numero}.`) : '')
    },

    tiriFerire: {
        titolo: 'Tiri per ferire riusciti',
        testo: () => p("Colpi attesi × probabilità di ferire (media delle armi usate): è il conto che si fa a mano, <em>prima</em> del tiro salvezza del bersaglio e senza contare che un critico vale 2 ferite. Per esempio 10 colpi che feriscono al 5+ (33%) danno circa 3,3 tiri per ferire riusciti.")
    },

    tsBersaglio: {
        titolo: 'Tiro salvezza del bersaglio',
        testo: () => p("Il risultato che serve al bersaglio per annullare una ferita, arma per arma: parte da armatura (leggera 6+, pesante 5+) e scudo (+1), peggiora con la Forza del colpo (Fo4 -1, Fo5 -2…) e con ascia, armi da fuoco e Killer perfetto, migliora di 1 contro il pugnale (6+ anche senza armatura). <em>Nessuno</em> vuol dire che non può salvarsi. Con un critico da 3-6 il tiro salvezza si ignora.")
    },

    feriteInflitte: {
        titolo: 'Ferite inflitte',
        testo: () => p("Ferite che il bersaglio subisce davvero in media, dopo il tiro salvezza e contando che un colpo critico (un 6 per ferire, uno per modello a turno) vale 2 ferite. Per questo può essere più alto dei tiri per ferire riusciti.")
    },

    fuoriAttesi: {
        titolo: 'Fuori combattimento attesi',
        testo: ctx => p("Quanti bersagli mette fuori combattimento in media il gruppo in un turno, con ogni modello contro un bersaglio diverso: numero di modelli × probabilità che un modello metta fuori combattimento il suo bersaglio. È il numero più importante del confronto.")
            + (ctx.v ? caso(`Un ${nomeM(ctx)} lo mette fuori combattimento il ${percentuale(ctx.v.attacco.pFuori)} delle volte; × ${ctx.numero} = <strong>${formatta(ctx.v.attacco.pFuori * ctx.numero)}</strong>.`) : '')
    },

    obiettivo: {
        titolo: "Obiettivo dell'ottimizzatore",
        testo: () => elenco([
            "<strong>Uno contro uno in una partita</strong> (predefinito): quanti bersagli abbatte in media la banda in una partita di 10 turni, combattendo modello contro modello. A ogni turno ogni modello ancora in piedi mette fuori combattimento in media <em>attacco</em> bersagli e ha una certa probabilità di finirci lui (contro gli attacchi del bersaglio). La qualità conta quanto il numero, ma un modello quasi invulnerabile (Rattorco, Posseduto) non vale all'infinito: la partita finisce.",
            "<strong>Test di rotta</strong> (regolamento p. 39): quando almeno il 25% dei modelli è fuori combattimento (3 su 12, 4 su 13), all'inizio di ogni turno la banda tira 2D6 sulla Disciplina del comandante; se fallisce, la partita finisce e non abbatte più nessuno. Per questo una banda molto piccola rende meno: bastano poche perdite per farla fuggire. Il calcolo usa sempre la Disciplina del comandante, anche se nel frattempo è caduto.",
            "Un modello in più si aggiunge solo se migliora l'indice di almeno lo 0,5%, e a parità di risultato si propone la banda con meno modelli.",
            "<strong>Massa: attacco totale × resistenza totale</strong> (legge quadratica di Lanchester, la scelta che c'era prima). Cresce con il quadrato del numero di modelli: premia sempre la quantità e porta quasi sempre al massimo dei modelli, anche con modelli scarsi. Non considera il test di rotta.",
            "<strong>Massimo attacco</strong>: conta solo quanti bersagli metti fuori combattimento a turno; la resistenza non conta."
        ]) + p("L'ottimizzatore prova per ogni tipo di modello tutte le combinazioni di equipaggiamento della lista, scarta quelle battute da altre su costo, attacco e resistenza, poi cerca la composizione migliore senza superare le corone e rispettando capo, limiti per tipo, 6 eroi e modelli massimi.")
    },

    pesoTiro: {
        titolo: 'Peso del tiro',
        testo: () => p("Quanto contano le armi da tiro rispetto al corpo a corpo nell'<em>attacco</em> di un modello: <strong>non conta</strong> (si guarda solo il corpo a corpo), <strong>la metà</strong> (predefinito: in partita non si tira in ogni turno e non sempre si vede un bersaglio), <strong>come il corpo a corpo</strong>. Valgono le opzioni di tiro della scheda Probabilità (gittata lunga, riparo, ha mosso).")
    },

    campagna: {
        titolo: 'Bonus campagna',
        testo: () => p("Gli eroi e la truppa che guadagnano esperienza migliorano partita dopo partita: avanzamenti (+1 a una caratteristica, per la truppa al massimo +1 ciascuna), abilità per gli eroi, armi migliori comprate con le corone; un membro della truppa può anche diventare eroe (\"Il ragazzo ha talento\").")
            + p("Gli <strong>animali</strong> (Ratti giganti, Mastini, Zombi, Ghoul, Lupi Neri, Rattorco, Posseduti) non guadagnano esperienza e non possono comprare armi né armature: restano sempre uguali.")
            + elenco([
                '<strong>Prima partita</strong>: nessun bonus, conta solo la banda di partenza.',
                "<strong>+15% / +30%</strong>: attacco e resistenza di chi cresce valgono di più; utile se la banda deve durare molte partite. Gli animali non hanno il bonus."
            ])
    },

    valoriProposta: {
        titolo: 'Attacco, resistenza, indice',
        testo: () => elenco([
            '<strong>Attacco</strong>: bersagli messi fuori combattimento in un turno da tutta la proposta, ognuno contro un bersaglio diverso (con il tiro pesato secondo la scelta).',
            '<strong>Resistenza</strong>: somma, per ogni modello, dei turni di attacchi del bersaglio che servono in media per metterlo fuori combattimento (al massimo 10 per modello: una partita non dura di più).',
            "<strong>Indice</strong>: con <em>Uno contro uno</em> i bersagli abbattuti in media in una partita di 10 turni, con il test di rotta; con <em>Massa</em> attacco totale × resistenza totale; con <em>Massimo attacco</em> solo l'attacco; è il numero che l'ottimizzatore rende più alto possibile."
        ]) + p("Con il bonus campagna, attacco, resistenza e indice comprendono il bonus; la colonna \"Fuori comb. a turno\" delle righe no (è il valore vero di oggi).")
    },

    indiciBanda: {
        titolo: 'Attacco, resistenza, indice della banda',
        testo: () => p("Gli stessi valori delle proposte della scheda Ottimizzatore, calcolati sulla banda che hai composto, contro il bersaglio scelto in alto. Valgono le scelte di obiettivo, tiro e campagna dell'Ottimizzatore: così, se cambi a mano modelli o equipaggiamento, vedi subito se la banda migliora o peggiora.")
            + elenco([
                '<strong>Attacco</strong>: bersagli messi fuori combattimento in un turno da tutta la banda (il tiro pesa secondo la scelta).',
                '<strong>Resistenza</strong>: somma, per ogni modello, dei turni di attacchi del bersaglio che servono in media per metterlo fuori combattimento (al massimo 10 per modello: una partita non dura di più).',
                "<strong>Indice</strong>: con <em>Uno contro uno</em> i bersagli abbattuti in media in una partita di 10 turni, con il test di rotta; con <em>Massa</em> attacco totale × resistenza totale; con <em>Massimo attacco</em> solo l'attacco."
            ])
            + p("Se hai già calcolato le proposte con gli stessi dati, accanto all'indice vedi quello della proposta 1, per confronto.")
    },

    bandaInviata: {
        titolo: 'La tua banda',
        testo: () => p("È la banda che hai mandato dalla scheda Banda con \"Confronta con le proposte\", calcolata con gli stessi conti delle proposte e con i dati attuali (bersaglio, obiettivo, tiro, campagna): i valori sono direttamente confrontabili. Resta qui finché non la togli o ne mandi un'altra; se poi la modifichi nella scheda Banda, rimandala per aggiornarla.")
            + p("Perché a volte batte l'Ottimizzatore:")
            + elenco([
                "nella rifinitura l'Ottimizzatore dà lo stesso equipaggiamento alle truppe dello stesso tipo, per avere gruppi più semplici da giocare, anche se l'indice cala fino all'1% (e fino a un altro 0,5% quando unisce due gruppi);",
                "toglie i modelli che pesano meno dello 0,5% dell'indice e ne aggiunge solo se lo migliorano almeno dello 0,5%: preferisce meno modelli a parità di risultato;",
                'prova solo certe combinazioni di equipaggiamento: al massimo due armi da corpo a corpo e una da tiro a modello;',
                'la ricerca prova molte bande, ma non tutte: può fermarsi su una buona soluzione senza trovare la migliore.'
            ])
            + p("Se la tua banda ha un problema (corone superate, modelli mancanti o di troppo), lo vedi in rosso: in quel caso il confronto non è alla pari.")
    },

    fuoriCorone: {
        titolo: 'Fuori combattimento ogni 100 corone',
        testo: () => p("Fuori combattimento attesi divisi per il costo del gruppo, × 100: quanto rende ogni corona spesa. Utile per confrontare gruppi che costano diversamente (per esempio 10 modelli economici contro 5 costosi).")
    }
};

// --------------------------------------------------------------------------
// Finestra
// --------------------------------------------------------------------------

function apriSpiegazione(elemento) {
    const voce = SPIEGAZIONI[elemento.dataset.info];
    if (!voce) return;
    const finestra = document.getElementById('spiegazione');
    document.getElementById('spiegazione-titolo').textContent = voce.titolo;
    document.getElementById('spiegazione-testo').innerHTML = voce.testo(contestoInfo(elemento));
    if (!finestra.open) finestra.showModal();
}

function collegaSpiegazioni() {
    const finestra = document.getElementById('spiegazione');
    document.getElementById('spiegazione-chiudi').addEventListener('click', () => finestra.close());
    // Clic fuori dal riquadro (sullo sfondo) chiude; Esc chiude da solo
    finestra.addEventListener('click', evento => { if (evento.target === finestra) finestra.close(); });
}
