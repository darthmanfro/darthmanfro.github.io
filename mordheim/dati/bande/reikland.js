// Dati di Mordheim. Il contenuto tra registraDati(...) è JSON: si modifica come un file .json
// (virgolette doppie, niente virgola dopo l'ultimo elemento). Caricato da js/dati.js.
registraDati("banda:reikland", {
    "id": "reikland",
    "nome": "Mercenari del Reikland",
    "corone": 500,
    "maxModelli": 15,
    "maxEroi": 6,
    "_nota": "Dati dal regolamento (sezione Bande). animale = combatte con armi naturali e non usa equipaggiamento; grosso = bersaglio grande; vieta = tipi di oggetto che il modello non può avere. Profili: M Movimento, AC Abilità di combattimento, AB Abilità balistica, F Forza, R Resistenza, Fe Ferite, I Iniziativa, A Attacchi, Cd Disciplina. Gli eroi sono al massimo 6 (maxEroi); la truppa si recluta in gruppi da 1 a 5 modelli con lo stesso equipaggiamento.",
    "liste": {
        "mercenari": { "pugnale": 2, "mazza": 3, "ascia": 5, "spada": 10, "mazzafrusto": 15, "armaDueMani": 15, "lancia": 10, "alabarda": 10, "balestra": 25, "pistola": 15, "coppiaPistole": 30, "pistolaDaDuello": 25, "coppiaPistoleDaDuello": 50, "arco": 10, "armaturaLeggera": 20, "armaturaPesante": 50, "scudo": 5, "brocchiere": 5, "elmo": 10 },
        "tiratori": { "pugnale": 2, "mazza": 3, "ascia": 5, "spada": 10, "balestra": 25, "pistola": 15, "coppiaPistole": 30, "arco": 10, "arcoLungo": 15, "trombone": 30, "archibugio": 35, "moschettoHochland": 200, "armaturaLeggera": 20, "scudo": 5, "elmo": 10 }
    },
    "eroi": [
        {
            "id": "capitanoDiVentura", "nome": "Capitano di ventura", "costo": 60, "min": 1, "max": 1, "capo": true, "esperienza": 20, "lista": "mercenari",
            "profilo": { "M": 4, "AC": 4, "AB": 4, "F": 3, "R": 3, "Fe": 1, "I": 4, "A": 1, "Cd": 8 },
            "regole": ["Comandante: i guerrieri amici entro 12\" dal Capitano possono usare la sua Disciplina (disciplina militare del Reikland)."]
        },
        {
            "id": "bravo", "nome": "Bravo", "costo": 35, "min": 0, "max": 2, "esperienza": 8, "lista": "mercenari",
            "profilo": { "M": 4, "AC": 4, "AB": 3, "F": 3, "R": 3, "Fe": 1, "I": 3, "A": 1, "Cd": 7 }
        },
        {
            "id": "gaglioffo", "nome": "Gaglioffo", "costo": 15, "min": 0, "max": 2, "esperienza": 0, "lista": "mercenari",
            "profilo": { "M": 4, "AC": 2, "AB": 2, "F": 3, "R": 3, "Fe": 1, "I": 3, "A": 1, "Cd": 6 }
        }
    ],
    "truppe": [
        {
            "id": "uomoDArme", "nome": "Uomo d'arme", "costo": 25, "min": 0, "lista": "mercenari",
            "profilo": { "M": 4, "AC": 3, "AB": 3, "F": 3, "R": 3, "Fe": 1, "I": 3, "A": 1, "Cd": 7 }
        },
        {
            "id": "tiratore", "nome": "Tiratore", "costo": 25, "min": 0, "max": 7, "lista": "tiratori",
            "profilo": { "M": 4, "AC": 3, "AB": 4, "F": 3, "R": 3, "Fe": 1, "I": 3, "A": 1, "Cd": 7 },
            "regole": ["I tiratori del Reikland iniziano con AB 4."]
        },
        {
            "id": "spadaccino", "nome": "Spadaccino", "costo": 35, "min": 0, "max": 5, "lista": "mercenari",
            "profilo": { "M": 4, "AC": 4, "AB": 3, "F": 3, "R": 3, "Fe": 1, "I": 3, "A": 1, "Cd": 7 },
            "regole": ["Spadaccini esperti: armati di spada ripetono i tiri per colpire falliti nel turno in cui caricano (non calcolato)."]
        }
    ]
});
