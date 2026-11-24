// Dati di Mordheim. Il contenuto tra registraDati(...) è JSON: si modifica come un file .json
// (virgolette doppie, niente virgola dopo l'ultimo elemento). Caricato da js/dati.js.
registraDati("bersagli", {
    "_nota": "Bersagli di riferimento per il calcolo delle probabilità. Il bersaglio è anche l'avversario che attacca i tuoi modelli. 'equip' non comprende il pugnale gratuito; 'animale' = armi naturali, niente equipaggiamento; 'grosso' = bersaglio grosso (+1 per colpirlo al tiro).",
    "bersagli": [
        { "id": "umano", "nome": "Guerriero umano (spada)",
          "profilo": { "M": 4, "AC": 3, "AB": 3, "F": 3, "R": 3, "Fe": 1, "I": 3, "A": 1, "Cd": 7 },
          "equip": ["spada"] },
        { "id": "umanoCorazzato", "nome": "Umano corazzato (spada, scudo, armatura leggera)",
          "profilo": { "M": 4, "AC": 3, "AB": 3, "F": 3, "R": 3, "Fe": 1, "I": 3, "A": 1, "Cd": 7 },
          "equip": ["spada", "scudo", "armaturaLeggera"] },
        { "id": "milizia", "nome": "Recluta (solo pugnale)",
          "profilo": { "M": 4, "AC": 2, "AB": 2, "F": 3, "R": 3, "Fe": 1, "I": 3, "A": 1, "Cd": 6 },
          "equip": [] },
        { "id": "campione", "nome": "Campione (AC4 F4 A2, ascia e spada, armatura leggera, elmo)",
          "profilo": { "M": 4, "AC": 4, "AB": 4, "F": 4, "R": 3, "Fe": 1, "I": 4, "A": 2, "Cd": 8 },
          "equip": ["ascia", "spada", "armaturaLeggera", "elmo"] },
        { "id": "guerrieroRobusto", "nome": "Guerriero robusto (R4, ascia e scudo, armatura leggera)",
          "profilo": { "M": 4, "AC": 3, "AB": 3, "F": 3, "R": 4, "Fe": 1, "I": 2, "A": 1, "Cd": 7 },
          "equip": ["ascia", "scudo", "armaturaLeggera"] },
        { "id": "zombi", "nome": "Zombi (armi naturali)", "animale": true,
          "profilo": { "M": 4, "AC": 2, "AB": 0, "F": 3, "R": 3, "Fe": 1, "I": 1, "A": 1, "Cd": 5 },
          "equip": [] },
        { "id": "bestia", "nome": "Bestia grossa (F5 R5 Fe3 A3)", "animale": true, "grosso": true,
          "profilo": { "M": 6, "AC": 3, "AB": 0, "F": 5, "R": 5, "Fe": 3, "I": 3, "A": 3, "Cd": 5 },
          "equip": [] }
    ]
});
