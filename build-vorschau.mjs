#!/usr/bin/env node
/**
 * Die Auslieferungs-Oberflächen — getrennt vom Seitengenerator.
 * ---------------------------------------------------------------------------
 * `build.mjs` baut die WEBSITE (das Produkt). Dieses Skript baut den RAHMEN,
 * in dem die Kundschaft das Produkt anschaut und begleitet:
 *
 *   docs/vorschau/index.html     Die Vorschau-Zentrale — die Haupt-Adresse.
 *                                Website, Verwaltung, Offerte und der Weg zu
 *                                AGB und Freigabe an EINER Adresse.
 *   docs/verwaltung/index.html   Die Verwaltungsansicht als eigene Seite. Sie
 *                                ist kein geheimer Adminbereich: Sie zeigt
 *                                Stand, Inhalte, Änderungen und Freigabe —
 *                                und ausdrücklich keine Zugangsdaten.
 *
 * Beide entstehen aus `src/data/projekt.json` und verlinken aufeinander.
 * Getrennt gehalten, damit der Seitengenerator die Website bleibt und dieser
 * Rahmen ihn nicht anfasst.
 *
 *   node build-vorschau.mjs        (läuft nach build.mjs)
 */
import { readFile, writeFile, mkdir, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));
const SRC = path.join(root, 'src');
const OUT = path.join(root, 'docs');

const projekt = JSON.parse(await readFile(path.join(SRC, 'data', 'projekt.json'), 'utf8'));
const site = JSON.parse(await readFile(path.join(SRC, 'data', 'site.json'), 'utf8'));

const esc = (s = '') =>
  String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const datum = (iso) => {
  if (!iso) return '';
  const [y, m, t] = String(iso).split('-');
  return t && m && y ? `${t}.${m}.${y}` : String(iso);
};

/* Kopf und Fuss teilen sich beide Seiten — gleiche Schrift, gleiche Farben,
   damit Zentrale und Verwaltung erkennbar zusammengehören. */
function huelle({ titel, bodyClass, body, dataProjekt = '' }) {
  return `<!doctype html>
<html lang="de-CH">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(titel)}</title>
<meta name="description" content="Vorschau und Verwaltung zum Website-Projekt ${esc(projekt.projekt)}.">
<!-- Eine Vorschau gehört nicht in den Suchindex: Sie ist für genau eine
     Kundschaft bestimmt, nicht für die Öffentlichkeit. -->
<meta name="robots" content="noindex, nofollow, noarchive">
<link rel="icon" href="/assets/img/favicon.svg" type="image/svg+xml">
<link rel="stylesheet" href="/assets/css/vorschau.css">
</head>
<body class="${esc(bodyClass)}"${dataProjekt ? ` data-projekt="${esc(dataProjekt)}"` : ''}>
${body}
</body>
</html>
`;
}

/* ── Bausteine ───────────────────────────────────────────────────────────── */

function aenderungsEintrag(a) {
  const standKlasse = a.stand === 'umgesetzt' ? 'stand--umgesetzt' : 'stand--offen';
  return `      <li class="eintrag" data-bereich="${esc(a.bereich)}">
        <div class="eintrag__kopf">
          <span class="stand ${standKlasse}">${esc(a.stand)}</span>
          <span class="eintrag__titel">${esc(a.titel)}</span>
        </div>
        <p class="eintrag__detail">${esc(a.detail)}</p>
        <p class="eintrag__detail"><span class="marker">${esc(a.bereich === 'verwaltung' ? 'Verwaltung' : 'Website')}</span>
          <span class="marker">${esc(a.quelle)}</span>${a.datum ? `\n          <span class="marker">${esc(datum(a.datum))}</span>` : ''}</p>
      </li>`;
}

