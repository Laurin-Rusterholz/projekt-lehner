#!/usr/bin/env node
/*
 * Abnahme der Vorschau-Zentrale — im echten Browser, gegen den echten Build.
 * ---------------------------------------------------------------------------
 * Geprüft wird genau das, was die Kundschaft sehen soll:
 *
 *   1. Die Zentrale steht: dunkle Leiste, Projektname, Umschalter, Werkzeuge.
 *   2. Website-Ansicht — die WIRKLICHE Seite im Rahmenfenster, nicht ein Bild.
 *   3. Verwaltung-Ansicht mit allen verlangten Blöcken.
 *   4. Offerte — mit „Kosten noch offen" und ohne jeden erfundenen Betrag.
 *   5. AGB und Kundenbereich klar erreichbar.
 *   6. Änderungsleiste samt Filtern Alle / Website / Verwaltung.
 *   7. Frontend und Verwaltung verlinken aufeinander.
 *   8. Keine Zugangsdaten, kein Mail- oder Zahlungsablauf.
 *
 * Aufruf (Server läuft bereits auf $BASIS, sonst http://127.0.0.1:4173):
 *
 *   BASIS=http://127.0.0.1:4173 node tests/abnahme.mjs
 *
 * Playwright wird nur zum Prüfen gebraucht, nicht zum Bauen — deshalb steht es
 * bewusst NICHT in package.json: Der Netlify-Build soll schlank bleiben.
 */
import { chromium } from 'playwright';

const BASIS = process.env.BASIS || 'http://127.0.0.1:4173';
const CHROME = process.env.CHROME_PFAD || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';

let geprueft = 0;
const fehler = [];
const ok = (bedingung, text) => {
  geprueft += 1;
  if (!bedingung) fehler.push(text);
};

const browser = await chromium.launch(CHROME ? { executablePath: CHROME } : {});
const seite = await browser.newPage({ viewport: { width: 1400, height: 900 } });

// Konsolenfehler der Seite zählen mit: Eine Vorschau, die in der Konsole
// schreit, ist nicht abgenommen.
const konsole = [];
seite.on('console', (m) => { if (m.type() === 'error') konsole.push(m.text()); });
seite.on('pageerror', (e) => konsole.push(String(e.message)));

/* ── 1. Die Zentrale ─────────────────────────────────────────────────────── */

await seite.goto(`${BASIS}/vorschau/`, { waitUntil: 'networkidle' });

ok(/Vorschau/.test(await seite.title()), 'Der Seitentitel nennt die Vorschau nicht');
ok(await seite.locator('.leiste').isVisible(), 'Die obere Leiste fehlt');

const leisteFarbe = await seite.locator('.leiste').evaluate((n) => getComputedStyle(n).backgroundColor);
ok(leisteFarbe === 'rgb(28, 37, 48)', `Die obere Leiste ist nicht dunkel: ${leisteFarbe}`);

ok((await seite.locator('.marke__name').innerText()).includes('Brumag'),
  'Der Projektname steht nicht in der Leiste');

for (const label of ['Website', 'Verwaltung', 'Offerte', 'AGB & Kunde']) {
  ok(await seite.locator(`.schalter__knopf:has-text("${label}")`).count() === 1,
    `Der Umschalter „${label}" fehlt`);
}
ok(await seite.locator('#handy').isVisible(), 'Die Handyansicht fehlt');
ok(await seite.locator('#neuLaden').isVisible(), '„Neu laden" fehlt');
ok(await seite.locator('#zumWunsch').isVisible(), 'Die Aktion „Änderungswunsch" fehlt');

/* ── 2. Website-Ansicht: die wirkliche Seite ─────────────────────────────── */

ok(await seite.locator('#rahmen').isVisible(), 'Das Vorschaufenster fehlt');
const kasten = await seite.locator('#rahmen').boundingBox();
ok(kasten && kasten.width > 600 && kasten.height > 400,
  `Die Vorschau ist nicht der grosse Hauptbereich: ${JSON.stringify(kasten)}`);

const rahmen = seite.frameLocator('#rahmen');
await rahmen.locator('body').waitFor({ timeout: 15000 });
const imRahmen = await rahmen.locator('body').innerText();
ok(/Brumag/i.test(imRahmen), 'Im Vorschaufenster steht nicht die Website');
ok(/Britisch Kurzhaar/i.test(imRahmen), 'Der Inhalt der Website fehlt im Vorschaufenster');

