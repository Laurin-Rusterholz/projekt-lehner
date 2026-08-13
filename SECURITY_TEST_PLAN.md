# Sicherheits-Prüfplan — Website Brumag*CH

Stand: 2026-08-13. Reihenfolge einhalten — Schritt 3 ist der wichtigste.

## 1 · Bei jedem Build (läuft automatisch auf Netlify)

```bash
node build.mjs && node scripts/pruefe-ausgabe.mjs
```

Bricht ab, wenn Pflichtdateien fehlen, alte Auslieferungsflächen
(`/vorschau/`, `/verwaltung/`, Streifen) wieder auftauchen, Werkstatt-
Kommentare oder der entfernte Ankündigungs-Zettel zurückkehren.

## 2 · Abhängigkeiten (bei jeder Änderung an package.json / Lockfile)

```bash
npm audit --package-lock-only
```

Erwartung: `found 0 vulnerabilities`. Niemals `npm audit fix --force` blind
ausführen — Versionssprünge bewusst setzen und den Bilder-Schritt danach
einmal lokal laufen lassen.

## 3 · Nach jedem Deploy mit Header-Änderung (Live, im Browser/Terminal)

```bash
curl -sI https://beispiel-lehner.netlify.app/ | grep -iE \
  'content-security-policy|x-content-type-options|referrer-policy|permissions-policy|strict-transport'
```

Erwartung: alle fünf Kopfzeilen wie in `netlify.toml`.

**Dann sofort den Kundenlink öffnen** —
`https://flowertech.ch/fragebogen.html?e=<Token>` — und prüfen, dass die
Website im Tab „Website" **weiterhin erscheint** und der Auswahlmodus
funktioniert. `frame-ancestors` sperrt Einbettung: Wäre die erlaubte Herkunft
falsch, bliebe der Rahmen leer. Das ist der eine Punkt, der nur live
nachweisbar ist.

Gegenprobe Einbettungsschutz: eine fremde Testseite (z. B. lokale HTML-Datei
mit `<iframe src="https://beispiel-lehner.netlify.app/">`, über einen lokalen
Server geöffnet) darf die Site **nicht** anzeigen; die Konsole meldet die
frame-ancestors-Verweigerung.

## 4 · Auswahlmodus-Empfänger (bei Änderungen an wunsch.js)

Im Kundenlink: Auswahlmodus einschalten, Stelle antippen → Dialog erscheint;
Verweis/Knopf antippen → Hinweis „Zum Öffnen den Auswahlmodus verlassen".
Direktaufruf der Website ohne `?embed=flowertech`: kein Crosshair-Cursor,
keine Fahne, Konsole ohne flowertech-Meldungen.

## 5 · Einstellungen (einmalig, manuell)

- GitHub: Pages deaktiviert? Branch-Schutz auf `main`? Secret Scanning /
  Push Protection aktiv? MFA?
- Netlify: 2FA aktiv; Deploy-Benachrichtigungen an eine gelesene Adresse.
