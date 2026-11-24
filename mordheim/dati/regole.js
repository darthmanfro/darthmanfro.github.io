// Dati di Mordheim. Il contenuto tra registraDati(...) è JSON: si modifica come un file .json
// (virgolette doppie, niente virgola dopo l'ultimo elemento). Caricato da js/dati.js.
registraDati("regole", {
    "_nota": "Tabelle del regolamento di Mordheim (Corpo a corpo e Tiro). Indici: riga = valore di chi attacca (1-10), colonna = valore del bersaglio (1-10). null = impossibile (la lineetta del regolamento).",
    "colpireCorpoACorpo": {
        "_nota": "Riga: AC dell'attaccante. Colonna: AC del difensore. Valore: risultato minimo del D6.",
        "tabella": [
            [4, 4, 5, 5, 5, 5, 5, 5, 5, 5],
            [3, 4, 4, 4, 5, 5, 5, 5, 5, 5],
            [3, 3, 4, 4, 4, 4, 5, 5, 5, 5],
            [3, 3, 3, 4, 4, 4, 4, 4, 5, 5],
            [3, 3, 3, 3, 4, 4, 4, 4, 4, 4],
            [3, 3, 3, 3, 3, 4, 4, 4, 4, 4],
            [3, 3, 3, 3, 3, 3, 4, 4, 4, 4],
            [3, 3, 3, 3, 3, 3, 3, 4, 4, 4],
            [3, 3, 3, 3, 3, 3, 3, 3, 4, 4],
            [3, 3, 3, 3, 3, 3, 3, 3, 3, 4]
        ]
    },
    "colpireTiro": {
        "_nota": "Risultato minimo = 7 - AB, più i modificatori (positivo = più difficile). Oltre il 6 è impossibile; un 1 fallisce sempre.",
        "base": 7,
        "modificatori": {
            "copertura": 1,
            "lungaGittata": 1,
            "muovere": 1,
            "bersaglioGrosso": -1
        }
    },
    "ferire": {
        "_nota": "Riga: Forza del colpo. Colonna: Resistenza del bersaglio.",
        "tabella": [
            [4, 5, 6, 6, null, null, null, null, null, null],
            [3, 4, 5, 6, 6, null, null, null, null, null],
            [2, 3, 4, 5, 6, 6, null, null, null, null],
            [2, 2, 3, 4, 5, 6, 6, null, null, null],
            [2, 2, 2, 3, 4, 5, 6, 6, null, null],
            [2, 2, 2, 2, 3, 4, 5, 6, 6, null],
            [2, 2, 2, 2, 2, 3, 4, 5, 6, 6],
            [2, 2, 2, 2, 2, 2, 3, 4, 5, 6],
            [2, 2, 2, 2, 2, 2, 2, 3, 4, 5],
            [2, 2, 2, 2, 2, 2, 2, 2, 3, 4]
        ]
    },
    "modificatoreTSPerForza": {
        "_nota": "Penalità al Tiro Armatura secondo la Forza del colpo (Forza 1-3: nessuna; 9 e oltre: 6).",
        "4": 1, "5": 2, "6": 3, "7": 4, "8": 5, "9": 6, "10": 6
    },
    "feriteGravi": {
        "_nota": "Tiro del D6 quando le Ferite arrivano a zero; si tira anche per ogni ferita successiva e vale il risultato più alto.",
        "risultati": [
            { "da": 1, "a": 2, "esito": "aTerra", "nome": "Atterrato" },
            { "da": 3, "a": 4, "esito": "stordito", "nome": "Stordito" },
            { "da": 5, "a": 6, "esito": "fuori", "nome": "Fuori combattimento" }
        ]
    },
    "critici": {
        "_nota": "Con un 6 al tiro per ferire il colpo è critico (uno solo per modello in ogni turno). Se per ferire serve proprio un 6 non ci sono critici. Tutti i critici raddoppiano la ferita.",
        "risultati": [
            { "da": 1, "a": 2, "nome": "Colpita una parte vitale", "ferite": 2, "ignoraArmatura": false, "bonusFeriteGravi": 0 },
            { "da": 3, "a": 4, "nome": "Colpita una parte esposta", "ferite": 2, "ignoraArmatura": true, "bonusFeriteGravi": 0 },
            { "da": 5, "a": 6, "nome": "Colpo da maestro!", "ferite": 2, "ignoraArmatura": true, "bonusFeriteGravi": 2 }
        ]
    }
});
