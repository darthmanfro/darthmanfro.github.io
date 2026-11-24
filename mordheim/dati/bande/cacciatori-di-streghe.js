// Dati di Mordheim. Il contenuto tra registraDati(...) è JSON: si modifica come un file .json
// (virgolette doppie, niente virgola dopo l'ultimo elemento). Caricato da js/dati.js.
registraDati("banda:cacciatoriDiStreghe", {
    "id": "cacciatoriDiStreghe",
    "nome": "Cacciatori di Streghe",
    "corone": 500,
    "maxModelli": 12,
    "maxEroi": 6,
    "_nota": "Dati dal regolamento (sezione Bande). animale = combatte con armi naturali e non usa equipaggiamento; grosso = bersaglio grande; vieta = tipi di oggetto che il modello non può avere. Profili: M Movimento, AC Abilità di combattimento, AB Abilità balistica, F Forza, R Resistenza, Fe Ferite, I Iniziativa, A Attacchi, Cd Disciplina. Gli eroi sono al massimo 6 (maxEroi); la truppa si recluta in gruppi da 1 a 5 modelli con lo stesso equipaggiamento.",
    "liste": {
        "cacciatori": { "pugnale": 2, "mazza": 3, "ascia": 5, "spada": 10, "armaDueMani": 15, "balestra": 25, "pistola": 15, "coppiaPistole": 30, "balestrino": 35, "armaturaLeggera": 20, "armaturaPesante": 50, "scudo": 5, "brocchiere": 5, "elmo": 10 },
        "flagellanti": { "flagello": 15, "mazzafrusto": 15, "armaDueMani": 15 },
        "fanatici": { "pugnale": 2, "mazza": 3, "ascia": 5, "spada": 10, "armaDueMani": 15, "lancia": 10, "arco": 10, "arcoCorto": 5, "armaturaLeggera": 20, "scudo": 5, "elmo": 10 }
    },
    "eroi": [
        {
            "id": "capitanoCacciatori", "nome": "Capitano dei Cacciatori di Streghe", "costo": 60, "min": 1, "max": 1, "capo": true, "esperienza": 20, "lista": "cacciatori",
            "profilo": { "M": 4, "AC": 4, "AB": 4, "F": 3, "R": 3, "Fe": 1, "I": 4, "A": 1, "Cd": 8 },
            "regole": ["Comandante: i guerrieri amici entro 6\" dal Capitano possono usare la sua Disciplina.","Brucia, strega!: odia i modelli che lanciano incantesimi (non calcolato)."]
        },
        {
            "id": "preteGuerriero", "nome": "Prete guerriero", "costo": 40, "min": 0, "max": 1, "esperienza": 12, "lista": "cacciatori",
            "profilo": { "M": 4, "AC": 3, "AB": 3, "F": 3, "R": 3, "Fe": 1, "I": 3, "A": 1, "Cd": 8 },
            "regole": ["Preghiere di Sigmar (non calcolate)."]
        },
        {
            "id": "cacciatoreDiStreghe", "nome": "Cacciatore di Streghe", "costo": 25, "min": 0, "max": 3, "esperienza": 8, "lista": "cacciatori",
            "profilo": { "M": 4, "AC": 3, "AB": 3, "F": 3, "R": 3, "Fe": 1, "I": 3, "A": 1, "Cd": 7 },
            "regole": ["Brucia, strega!: odia i modelli che lanciano incantesimi (non calcolato)."]
        }
    ],
    "truppe": [
        {
            "id": "flagellante", "nome": "Flagellante", "costo": 40, "min": 0, "max": 5, "lista": "flagellanti",
            "profilo": { "M": 4, "AC": 3, "AB": 3, "F": 4, "R": 4, "Fe": 1, "I": 3, "A": 1, "Cd": 10 },
            "regole": ["Pazzi fanatici: superano automaticamente i test di Disciplina. Non usano mai armi da tiro."]
        },
        {
            "id": "fanatico", "nome": "Fanatico", "costo": 20, "min": 0, "lista": "fanatici",
            "profilo": { "M": 4, "AC": 2, "AB": 2, "F": 3, "R": 3, "Fe": 1, "I": 3, "A": 1, "Cd": 7 }
        },
        {
            "id": "mastino", "nome": "Mastino", "costo": 15, "min": 0, "max": 5, "animale": true,
            "profilo": { "M": 6, "AC": 4, "AB": 0, "F": 4, "R": 3, "Fe": 1, "I": 4, "A": 1, "Cd": 5 },
            "regole": ["Animali: non usano armi né armature, non guadagnano esperienza."]
        }
    ]
});
