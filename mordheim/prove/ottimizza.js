// Prova dell'ottimizzatore da riga di comando, senza browser.
// Uso (dalla cartella del repo):
//   node mordheim/prove/ottimizza.js [bande] [obiettivo] [bersaglio] [corone]
//   bande: id separati da virgola (vuoto o "tutte" = tutte), obiettivo: duelli|massa|attacco,
//   bersaglio: id di dati/bersagli.js (predefinito umano), corone: predefinite quelle della banda
// Esempio: node mordheim/prove/ottimizza.js skaven,posseduti duelli umano
const fs = require('fs'), vm = require('vm'), path = require('path');

const radice = path.join(__dirname, '..');
const [bandeArg = '', obiettivo = 'duelli', bersaglio = 'umano', coroneArg] = process.argv.slice(2);
const contesto = { console, setTimeout, localStorage: { getItem: () => null, setItem() {} } };
vm.createContext(contesto);
const esegui = file => vm.runInContext(fs.readFileSync(path.join(radice, file), 'utf8'), contesto, { filename: file });

['js/dati.js', 'js/motore.js', 'js/banda.js', 'js/ottimizzatore.js'].forEach(esegui);
['regole', 'equipaggiamento', 'bersagli', 'bande/indice'].forEach(f => esegui('dati/' + f + '.js'));
vm.runInContext('datiRegistrati.indice.bande.map(b => b.file)', contesto).forEach(f => esegui('dati/bande/' + f));
vm.runInContext('applicaDati(); impostaDatiMotore(Dati.regole, Dati.equip);', contesto);

contesto.argomenti = { bande: bandeArg && bandeArg !== 'tutte' ? bandeArg.split(',') : [], obiettivo, bersaglio, corone: Number(coroneArg) || 0 };
vm.runInContext(`(async () => {
    const ids = argomenti.bande.length ? argomenti.bande : Dati.indice.map(b => b.id);
    const d = Dati.bersagli.find(b => b.id === argomenti.bersaglio);
    for (const id of ids) {
        const banda = Dati.bande[id];
        const bers = { ...modelloPerMotore(d, d.equip), nome: d.nome };
        const corone = argomenti.corone || banda.corone;
        const proposte = await ottimizzaBanda(banda, bers, { corone, obiettivo: argomenti.obiettivo, pesoTiro: 0.5, pesoCampagna: 0, turno: 'media' });
        console.log('== ' + banda.nome + ' (' + corone + ' corone, massimo ' + banda.maxModelli + ' modelli)');
        for (const p of proposte) {
            console.log('  ' + p.modelli + ' modelli, ' + p.costo + ' corone, attacco ' + p.attacco.toFixed(2)
                + ', resistenza ' + p.resistenza.toFixed(1) + ', indice ' + p.indice.toFixed(2));
            console.log('     ' + p.unita.map(u => u.numero + ' ' + u.tipoId + (u.equip.length ? ' [' + u.equip.join(', ') + ']' : '')).join(' · '));
        }
    }
})()`, contesto);
