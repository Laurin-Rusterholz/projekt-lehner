#!/usr/bin/env node
/*
 * Prüft das Build-Ergebnis, bevor es veröffentlicht wird.
 * ---------------------------------------------------------------------------
 * Anlass: /vorschau/ lieferte live 404, während die Startseite lief. Ein
 * Deploy, dem die Vorschau-Zentrale fehlt, sieht im Netlify-Log aus wie ein
 * geglückter — er ist grün, nur eben unvollständig. Das darf nicht mehr
 * unbemerkt durchgehen.
 *
 * Läuft am Ende des Netlify-Builds. Fehlt etwas, bricht der Build MIT Meldung
 * ab: Dann bleibt zwar der alte Stand online, aber im Log steht schwarz auf
 * weiss, was gefehlt hat — statt dass eine halbe Veröffentlichung durchrutscht.
 *
 *   node scripts/pruefe-ausgabe.mjs
 */
import { readFile, access } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const OUT = path.join(path.dirname(path.dirname(fileURLToPath(import.meta.url))), 'docs');

// Denselben Basispfad wie der Build: Unter GitHub Pages liegt alles in einem
// Unterverzeichnis, die erwarteten Verweise verschieben sich mit.
const BASIS = String(process.env.BASIS_PFAD || '').replace(/\/+$/, '');

const da = async (p) => { try { await access(path.join(OUT, p)); return true; } catch { return false; } };

// Was nach dem Bauen dastehen MUSS, damit die Rückgabe an die Kundschaft hält.
const PFLICHT = [
  'index.html',
  'vorschau/index.html',
  'verwaltung/index.html',
  'vorschau.html',
  'verwaltung.html',
  'assets/css/vorschau.css',
  'assets/js/vorschau.js',
  'assets/css/style.css',
  '404.html'
];

// Und was inhaltlich dastehen muss — eine leere Datei am richtigen Ort
// wäre auch nur eine andere Art von 404.
const INHALT = [
  ['vorschau/index.html', /data-ansicht="verwaltung"/, 'der Umschalter zur Verwaltung'],
  ['vorschau/index.html', /id="rahmen"/, 'das Vorschaufenster'],
  ['vorschau/index.html', /Kosten noch offen/, 'der Kostenstand auf der Offerte'],
  ['vorschau/index.html', /data-ansicht="agb"/, 'die AGB-Ansicht'],
  ['vorschau/index.html', /filter__knopf/, 'die Filter der Änderungsleiste'],
  ['verwaltung/index.html', /Website-Status/, 'der Website-Status in der Verwaltung'],
  ['verwaltung/index.html', new RegExp(`href="${BASIS}/vorschau/"`), 'der Weg zurück zur Zentrale'],
  ['index.html', /vorschauStreifen/, 'der Vorschau-Streifen auf der Website'],
  // Der Kundenlink muss der projektspezifische sein — mit Einladungstoken.
  ['vorschau/index.html', /fragebogen\.html\?e=[A-Za-z0-9_-]{24,64}/, 'der projektspezifische Kundenlink'],
  ['verwaltung/index.html', /fragebogen\.html\?e=[A-Za-z0-9_-]{24,64}/, 'der projektspezifische Kundenlink']
];

const fehler = [];

for (const p of PFLICHT) {
  if (!(await da(p))) fehler.push(`Datei fehlt: docs/${p}`);
}

for (const [datei, muster, was] of INHALT) {
  if (!(await da(datei))) continue; // schon oben gemeldet
  const html = await readFile(path.join(OUT, datei), 'utf8');
  if (!muster.test(html)) fehler.push(`In docs/${datei} fehlt ${was}`);
}

// Die Offerte darf keinen Betrag tragen — geprüft wird genau ihr Abschnitt,
// nicht die ganze Seite (in der Änderungsleiste stehen Datumsangaben).
if (await da('vorschau/index.html')) {
  const html = await readFile(path.join(OUT, 'vorschau/index.html'), 'utf8');
  const tafel = (html.match(/<section class="tafel" data-ansicht="offerte"[\s\S]*?<\/section>/) || [''])[0];
  if (!tafel) fehler.push('Die Offerte-Tafel fehlt in der Vorschau-Zentrale');
  else {
    if (/CHF|EUR|Fr\./.test(tafel)) fehler.push('Auf der Offerte steht eine Währung');
    if (/\d+[.,]\d{2}\b/.test(tafel)) fehler.push('Auf der Offerte steht ein Betrag');
  }
}

if (fehler.length) {
  console.error(`\n✗ Das Build-Ergebnis ist unvollständig — ${fehler.length} Punkt(e):`);
  fehler.forEach((f) => console.error(`  · ${f}`));
  console.error('\nEs wird NICHT veröffentlicht. Bitte den Build-Lauf oben prüfen.\n');
  process.exit(1);
}

console.log(`✓ Build-Ergebnis vollständig — ${PFLICHT.length} Dateien, ${INHALT.length} Inhaltsproben.`);
console.log('  /  ·  /vorschau/  ·  /verwaltung/');
