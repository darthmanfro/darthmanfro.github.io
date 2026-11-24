// Dati di Mordheim. Il contenuto tra registraDati(...) è JSON: si modifica come un file .json
// (virgolette doppie, niente virgola dopo l'ultimo elemento). Caricato da js/dati.js.
registraDati("indice", {
    "_nota": "Elenco delle bande: 'file' è il file in dati/bande/. Per aggiungere una banda crea il suo file (registraDati(\"banda:<id>\", {...})) e aggiungila qui.",
    "bande": [
        { "id": "reikland", "nome": "Mercenari del Reikland", "file": "reikland.js" },
        { "id": "middenheim", "nome": "Mercenari di Middenheim", "file": "middenheim.js" },
        { "id": "marienburg", "nome": "Mercenari di Marienburg", "file": "marienburg.js" },
        { "id": "posseduti", "nome": "Culto dei Posseduti", "file": "posseduti.js" },
        { "id": "cacciatoriDiStreghe", "nome": "Cacciatori di Streghe", "file": "cacciatori-di-streghe.js" },
        { "id": "sorelleSigmarite", "nome": "Sorelle Sigmarite", "file": "sorelle-sigmarite.js" },
        { "id": "nonmorti", "nome": "Nonmorti", "file": "nonmorti.js" },
        { "id": "skaven", "nome": "Skaven del Clan Eshin", "file": "skaven.js" }
    ]
});