function offerteTafel() {
  const o = projekt.offerte;
  const zeilen = o.positionen
    .map((p) => `        <li><b>${esc(p.leistung)}</b><span>${esc(p.umfang)}</span></li>`)
    .join('\n');
  return `    <section class="tafel" data-ansicht="offerte" hidden>
      <div class="karte">
        <h2>Leistungsübersicht · ${esc(o.titel)}</h2>
        <p class="mini">Für ${esc(projekt.kunde)}</p>
        <div class="hinweis"><b>Unverbindlich.</b> ${esc(o.hinweis)}</div>
        <p class="kosten">${esc(o.kostenStand)}</p>
        <h3>Was dazugehört</h3>
        <ul class="liste">
${zeilen}
        </ul>
      </div>
      <div class="karte">
        <h3>Wie es weitergeht</h3>
        <ul class="liste">
${projekt.freigabe.map((f) => `          <li><b>${esc(f.schritt)}</b><span>${esc(f.text)}</span></li>`).join('\n')}
        </ul>
      </div>
    </section>`;
}

function agbTafel() {
  const k = projekt.kundenbereich;
  return `    <section class="tafel" data-ansicht="agb" hidden>
      <div class="karte">
        <h2>AGB, Vertrag und Freigabe</h2>
        <p>${esc(k.hinweis)}</p>
        <p><a class="knopf knopf--stark" href="${esc(k.url)}" target="_blank" rel="noopener noreferrer">${esc(k.anbieter)} öffnen</a></p>
        <h3>Was dort steht</h3>
        <ul class="liste">
          <li><b>Standard-AGB</b><span>Die zentrale Fassung, auf jedem Kundenlink dieselbe — nicht projektweise anpassbar.</span></li>
          <li><b>Vertrag</b><span>Der Projektauftrag zum Nachlesen und Ausdrucken, sobald er freigegeben ist.</span></li>
          <li><b>Offerte</b><span>Die verbindliche Offerte, sobald sie versendet ist. Die Übersicht hier ist keine.</span></li>
          <li><b>Änderungswünsche</b><span>Der offizielle Weg — jeder Wunsch landet direkt an Ihrem Vorhaben.</span></li>
        </ul>
        <p class="mini">Diese Vorschau-Zentrale zeigt den Stand der Arbeit. Verbindlich ist, was auf
          Ihrem Kundenlink steht.</p>
      </div>
    </section>`;
}

/* ── Die Vorschau-Zentrale ───────────────────────────────────────────────── */

