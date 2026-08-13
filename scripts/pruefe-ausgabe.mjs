#!/usr/bin/env node
/*
 * Prüft das Build-Ergebnis, bevor es veröffentlicht wird.
 * ---------------------------------------------------------------------------
 * Zwei Aufgaben:
 *
 *   1. Vollständigkeit. Ein Deploy, dem Seiten fehlen, sieht im Netlify-Log
 *      aus wie ein geglückter — er ist grün, nur eben unvollständig. Fehlt
 *      etwas, bricht der Build MIT Meldung ab; der alte Stand bleibt online,
 *      aber im Log steht schwarz auf weiss, was gefehlt hat.
 *
 *   2. Trennungs-Wächter. Der Rahmen für die Kundschaft ist allein der
 *      FlowerTech-Kundenlink; dieses Repository liefert NUR die Website.
 *      Tauchen die alten Auslieferungsflächen (/vorschau/, /verwaltung/,
 *      Vorschau-Streifen) wieder auf, bricht der Build ebenfalls ab.
 *
 *   node scripts/pruefe-ausgabe.mjs
 */
import { readFile, access } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const OUT = path.join(path.dirname(path.dirname(fileURLToPath(import.meta.url))), 'docs');

const da = async (p) => { try { await access(path.join(OUT, p)); return true; } catch { return false; } };

// Was nach dem Bauen dastehen MUSS.
const PFLICHT = [
  'index.html',
  'katzen.html',
  'babies.html',
  'kontakt.html',
  '404.html',
  'assets/css/style.css',
  'assets/js/main.js',
  'assets/js/wunsch.js',
  'sitemap.xml',
  'robots.txt',
  'stand-website.txt'
];

// Und was NICHT mehr dastehen darf — die Website ist das ganze Produkt.
const VERBOTEN = [
  'vorschau/index.html',
  'verwaltung/index.html',
  'vorschau.html',
  'verwaltung.html',
  'assets/css/vorschau.css',
  'assets/js/vorschau.js',
  'stand-vorschau.txt'
];

// Inhaltsproben — eine leere Datei am richtigen Ort wäre auch nur eine
// andere Art von 404.
const INHALT = [
  ['index.html', /id="kopfzeile"/, 'die Kopfzeile der Website'],
  ['index.html', /assets\/js\/wunsch\.js/, 'der Auswahlmodus-Empfänger für den Kundenlink'],
  ['index.html', /id="hauptnavigation"/, 'die Hauptnavigation']
];

// Und was inhaltlich verschwunden bleiben muss.
const INHALT_VERBOTEN = [
  ['index.html', /vorschauStreifen/, 'der alte Vorschau-Streifen'],
  ['index.html', /<!--/, 'HTML-Kommentare (Werkstatt-Notizen) im öffentlichen Quelltext'],
  ['index.html', /Wir haben Babies!/, 'der entfernte Ankündigungs-Zettel']
];

const fehler = [];

for (const p of PFLICHT) {
  if (!(await da(p))) fehler.push(`Datei fehlt: docs/${p}`);
}

for (const p of VERBOTEN) {
  if (await da(p)) fehler.push(`Alte Auslieferungsfläche wieder da: docs/${p}`);
}

for (const [datei, muster, was] of INHALT) {
  if (!(await da(datei))) continue; // schon oben gemeldet
  const html = await readFile(path.join(OUT, datei), 'utf8');
  if (!muster.test(html)) fehler.push(`In docs/${datei} fehlt ${was}`);
}

for (const [datei, muster, was] of INHALT_VERBOTEN) {
  if (!(await da(datei))) continue;
  const html = await readFile(path.join(OUT, datei), 'utf8');
  if (muster.test(html)) fehler.push(`In docs/${datei} steht wieder: ${was}`);
}

if (fehler.length) {
  console.error(`\n✗ Das Build-Ergebnis stimmt nicht — ${fehler.length} Punkt(e):`);
  fehler.forEach((f) => console.error(`  · ${f}`));
  console.error('\nEs wird NICHT veröffentlicht. Bitte den Build-Lauf oben prüfen.\n');
  process.exit(1);
}

console.log(`✓ Build-Ergebnis vollständig — ${PFLICHT.length} Dateien, ` +
  `${INHALT.length} Inhaltsproben, Trennung gewahrt (${VERBOTEN.length} Sperren).`);
