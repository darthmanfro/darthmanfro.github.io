---
layout: null
---
<!DOCTYPE html>
<html lang="it">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Calciomercato LIVE - Generatore Notizie</title>
    <style>
        /* Stile generale ispirato ai siti sportivi (Gazzetta, Sky Sport) */
        body {
            font-family: 'Helvetica Neue', Arial, sans-serif;
            background-color: #f4f6f9;
            margin: 0;
            padding: 20px;
            display: flex;
            flex-direction: column;
            align-items: center;
        }

        .container {
            max-width: 600px;
            width: 100%;
            background-color: #ffffff;
            border-radius: 8px;
            box-shadow: 0 4px 15px rgba(0,0,0,0.1);
            padding: 30px;
            text-align: center;
            box-sizing: border-box;
        }

        h1 {
            color: #e2001a; /* Rosso sportivo dinamico */
            text-transform: uppercase;
            font-size: 2rem;
            margin-bottom: 5px;
            letter-spacing: -1px;
        }

        .subtitle {
            color: #666;
            font-size: 0.9rem;
            margin-bottom: 25px;
            text-transform: uppercase;
            letter-spacing: 1px;
        }

        /* Pulsante stile "Breaking News" */
        #btn-genera {
            background-color: #002f6c; /* Blu notte sport */
            color: white;
            border: none;
            padding: 15px 30px;
            font-size: 1.1rem;
            font-weight: bold;
            text-transform: uppercase;
            letter-spacing: 1px;
            border-radius: 50px;
            cursor: pointer;
            transition: all 0.2s ease;
            box-shadow: 0 4px 6px rgba(0,47,108,0.2);
        }

        #btn-genera:hover {
            background-color: #e2001a;
            transform: translateY(-2px);
            box-shadow: 0 6px 12px rgba(226,0,26,0.3);
        }

        #btn-genera:active {
            transform: translateY(0);
        }

        /* Box della notizia generata */
        #news-box {
            margin-top: 30px;
            min-height: 120px;
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            border-left: 5px solid #e2001a;
            background-color: #fdfdfd;
            padding: 20px;
            border-radius: 4px;
            box-shadow: inset 0 0 10px rgba(0,0,0,0.02);
            opacity: 0;
            transition: opacity 0.3s ease;
        }

        #news-box.show {
            opacity: 1;
        }

        /* Badge "ULTIM'ORA" */
        .badge {
            background-color: #e2001a;
            color: white;
            font-size: 0.75rem;
            font-weight: bold;
            padding: 4px 8px;
            text-transform: uppercase;
            border-radius: 3px;
            margin-bottom: 15px;
            letter-spacing: 1px;
            display: inline-block;
        }

        /* Il titolo della notizia vero e proprio */
        .news-text {
            font-size: 1.4rem;
            font-weight: 800;
            color: #111;
            line-height: 1.3;
            text-transform: uppercase; /* Tipico dei titoloni sportivi */
        }

        /* Evidenziazione per i nomi delle squadre o dettagli caldi */
        .highlight {
            color: #002f6c;
        }
    </style>
</head>
<body>

    <div class="container">
        <h1>Calciomercato LIVE</h1>
        <div class="subtitle">Generatore di Notizie in Tempo Reale</div>
        
        <button id="btn-genera">Genera News</button>

        <div id="news-box">
            <span class="badge">Ultim'ora</span>
            <div id="news-content" class="news-text">
                Clicca sul pulsante per scoprire l'ultima bomba di mercato!
            </div>
        </div>
    </div>

    <script>
        // Definizione dei 3 archivi di dati (JSON/Array)
        const squadre = ["Inter", "Juventus", "Milan", "Roma", "Lazio", "Napoli", "Atalanta", "Fiorentina", "Torino", "Bologna"];
        
        const giocatori = ["Lautaro", "Vlahovic", "Leao", "Dybala", "Zaccagni", "Kvaratskhelia", "Lookman", "Gudmundsson", "Zapata", "Orsolini"];
        
        // Ho strutturato le frasi inserendo un "placeholder" {giocatore} per fare in modo che la frase 
        // sia grammaticalmente corretta e naturale a prescindere dall'ordine.
        const azioni = [
            "pista calda su {giocatore}: l'accordo è vicino",
            "si raffredda la pista su {giocatore}: inserimento a sorpresa di un club inglese",
            "tentativo lampo per {giocatore}: offerta ufficiale presentata",
            "è fatta per l'arrivo di {giocatore}: visite mediche programmate",
            "frena la trattativa per {giocatore}: ballano 5 milioni sui bonus",
            "assalto totale a {giocatore}: l'agente è in sede",
            "beffa vicina per {giocatore}: il giocatore preferisce un'altra destinazione",
            "muro contro muro per {giocatore}: la richiesta del club è considerata troppo alta"
        ];

        // Funzione per estrarre un elemento casuale da un array
        function getRandomElement(array) {
            const randomIndex = Math.floor(Math.random() * array.length);
            return array[randomIndex];
        }

        // Funzione principale che genera la notizia
        function generaNews() {
            // 1. Estrazione dei tre pezzi random
            const squadraScelta = getRandomElement(squadre);
            const giocatoreScelto = getRandomElement(giocatori);
            const azioneScelta = getRandomElement(azioni);

            // 2. Logica di composizione: sostituisco il placeholder con il nome del giocatore
            const testoAzione = azioneScelta.replace("{giocatore}", giocatoreScelto);

            // 3. Unione finale (Pezzo 1 + Spazio + Pezzo 3 modificato con Pezzo 2)
            // Usiamo il tag <span> per applicare uno stile leggermente diverso alla squadra
            const notiziaFinale = `<span class="highlight">${squadraScelta}</span>, ${testoAzione}`;

            // 4. Aggiornamento del DOM con effetto transizione
            const newsBox = document.getElementById('news-box');
            const newsContent = document.getElementById('news-content');

            // Nascondiamo un attimo il box per l'effetto cambio
            newsBox.classList.remove('show');

            setTimeout(() => {
                newsContent.innerHTML = notiziaFinale;
                newsBox.classList.add('show');
            }, 150); 
        }

        // Collegiamo la funzione al click del pulsante
        document.getElementById('btn-genera').addEventListener('click', generaNews);
    </script>

</body>
</html>