function zentrale() {
  const w = projekt.ansichten.website;
  const v = projekt.ansichten.verwaltung;

  const body = `<header class="leiste">
  <div class="leiste__reihe">
    <div class="marke">
      <span class="marke__name">${esc(projekt.projekt)}</span>
      <span class="abzeichen">${esc(projekt.stand)}</span>
      <span class="marke__kunde">${esc(projekt.kunde)}</span>
    </div>
  </div>
  <div class="leiste__reihe" style="padding-top:0">
    <div class="schalter" role="tablist" aria-label="Ansicht wählen">
      <button class="schalter__knopf" type="button" role="tab" data-ansicht="website" aria-selected="true">Website</button>
      <button class="schalter__knopf" type="button" role="tab" data-ansicht="verwaltung" aria-selected="false">Verwaltung</button>
      <button class="schalter__knopf" type="button" role="tab" data-ansicht="offerte" aria-selected="false">Offerte</button>
      <button class="schalter__knopf" type="button" role="tab" data-ansicht="agb" aria-selected="false">AGB &amp; Kunde</button>
    </div>
    <div class="werkzeuge">
      <button class="knopf" type="button" id="handy" aria-pressed="false">📱 Handyansicht</button>
      <button class="knopf" type="button" id="neuLaden">↻ Neu laden</button>
      <a class="knopf knopf--stark" href="#wunsch" id="zumWunsch">✎ Änderungswunsch</a>
    </div>
  </div>
</header>

<main class="buehne">
  <div class="haupt">
    <p class="rahmenhinweis" id="rahmenHinweis">${esc(w.hinweis)}</p>
    <div class="rahmenfeld" id="rahmenFeld" data-geraet="desktop">
      <iframe class="rahmen" id="rahmen" title="Vorschau der Website"
              src="${esc(w.pfad)}"
              data-website="${esc(w.pfad)}"
              data-verwaltung="${esc(v.pfad)}"
              data-website-hinweis="${esc(w.hinweis)}"
              data-verwaltung-hinweis="${esc(v.hinweis)}"></iframe>
    </div>
${offerteTafel()}
${agbTafel()}
  </div>

  <aside class="spalte" aria-label="Änderungen">
    <div class="spalte__kopf">
      <h2>Änderungen</h2>
      <p class="mini" id="zaehler">${projekt.aenderungen.length} Einträge</p>
      <div class="filter" role="group" aria-label="Nach Bereich filtern">
        <button class="filter__knopf" type="button" data-filter="alle" aria-pressed="true">Alle</button>
        <button class="filter__knopf" type="button" data-filter="website" aria-pressed="false">Website</button>
        <button class="filter__knopf" type="button" data-filter="verwaltung" aria-pressed="false">Verwaltung</button>
      </div>
    </div>
    <ul class="spalte__liste">
${projekt.aenderungen.map(aenderungsEintrag).join('\n')}
    </ul>
    <div class="spalte__fuss">
      <label for="wunsch"><b>Etwas soll anders sein?</b></label>
      <p class="mini" style="margin:4px 0 7px">Kurz aufschreiben, kopieren und auf Ihrem Kundenlink absenden —
        dort geht der Wunsch an Ihr Vorhaben. Diese Seite verschickt selbst nichts.</p>
      <textarea class="feld" id="wunsch" maxlength="1500"
                placeholder="Zum Beispiel: Auf der Startseite bitte ein anderes Bild."></textarea>
      <button class="knopf knopf--voll" type="button" id="wunschKopieren">In die Zwischenablage kopieren</button>
      <a class="knopf knopf--voll knopf--leise" href="${esc(projekt.kundenbereich.url)}"
         target="_blank" rel="noopener noreferrer">Kundenlink öffnen und absenden</a>
      <p class="rueckmeldung" id="wunschStatus" role="status" aria-live="polite"></p>
    </div>
  </aside>
</main>

<script src="/assets/js/vorschau.js"></script>`;

  return huelle({
    titel: `Vorschau · ${projekt.projekt}`,
    bodyClass: 'zentrale',
    dataProjekt: projekt.projekt,
    body
  });
}

/* ── Die Verwaltung ──────────────────────────────────────────────────────── */

