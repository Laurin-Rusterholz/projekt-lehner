# bkh-brumag.ch – Britisch-Kurzhaar-Zucht Brumag\*CH

Neubau der Website der Britisch-Kurzhaar-Zucht **Brumag\*CH** (Familie Lehner, 9035 Grub AR).
Statische Website ohne Datenbank, ohne CMS und ohne externe Dienste – ausliefern lässt sich das
Ergebnis auf jedem Webspace oder direkt über GitHub Pages.

---

## Schnellstart

```bash
node build.mjs          # erzeugt docs/
node scripts/serve.mjs  # Vorschau auf http://localhost:4173
```

Oder via npm: `npm run build`, `npm start`. Node ≥ 18, **keine Abhängigkeiten**.

---

## Aufbau

```
build.mjs               Generator (rund 300 Zeilen, keine Pakete)
src/
  layout.html           Rahmen: Kopf, Navigation, Fusszeile – einmal gepflegt
  pages/*.html          Inhaltsseiten mit kleinem Meta-Block
  data/site.json        Adresse, Kontakt, Navigation, Mitgliedschaften
  data/cats.json        Alle Katzen: Abstammung, Farbe, Tests, Titel
  data/media.json       Hero-Slider, aktueller Wurf, Archiv-Galerie
  assets/css|js|img/    wird 1:1 nach docs/assets/ kopiert
scripts/fetch-images.mjs  holt und optimiert die Bilder der alten Seite
scripts/serve.mjs         Vorschau-Server
docs/                   Build-Ergebnis (eingecheckt, GitHub-Pages-fähig)
```

Die Katzen-Detailseiten (`katze-*.html`), die Übersichtskarten, die Verpaarungs-Chronik, die
Galerie und die Sitemap werden **aus den Datendateien erzeugt**. Ein Geburtsdatum oder ein
Testergebnis steht also genau an einer Stelle – nicht in vier HTML-Dateien.

### Eine Seite ändern

`src/pages/*.html` bearbeiten, `node build.mjs` ausführen, fertig. Der Meta-Block oben in jeder
Datei steuert Titel, Beschreibung, aktiven Navigationspunkt und Robots-Angabe:

```html
<!--meta
title: Aktuelle Babies
description: …
nav: babies
-->
```

Im Inhalt stehen Platzhalter zur Verfügung, damit sich Kontaktdaten nicht wiederholen:
`{{email}}`, `{{phone}}`, `{{phone-href}}`, `{{litter-date}}`, `{{founded-year}}`,
`{{years-active}}`, sowie die Bausteine `{{hero}}`, `{{cats-grid}}`, `{{archive-gallery}}`,
`{{litter-image}}` und `{{pairings}}`.

### Eine neue Katze aufnehmen

Einen Eintrag in `src/data/cats.json` ergänzen und neu bauen – Detailseite, Übersichtskarte,
Sitemap und Verpaarungs-Chronik entstehen automatisch.

---

## Bilder

Die Bildpfade zeigen auf lokale, für das Web verkleinerte Dateien
(`assets/img/cats/gigi-800.jpg`, `…-800.webp` usw.). Diese Dateien sind bewusst **nicht**
eingecheckt – sie werden aus den Originalen erzeugt:

```bash
npm install --no-save sharp         # optional, aber empfohlen
node scripts/fetch-images.mjs       # lädt die Originale und skaliert sie
node build.mjs
```

Das Skript liest die Quelladressen aus `src/data/*.json`, legt die Originale unter
`src/assets/img/_originals/` ab und erzeugt daraus je Bild drei Breiten als JPEG **und** WebP.

Solange die lokalen Dateien fehlen, weicht die Seite automatisch auf die Originaladresse der
bisherigen Website aus (`data-fallback` am `<img>`); scheitert auch das, zeigt der Bildrahmen
einen ruhigen Platzhalter statt eines kaputten Bildsymbols. Die Seite ist damit zu keinem
Zeitpunkt „kaputt“ – aber erst nach dem Bildlauf wirklich schnell.

---

## Was gegenüber der alten Seite behoben wurde

| Bisher | Jetzt |
| --- | --- |
| Links-Seite mit Joomla-Fehlermeldung im Menü | entfernt; stattdessen eine `404.html`, die zurück in die Seite führt |
| Seite „Verpaarungen“ vollständig leer | erklärt die Planung (Blutgruppe, HCM, PKD, Farbgenetik) und listet die belegten Verbindungen aus den Stammbäumen |
| Startseite ohne eigenen Text | eigener Einstieg mit Vorstellung, aktuellem Wurf und Katzenübersicht |
| Hariboo: Geburtsdatum „.02.2021“ | `Februar 2021` mit korrektem `<time datetime="2021-02">` |
| Hariboo: Blutgruppe „?“ | „Bestimmung noch ausstehend“ statt eines Fragezeichens |
| Kein einziges `alt`-Attribut | jedes Inhaltsbild hat einen beschreibenden Alternativtext, reine Dekobilder sind als solche ausgezeichnet |
| Bilder bis 5760 px unskaliert geladen | `srcset` mit drei Breiten, WebP vor JPEG, `loading="lazy"`, feste Seitenverhältnisse gegen Layout-Sprünge |
| Bisherige Babies nur als Bilderreihe | Galerie mit Tastatur-bedienbarer Lightbox und Bildunterschriften |
| Kein Impressum, keine Datenschutzerklärung | beides vorhanden, mit klar markierten Stellen, die vor dem Livegang zu ergänzen sind |

