// ==========================================================================
// GENERA js/risorse/font-cartelle.js DAI FILE .ttf IN fonts/
// I font vengono salvati come testo (base64) dentro un file .js perché:
// - aprendo index.html da file locale il browser non lascia leggere i .ttf;
// - jsPDF vuole i dati del font per inserirlo nel PDF.
// Da rilanciare solo quando si aggiunge o cambia un font:
//   node strumenti/genera-font-cartelle.js
// ==========================================================================

const fs = require("fs");
const path = require("path");

const radice = path.join(__dirname, "..");
const cartellaFont = path.join(radice, "fonts");
const destinazione = path.join(radice, "js", "risorse", "font-cartelle.js");

const file = fs.readdirSync(cartellaFont).filter(f => f.toLowerCase().endsWith(".ttf")).sort();

const righe = [
    "// File generato da strumenti/genera-font-cartelle.js: non modificarlo a mano.",
    "// Font delle cartelle in base64 (funzionano anche offline e finiscono nei PDF).",
    "// Licenze dei font: fonts/LICENZE-FONT.txt",
    "const DATI_FONT_CARTELLE = {"
];
file.forEach((nome, i) => {
    const dati = fs.readFileSync(path.join(cartellaFont, nome)).toString("base64");
    righe.push(`    "${nome}": "${dati}"${i < file.length - 1 ? "," : ""}`);
});
righe.push("};", "");

fs.mkdirSync(path.dirname(destinazione), { recursive: true });
fs.writeFileSync(destinazione, righe.join("\n"));
console.log(`Scritto ${path.relative(radice, destinazione)} con ${file.length} font: ${file.join(", ")}`);