function verwaltung() {
  const seiten = projekt.seiten
    .map(
      (s) => `        <li><b><a href="${esc(s.pfad)}" target="_blank" rel="noopener">${esc(s.titel)}</a></b>
          <span>${esc(s.zweck)} · <span class="stand stand--umgesetzt">${esc(s.stand)}</span></span></li>`
    )
    .join('\n');

  const offen = projekt.aenderungen.filter((a) => a.stand === 'offen');
  const umgesetzt = projekt.aenderungen.filter((a) => a.stand === 'umgesetzt');

  const wuensche = projekt.aenderungen
    .map(
      (a) => `        <li><b>${esc(a.titel)}</b>
          <span>${esc(a.detail)}<br>
          <span class="stand ${a.stand === 'umgesetzt' ? 'stand--umgesetzt' : 'stand--offen'}">${esc(a.stand)}</span>
          <span class="marker">${esc(a.bereich === 'verwaltung' ? 'Verwaltung' : 'Website')}</span>
          <span class="marker">${esc(a.quelle)}</span>${a.datum ? ` <span class="marker">${esc(datum(a.datum))}</span>` : ''}</span></li>`
    )
    .join('\n');

  const schritte = projekt.freigabe
    .map(
      (f) => `        <li><b>${esc(f.schritt)}</b><span>${esc(f.text)}
          <br><span class="stand ${f.stand === 'laufend' ? 'stand--umgesetzt' : 'stand--offen'}">${esc(f.stand)}</span></span></li>`
    )
    .join('\n');

  const hinweise = projekt.naechsteAenderung.map((h) => `          <li>${esc(h)}</li>`).join('\n');

  const body = `<header class="leiste">
  <div class="leiste__reihe">
    <div class="marke">
      <span class="marke__name">${esc(projekt.projekt)}</span>
      <span class="abzeichen">Verwaltung</span>
      <span class="marke__kunde">${esc(projekt.kunde)}</span>
    </div>
    <div class="werkzeuge">
      <a class="knopf" href="/vorschau/">← Zur Vorschau-Zentrale</a>
      <a class="knopf knopf--stark" href="/" target="_blank" rel="noopener">Website ansehen</a>
    </div>
  </div>
</header>

<main class="seite">
  <h1>Verwaltung Ihres Website-Projekts</h1>
  <p class="mini">Diese Ansicht gehört zur Vorschau und ist kein geheimer Adminbereich. Sie zeigt den
    Stand der Arbeit — <b>keine Zugangsdaten, keine Passwörter</b>, und sie löst nichts aus:
    Es wird von hier weder etwas versendet noch verrechnet.</p>

  <div class="gitter" style="margin-top:16px">
    <section class="karte">
      <h2>Website-Status</h2>
      <p class="kennzahl"><strong>${projekt.seiten.length}</strong> <span class="mini">Seiten aufgebaut</span></p>
      <div class="reihe"><span>Stand</span><b>${esc(projekt.stand)}</b></div>
      <div class="reihe"><span>Umgesetzt</span><b>${umgesetzt.length}</b></div>
      <div class="reihe"><span>Offen</span><b>${offen.length}</b></div>
      <div class="reihe"><span>Öffentlich erreichbar</span><b>nein — nur über diesen Link</b></div>
      <div class="reihe"><span>Bestehende Seite</span><b>unverändert online</b></div>
    </section>

    <section class="karte">
      <h2>Veröffentlichte Vorschau</h2>
      <p class="mini">Diese drei Adressen gehören zusammen. Die erste ist die, die Sie brauchen.</p>
      <p><b>Vorschau-Zentrale</b><a class="adresse" href="/vorschau/">/vorschau/</a></p>
      <p><b>Website</b><a class="adresse" href="/">/</a></p>
      <p><b>Verwaltung</b><a class="adresse" href="/verwaltung/">/verwaltung/</a></p>
      <p class="mini">Die Adressen bleiben gleich. Bei jeder neuen Fassung steht an derselben Stelle
        der neue Stand — Sie müssen nichts Neues merken.</p>
    </section>

    <section class="karte">
      <h2>Kontakt und Freigabe</h2>
      <ul class="liste">
${schritte}
      </ul>
      <p class="mini">Der offizielle Weg für Wünsche und die Freigabe läuft über Ihren
        ${esc(projekt.kundenbereich.anbieter)}-Kundenlink.</p>
      <p><a class="knopf knopf--stark" href="${esc(projekt.kundenbereich.url)}" target="_blank" rel="noopener noreferrer">Kundenlink öffnen</a></p>
    </section>
  </div>

  <section class="karte" style="margin-top:14px;max-width:none">
    <h2>Inhalte und Seiten</h2>
    <p class="mini">Jede Seite einzeln erreichbar — so sehen Sie genau, was gebaut ist.</p>
    <ul class="liste">
${seiten}
    </ul>
  </section>

  <section class="karte" style="max-width:none">
    <h2>Änderungswünsche</h2>
    <p class="mini">Was gemacht wurde und was noch offen ist — dieselbe Liste wie in der
      Änderungsleiste der Vorschau-Zentrale.</p>
    <ul class="liste">
${wuensche}
    </ul>
  </section>

  <section class="karte" style="max-width:none">
    <h2>Hinweise zur nächsten Änderung</h2>
    <ul>
${hinweise}
    </ul>
    <p class="mini">Die Seite ist bewusst ohne Baukasten gebaut: Änderungen macht FlowerTech für Sie,
      dafür bleibt die Seite schnell, schlank und ohne fremde Dienste.</p>
  </section>
</main>`;

  return huelle({ titel: `Verwaltung · ${projekt.projekt}`, bodyClass: 'verwaltungsseite', body });
}