Zusätzlich: Sprungmarke zum Inhalt, sichtbarer Tastaturfokus, Navigation mit `aria-current`,
Menü per `Esc` schliessbar, Dunkelmodus, Druckansicht, `prefers-reduced-motion`, Sitemap,
`robots.txt`, Open-Graph-Daten und strukturierte Daten (`LocalBusiness`) für Suchmaschinen.

---

## Kontaktformular

Ohne Backend versendet das Formular über das E-Mail-Programm der Besucherin oder des Besuchers
(`mailto:`). Wer es serverseitig verschicken möchte, trägt in `src/assets/js/main.js` oben eine
Endpunkt-URL ein:

```js
const FORM_ENDPOINT = 'https://…';   // z. B. Formspree, Basin oder eigenes PHP-Skript
```

Danach wird die Anfrage per `fetch` gesendet, mit Rückmeldung direkt im Formular. Ein
Honigtopf-Feld hält einfache Spam-Bots fern. **Hinweis:** Wird ein externer Dienst eingebunden,
muss er in der Datenschutzerklärung genannt werden.

---

## Vor dem Livegang zu klären

Diese Punkte konnten nicht aus dem bestehenden Inhalt abgeleitet werden und brauchen die
Bestätigung der Familie Lehner:

- **Impressum:** vollständige Postanschrift und verantwortliche Person
- **Datenschutz:** Name und Sitz des Hosting-Anbieters (und ggf. des Formular-Dienstes)
- **Abgabe:** Abgabealter, Impfstatus bei Auszug, Kaufvertrag und Preis – die Seite nennt diese
  Punkte bisher nur als Gesprächsthemen, ohne konkrete Zahlen
- **Aktueller Wurf:** Elterntiere, Anzahl und Farben der Kitten vom 18.03.2026
- **Hariboo:** exakter Geburtstag und Blutgruppe, sobald bekannt
- **Texte:** die neu formulierten Passagen (Startseite, Abgabe, Verpaarungen) gegenlesen

---

## Konzept: Zielgruppe, AIDA und Stil

### Zielgruppe

Familien und Paare (ca. 30–65) aus der Deutschschweiz, die ein Rassekitten für das
eigene Zuhause suchen. Sie kommen emotional (Kittenbilder) – entscheiden aber über
Vertrauen: Ist die Zucht seriös? Sind die Tiere gesund? Viele besuchen die Seite
mobil und greifen lieber zum Telefon als zum Formular. Darauf ist alles ausgerichtet:
grosse Tippflächen, Telefonnummer als gleichwertiger Handlungsaufruf, „Sie“-Ansprache,
ehrlicher Ton statt Verkaufssprache.

### AIDA-Aufbau der Startseite

| Stufe | Umsetzung |
| --- | --- |
| **Attention** | Ankündigungsleiste („Wir haben Babies“) auf jeder Seite, Hero mit emotionaler Headline und pulsierendem Verfügbarkeits-Badge |
| **Interest** | Vertrauensband in Zahlen (seit 2007, RKO & FFH, 4 Zuchtkatzen, HCM-Ultraschall) und „Warum eine Britisch Kurzhaar?“ |
| **Desire** | „Warum Brumag*CH?“ mit belegbaren Argumenten, Elterntier-Karten, aktueller Wurf mit Bild |
| **Action** | Abschluss-CTA „Der erste Schritt: ein Gespräch“ mit Telefon + Formular, hervorgehobener Kontakt-Button in der Navigation, Reassurance („unverbindlich, Antwort innert 1–2 Tagen“) |

Auch Unterseiten folgen dem Muster: Jede endet in einem klaren nächsten Schritt.

### Stilkonzept „Warmes Plüsch“

Die Farbwelt kommt von der Katze selbst: **Kupfer** (`#a8672f`, die Augenfarbe der BKH)
trägt alle Handlungsaufrufe, **Blaugrau** (`#5b708a`, die Fellfarbe) setzt ruhige
Nebenakzente, dazu warme Creme- und Espresso-Töne statt kühlem Grau. Runde, weiche
Formen (Pill-Buttons, 22-px-Karten, gerundeter Hero) transportieren das „Plüschige“
der Rasse, ohne kindisch zu wirken. Serifen-Headlines geben die nötige Seriosität.
Dark Mode, reduzierte Bewegung und Druckansicht sind mitgestaltet.

---

## Netlify

Die beiliegende `netlify.toml` setzt `publish = "docs"` und `command = "node build.mjs"`.
Ohne sie veröffentlicht Netlify das Repo-Root und zeigt nur „Page not found“.
Repo verbinden, deployen – weitere Einstellungen sind nicht nötig.

---

## Veröffentlichen

**GitHub Pages:** in den Repository-Einstellungen unter *Pages* als Quelle den Branch und den
Ordner `/docs` wählen. Die Datei `.nojekyll` liegt bereits im Build.

**Eigener Webspace:** den Inhalt von `docs/` hochladen. Es wird kein PHP und keine Datenbank
benötigt. Für saubere Adressen ohne `.html` genügt eine passende Server-Regel; die interne
Verlinkung funktioniert auch ohne.
