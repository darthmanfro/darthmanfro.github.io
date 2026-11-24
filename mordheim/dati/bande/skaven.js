// Dati di Mordheim. Il contenuto tra registraDati(...) è JSON: si modifica come un file .json
// (virgolette doppie, niente virgola dopo l'ultimo elemento). Caricato da js/dati.js.
registraDati("banda:skaven", {
    "id": "skaven",
    "nome": "Skaven del Clan Eshin",
    "corone": 500,
    "maxModelli": 20,
    "maxEroi": 6,
    "_nota": "Dati dal regolamento (sezione Bande). animale = combatte con armi naturali e non usa equipaggiamento; grosso = bersaglio grande; vieta = tipi di oggetto che il modello non può avere. Profili: M Movimento, AC Abilità di combattimento, AB Abilità balistica, F Forza, R Resistenza, Fe Ferite, I Iniziativa, A Attacchi, Cd Disciplina. Gli eroi sono al massimo 6 (maxEroi); la truppa si recluta in gruppi da 1 a 5 modelli con lo stesso equipaggiamento.",
    "liste": {
        "skaven": { "pugnale": 2, "spada": 10, "flagello": 15, "lancia": 10, "alabarda": 10, "lameDelPianto": 50, "artigliDaCombattimento": 35, "fionda": 2, "coltelliDaLancio": 15, "cerbottana": 30, "pistolaSkaven": 35, "coppiaPistoleSkaven": 70, "armaturaLeggera": 20, "brocchiere": 5, "elmo": 10 },
        "truppa": { "pugnale": 2, "mazza": 3, "spada": 10, "lancia": 10, "fionda": 2, "armaturaLeggera": 20, "scudo": 5, "elmo": 10 }
    },
    "eroi": [
        {
            "id": "mastroAssassino", "nome": "Mastro Assassino", "costo": 60, "min": 1, "max": 1, "capo": true, "esperienza": 20, "lista": "skaven", "modTS": 1,
            "profilo": { "M": 6, "AC": 4, "AB": 4, "F": 4, "R": 3, "Fe": 1, "I": 5, "A": 1, "Cd": 7 },
            "regole": ["Comandante: i guerrieri amici entro 6\" dall'Assassino possono usare la sua Disciplina.","Killer perfetto: -1 in più al TA di chi colpisce, in corpo a corpo e al tiro."]
        },
        {
            "id": "stregoneEshin", "nome": "Stregone Eshin", "costo": 45, "min": 0, "max": 1, "esperienza": 8, "lista": "skaven",
            "profilo": { "M": 5, "AC": 3, "AB": 3, "F": 3, "R": 3, "Fe": 1, "I": 4, "A": 1, "Cd": 6 },
            "regole": ["Mago: incantesimi del Ratto Cornuto (non calcolati)."]
        },
        {
            "id": "skavenNero", "nome": "Skaven Nero", "costo": 40, "min": 0, "max": 2, "esperienza": 8, "lista": "skaven",
            "profilo": { "M": 6, "AC": 4, "AB": 3, "F": 4, "R": 3, "Fe": 1, "I": 5, "A": 1, "Cd": 6 }
        },
        {
            "id": "skavenDellaNotte", "nome": "Skaven della Notte", "costo": 20, "min": 0, "max": 2, "esperienza": 0, "lista": "truppa",
            "profilo": { "M": 6, "AC": 2, "AB": 3, "F": 3, "R": 3, "Fe": 1, "I": 4, "A": 1, "Cd": 4 },
            "regole": ["Usa la lista della Truppa."]
        }
    ],
    "truppe": [
        {
            "id": "guerrieroEshin", "nome": "Guerriero Eshin", "costo": 20, "min": 0, "lista": "truppa",
            "profilo": { "M": 5, "AC": 3, "AB": 3, "F": 3, "R": 3, "Fe": 1, "I": 4, "A": 1, "Cd": 5 }
        },
        {
            "id": "rattoGigante", "nome": "Ratto gigante", "costo": 15, "min": 0, "animale": true,
            "profilo": { "M": 6, "AC": 2, "AB": 0, "F": 3, "R": 3, "Fe": 1, "I": 4, "A": 1, "Cd": 4 },
            "regole": ["Animali: niente armi né armature, non guadagnano esperienza."]
        },
        {
            "id": "rattorco", "nome": "Rattorco", "costo": 210, "min": 0, "max": 1, "animale": true, "grosso": true,
            "profilo": { "M": 6, "AC": 3, "AB": 3, "F": 5, "R": 5, "Fe": 3, "I": 4, "A": 3, "Cd": 4 },
            "regole": ["Paura. Stupidità, a meno che non ci sia un Eroe Skaven entro 6\".","Grossa creatura: chiunque può tirargli anche se non è il bersaglio più vicino."]
        }
    ]
});
