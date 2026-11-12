// ==========================================================================
// NUMERI CASUALI
// Estrazione e cartelle usano il generatore crittografico del browser
// (crypto.getRandomValues): imprevedibile e senza sbilanciamenti, cosa
// che si può dire a chi chiede se l'estrazione è "truccata".
// Funziona anche aprendo la pagina da file, senza internet.
// ==========================================================================

const RANGE_32_BIT = 0x100000000;

// Intero casuale da 0 a max-1, tutti con la stessa probabilità.
// I valori oltre l'ultimo multiplo di max si scartano: altrimenti i numeri
// piccoli uscirebbero un pochino più spesso degli altri.
function interoCasuale(max) {
    if (!window.crypto || !crypto.getRandomValues) return Math.floor(Math.random() * max);

    const limite = Math.floor(RANGE_32_BIT / max) * max;
    const valore = new Uint32Array(1);
    do {
        crypto.getRandomValues(valore);
    } while (valore[0] >= limite);
    return valore[0] % max;
}

// Mescola l'array sul posto (Fisher-Yates) e lo restituisce
function mescola(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = interoCasuale(i + 1);
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}