/* ── Der Vorschau-Streifen auf der Website ───────────────────────────────
 * Die Website muss zurück zur Zentrale und zur Verwaltung führen — sonst ist
 * sie eine Sackgasse. Der Streifen gehört aber AUSDRÜCKLICH zur Vorschau und
 * nicht zum Produkt: Er wird hier nachträglich in die gebauten Seiten gelegt,
 * nicht in die Quellen. Geht die Seite später live, fällt er mit diesem
 * Schritt weg, ohne dass an der Website etwas zu ändern wäre.
 *
 * Im Rahmenfenster der Zentrale blendet er sich selbst aus: Dort steht die
 * dunkle Leiste schon darüber, zweimal dasselbe wäre nur im Weg.
 */
const STREIFEN = `<div id="vorschauStreifen" hidden>
  <span><b>Vorschau</b> · Website</span>
  <span class="vs-sp"></span>
  <a href="/vorschau/">Vorschau-Zentrale</a>
  <a href="/verwaltung/">Verwaltung</a>
</div>
<style>
#vorschauStreifen{position:fixed;left:0;right:0;bottom:0;z-index:9999;display:flex;
  align-items:center;gap:12px;padding:8px 14px;background:#1c2530;color:#f5f7fa;
  font:600 13px/1 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Arial,sans-serif;
  box-shadow:0 -2px 12px rgba(0,0,0,.22)}
/* Muss ausdrücklich dastehen: Die ID-Regel oben schlägt sonst das
   hidden-Attribut, und der Streifen stünde auch im Rahmenfenster der
   Zentrale — dort, wo die dunkle Leiste schon darüber liegt. */
#vorschauStreifen[hidden]{display:none}
#vorschauStreifen .vs-sp{flex:1 1 auto}
#vorschauStreifen a{color:#fff;background:#47586a;border-radius:7px;padding:7px 11px;
  text-decoration:none}
#vorschauStreifen a:hover{background:#6f8599}
@media print{#vorschauStreifen{display:none}}
</style>
<script>
(function(){
  // Nur ausserhalb des Rahmenfensters — in der Zentrale gibt es die Leiste schon.
  try { if (window.self !== window.top) return; } catch (e) { return; }
  var s = document.getElementById('vorschauStreifen');
  if (!s) return;
  s.hidden = false;
  // Platz schaffen, damit der Streifen nichts am Seitenende verdeckt.
  document.body.style.paddingBottom = '52px';
})();
</script>`;

async function streifenEinbauen() {
  const dateien = (await readdir(OUT)).filter((f) => f.endsWith('.html'));
  let gezaehlt = 0;
  for (const datei of dateien) {
    const p = path.join(OUT, datei);
    const html = await readFile(p, 'utf8');
    if (html.includes('id="vorschauStreifen"') || !html.includes('</body>')) continue;
    await writeFile(p, html.replace('</body>', `${STREIFEN}\n</body>`), 'utf8');
    gezaehlt += 1;
  }
  return gezaehlt;
}

/* ── Schreiben ───────────────────────────────────────────────────────────── */

await mkdir(path.join(OUT, 'vorschau'), { recursive: true });
await mkdir(path.join(OUT, 'verwaltung'), { recursive: true });
await writeFile(path.join(OUT, 'vorschau', 'index.html'), zentrale(), 'utf8');
await writeFile(path.join(OUT, 'verwaltung', 'index.html'), verwaltung(), 'utf8');
const mitStreifen = await streifenEinbauen();

console.log('✓ Vorschau-Zentrale und Verwaltung erzeugt');
console.log(`  /vorschau/  /verwaltung/  ·  ${projekt.seiten.length} Seiten, ${projekt.aenderungen.length} Änderungseinträge`);
console.log(`  Vorschau-Streifen in ${mitStreifen} Website-Seiten eingebaut`);