// Im Rahmenfenster gehört der Vorschau-Streifen NICHT hin: Die dunkle Leiste
// der Zentrale steht schon darüber, zweimal dasselbe verdeckt nur die Seite.
ok(!(await rahmen.locator('#vorschauStreifen').isVisible()),
  'Der Vorschau-Streifen steht doppelt — auch im Rahmenfenster der Zentrale');

// Handyansicht schaltet die Breite wirklich um.
await seite.locator('#handy').click();
await seite.waitForTimeout(150);
const schmal = await seite.locator('#rahmen').boundingBox();
ok(schmal && schmal.width < 420, `Die Handyansicht ändert die Breite nicht: ${schmal && schmal.width}`);
await seite.locator('#handy').click();

/* ── 3. Verwaltung-Ansicht ───────────────────────────────────────────────── */

await seite.locator('.schalter__knopf:has-text("Verwaltung")').click();
await seite.waitForTimeout(400);
const vwRahmen = seite.frameLocator('#rahmen');
await vwRahmen.locator('h1').waitFor({ timeout: 15000 });
const vwText = await vwRahmen.locator('body').innerText();

for (const block of [
  'Website-Status', 'Veröffentlichte Vorschau', 'Änderungswünsche',
  'Inhalte und Seiten', 'Kontakt und Freigabe', 'Hinweise zur nächsten Änderung'
]) {
  ok(vwText.includes(block), `Der Verwaltungsblock „${block}" fehlt`);
}
ok(/Verwaltung/.test(vwText), 'Die Verwaltung ist nicht als solche bezeichnet');

/* ── 4. Offerte: Kosten offen, kein erfundener Betrag ────────────────────── */

await seite.locator('.schalter__knopf:has-text("Offerte")').click();
await seite.waitForTimeout(200);
const offerte = seite.locator('.tafel[data-ansicht="offerte"]');
ok(await offerte.isVisible(), 'Die Offerte-Ansicht öffnet nicht');
const offerteText = await offerte.innerText();
ok(/Kosten noch offen/.test(offerteText), 'Auf der Offerte fehlt „Kosten noch offen"');
ok(/[Uu]nverbindlich/.test(offerteText), 'Die Offerte ist nicht als unverbindlich gekennzeichnet');
ok(!/CHF|EUR|Fr\./.test(offerteText), 'Auf der Offerte steht eine Währung');
ok(!/\d+[.,]\d{2}\b/.test(offerteText), 'Auf der Offerte steht ein Betrag');
ok(/Leistung|Umfang|dazugehört/i.test(offerteText), 'Die Offerte nennt den Leistungsumfang nicht');

/* ── 5. AGB und Kundenbereich ────────────────────────────────────────────── */

await seite.locator('.schalter__knopf:has-text("AGB & Kunde")').click();
await seite.waitForTimeout(200);
const agb = seite.locator('.tafel[data-ansicht="agb"]');
ok(await agb.isVisible(), 'Die AGB-Ansicht öffnet nicht');
const agbText = await agb.innerText();
ok(/AGB/.test(agbText), 'Die AGB werden nicht genannt');
ok(await agb.locator('a[href*="flowertech.ch"]').count() > 0,
  'Es fehlt der Weg zum Kundenbereich');

/* ── 6. Änderungsleiste mit Filtern ──────────────────────────────────────── */

await seite.locator('.schalter__knopf:has-text("Website")').first().click();
await seite.waitForTimeout(150);

ok(await seite.locator('.spalte').isVisible(), 'Die Änderungsleiste fehlt');
for (const f of ['Alle', 'Website', 'Verwaltung']) {
  ok(await seite.locator(`.filter__knopf:has-text("${f}")`).count() === 1, `Der Filter „${f}" fehlt`);
}

const sichtbare = async () => seite.locator('.eintrag:not([hidden])').count();
const alle = await sichtbare();
ok(alle > 0, 'Die Änderungsleiste ist leer');

await seite.locator('.filter__knopf:has-text("Verwaltung")').click();
await seite.waitForTimeout(120);
const nurVw = await sichtbare();
ok(nurVw > 0 && nurVw < alle, `Der Filter „Verwaltung" wirkt nicht: ${nurVw} von ${alle}`);

await seite.locator('.filter__knopf:has-text("Website")').nth(0).click();
await seite.waitForTimeout(120);
const nurWeb = await sichtbare();
ok(nurWeb > 0 && nurWeb + nurVw === alle, `Der Filter „Website" wirkt nicht: ${nurWeb} + ${nurVw} ≠ ${alle}`);

await seite.locator('.filter__knopf:has-text("Alle")').click();
await seite.waitForTimeout(120);
ok(await sichtbare() === alle, 'Der Filter „Alle" zeigt nicht wieder alles');

