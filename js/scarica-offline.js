// ==========================================================================
// SCARICA APP PER USO OFFLINE
// Raccoglie i file della Tombola dal sito e li impacchetta in un .zip,
// generato direttamente nel browser senza librerie esterne.
// L'elenco dei file è ricavato dagli script e dagli stili caricati da questa
// pagina, più le pagine extra indicate sotto: aggiungendo un file a
// index.html entra automaticamente anche nello zip.
// ==========================================================================

const NOME_ZIP = "tombola-offline.zip";
const CARTELLA_ZIP = "tombola/";

// File non collegati direttamente da index.html ma necessari all'app
const FILE_EXTRA = ["index.html", "istruzioni.html", "css/istruzioni.css", "fonts/LICENZE-FONT.txt"];

const TESTO_LEGGIMI = [
    "TOMBOLA - VERSIONE OFFLINE",
    "",
    "1. Estrai tutto il contenuto di questo archivio in una cartella.",
    "2. Apri il file index.html con un browser (doppio clic).",
    "",
    "Non serve connessione a internet: tabellone, generatore cartelle,",
    "PDF/PNG e controllo vincite funzionano tutti in locale.",
    "Le istruzioni complete si aprono dal pulsante \"Leggi Istruzioni\".",
    ""
].join("\r\n");

// Aperta da file locale la pagina non può leggere i propri file: il pulsante
// serve solo dalla versione online (es. GitHub Pages)
function downloadOfflineDisponibile() {
    return location.protocol === "http:" || location.protocol === "https:";
}

function elencoFileApp() {
    const percorsi = new Set(FILE_EXTRA);
    document.querySelectorAll("script[src], link[rel='stylesheet'][href]").forEach(tag => {
        const url = tag.getAttribute("src") || tag.getAttribute("href");
        // Solo file locali del sito, non risorse esterne
        if (!/^(https?:)?\/\//.test(url)) percorsi.add(url.replace(/^\.\//, ""));
    });
    return Array.from(percorsi);
}

async function scaricaAppOffline() {
    if (!downloadOfflineDisponibile()) {
        alert("Stai già usando la versione salvata sul computer: non serve scaricarla di nuovo.");
        return;
    }

    const btn = document.getElementById("btnScaricaOffline");
    const testoOriginale = btn ? btn.textContent : "";
    if (btn) {
        btn.disabled = true;
        btn.textContent = "Preparazione in corso…";
    }

    try {
        const file = [];
        for (const percorso of elencoFileApp()) {
            const risposta = await fetch(percorso, { cache: "no-cache" });
            if (!risposta.ok) throw new Error(`${percorso} (${risposta.status})`);
            file.push({ nome: CARTELLA_ZIP + percorso, dati: new Uint8Array(await risposta.arrayBuffer()) });
        }
        file.push({ nome: CARTELLA_ZIP + "LEGGIMI.txt", dati: new TextEncoder().encode(TESTO_LEGGIMI) });

        const zip = creaZip(file);
        const link = document.createElement("a");
        link.href = URL.createObjectURL(zip);
        link.download = NOME_ZIP;
        document.body.appendChild(link);
        link.click();
        link.remove();
        setTimeout(() => URL.revokeObjectURL(link.href), 10000);
    } catch (err) {
        alert(`Impossibile preparare il download: file non raggiungibile.\n${err.message}`);
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.textContent = testoOriginale;
        }
    }
}

// --------------------------------------------------------------------------
// Scrittura ZIP minimale (file memorizzati senza compressione)
// Formato: https://pkware.cachefly.net/webdocs/casestudies/APPNOTE.TXT
// --------------------------------------------------------------------------

const TABELLA_CRC32 = (() => {
    const tabella = new Uint32Array(256);
    for (let n = 0; n < 256; n++) {
        let c = n;
        for (let k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
        tabella[n] = c >>> 0;
    }
    return tabella;
})();

function crc32(dati) {
    let crc = 0xFFFFFFFF;
    for (let i = 0; i < dati.length; i++) crc = TABELLA_CRC32[(crc ^ dati[i]) & 0xFF] ^ (crc >>> 8);
    return (crc ^ 0xFFFFFFFF) >>> 0;
}

// Data e ora nel formato MS-DOS usato dagli zip
function dataOraDos(d) {
    const ora = (d.getHours() << 11) | (d.getMinutes() << 5) | Math.floor(d.getSeconds() / 2);
    const data = ((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate();
    return { ora, data };
}

function creaZip(file) {
    const encoder = new TextEncoder();
    const { ora, data } = dataOraDos(new Date());
    const parti = [];
    const centrale = [];
    let offset = 0;

    for (const f of file) {
        const nome = encoder.encode(f.nome);
        const crc = crc32(f.dati);
        const dim = f.dati.length;

        // Intestazione locale
        const locale = new DataView(new ArrayBuffer(30));
        locale.setUint32(0, 0x04034b50, true);
        locale.setUint16(4, 20, true);       // Versione necessaria
        locale.setUint16(6, 0x0800, true);   // Nomi in UTF-8
        locale.setUint16(8, 0, true);        // Nessuna compressione
        locale.setUint16(10, ora, true);
        locale.setUint16(12, data, true);
        locale.setUint32(14, crc, true);
        locale.setUint32(18, dim, true);
        locale.setUint32(22, dim, true);
        locale.setUint16(26, nome.length, true);
        locale.setUint16(28, 0, true);
        parti.push(locale, nome, f.dati);

        // Voce della directory centrale
        const voce = new DataView(new ArrayBuffer(46));
        voce.setUint32(0, 0x02014b50, true);
        voce.setUint16(4, 20, true);
        voce.setUint16(6, 20, true);
        voce.setUint16(8, 0x0800, true);
        voce.setUint16(10, 0, true);
        voce.setUint16(12, ora, true);
        voce.setUint16(14, data, true);
        voce.setUint32(16, crc, true);
        voce.setUint32(20, dim, true);
        voce.setUint32(24, dim, true);
        voce.setUint16(28, nome.length, true);
        voce.setUint32(42, offset, true);    // Posizione dell'intestazione locale
        centrale.push(voce, nome);

        offset += 30 + nome.length + dim;
    }

    const dimCentrale = centrale.reduce((tot, p) => tot + p.byteLength, 0);

    // Chiusura dell'archivio
    const fine = new DataView(new ArrayBuffer(22));
    fine.setUint32(0, 0x06054b50, true);
    fine.setUint16(8, file.length, true);
    fine.setUint16(10, file.length, true);
    fine.setUint32(12, dimCentrale, true);
    fine.setUint32(16, offset, true);

    return new Blob([...parti, ...centrale, fine], { type: "application/zip" });
}