// Jeder Eintrag trägt einen nachvollziehbaren Stand.
const staende = await seite.locator('.eintrag .stand').allInnerTexts();
ok(staende.length === alle, 'Nicht jeder Eintrag hat einen Stand');
ok(staende.every((s) => /umgesetzt|offen/.test(s)), `Unklarer Stand: ${staende.join(', ')}`);

/* ── 7. Änderungswunsch: ehrlich, ohne Versand ───────────────────────────── */

await seite.locator('#zumWunsch').click();
await seite.locator('#wunsch').fill('Bitte auf der Startseite ein anderes Bild.');
await seite.context().grantPermissions(['clipboard-read', 'clipboard-write']);
await seite.locator('#wunschKopieren').click();
await seite.waitForTimeout(200);
ok((await seite.locator('#wunschStatus').innerText()).length > 0,
  'Der Änderungswunsch gibt keine Rückmeldung');
ok(await seite.locator('.spalte__fuss a[href*="flowertech.ch"]').count() > 0,
  'Der Weg zum Absenden fehlt');

/* ── 8. Verlinkung, Verwaltung als eigene Adresse, keine Geheimnisse ─────── */

await seite.goto(`${BASIS}/verwaltung/`, { waitUntil: 'networkidle' });
ok((await seite.locator('.abzeichen').innerText()).includes('Verwaltung'),
  'Die Verwaltung ist nicht als Verwaltung bezeichnet');
ok(await seite.locator('a[href="/vorschau/"]').count() > 0, 'Die Verwaltung führt nicht zur Zentrale');
ok(await seite.locator('a[href="/"]').count() > 0, 'Die Verwaltung führt nicht zur Website');

const vwGanz = await seite.locator('body').innerText();
// Geprüft wird die PREISGABE, nicht das Wort: „keine Zugangsdaten" ist genau
// die Zusage, die hier stehen soll — ein „Passwort: hunter2" wäre der Bruch.
const preisgabe = /(Passwort|Passwörter|Zugangsdaten|Kennwort|API[-\s]?Key|Token|Login|Benutzername)\s*[:=]\s*\S+/i;
ok(!preisgabe.test(vwGanz), `Die Verwaltung gibt Zugangsdaten preis: ${(vwGanz.match(preisgabe) || [])[0]}`);
ok(await seite.locator('input[type="password"]').count() === 0,
  'Die Verwaltung hat ein Passwortfeld');
ok(/keine Zugangsdaten|keine Passwörter/i.test(vwGanz),
  'Die Verwaltung sagt nicht zu, dass sie keine Zugangsdaten zeigt');
ok(await seite.locator('form').count() === 0, 'Die Verwaltung hat ein absendendes Formular');
ok(!/mailto:/.test(await seite.content()), 'Die Verwaltung löst einen Mailablauf aus');

// Die Website führt zurück — sonst ist sie eine Sackgasse.
await seite.goto(`${BASIS}/`, { waitUntil: 'networkidle' });
await seite.waitForTimeout(200);
ok(await seite.locator('#vorschauStreifen').isVisible(), 'Der Website fehlt der Vorschau-Streifen');
ok(await seite.locator('#vorschauStreifen a[href="/vorschau/"]').count() > 0,
  'Die Website führt nicht zur Vorschau-Zentrale');
ok(await seite.locator('#vorschauStreifen a[href="/verwaltung/"]').count() > 0,
  'Die Website führt nicht zur Verwaltung');
ok(/Brumag/i.test(await seite.locator('body').innerText()), 'Die Website zeigt ihren Inhalt nicht');

/* ── Schluss ─────────────────────────────────────────────────────────────── */

await browser.close();

// Die Bilder werden erst beim Netlify-Build geladen; lokal fehlen sie und das
// ist erwartet. Alles andere in der Konsole zählt.
const echteFehler = konsole.filter((m) => !/404|Failed to load resource|net::ERR/i.test(m));
ok(echteFehler.length === 0, `Fehler in der Browser-Konsole: ${echteFehler.join(' | ')}`);

if (fehler.length) {
  console.error(`\n✗ Abnahme fehlgeschlagen — ${fehler.length} von ${geprueft} Punkten:`);
  fehler.forEach((f) => console.error(`  · ${f}`));
  process.exit(1);
}

console.log(`✓ Abnahme bestanden — ${geprueft} Punkte im echten Browser geprüft.`);
console.log('  Zentrale, Website, Verwaltung, Offerte (Kosten offen), AGB, Änderungsleiste.');
