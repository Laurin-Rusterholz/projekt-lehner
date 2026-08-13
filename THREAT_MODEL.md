# Bedrohungsmodell — Website Brumag*CH

Stand: 2026-08-13. Kurzform für eine statische Website; Details und Befunde in
SECURITY_AUDIT.md.

## Schutzgüter

1. **Integrität des Ausgelieferten** — auf der Site steht, was die Familie
   Lehner freigegeben hat; niemand schiebt Inhalte unter.
2. **Verfügbarkeit** — die Site und der Kundenlink-Rahmen funktionieren.
3. **Vertrauen in den Kundenlink** — die Einbettung auf flowertech.ch zeigt
   wirklich diese Site, und nur sie darf den Auswahlmodus schalten.
4. **Keine unbeabsichtigte Datenannahme** — die Site sammelt nichts; das
   Kontaktformular öffnet nur `mailto:`.

## Vertrauensgrenzen und Datenflüsse

```
GitHub (main) ──push──▶ Netlify-Build ──▶ docs/ ──▶ Besucher-Browser
                       │  npm install (sharp, per Lockfile fixiert)
                       │  fetch-images: lädt Bilder von der alten Website
                       └  pruefe-ausgabe: Gate (Vollständigkeit + Trennung)

flowertech.ch (Kundenlink) ⇄ postMessage ⇄ eingebettete Site (wunsch.js)
   nur ns "flowertech-wunsch", nur Herkunft flowertech.ch/localhost,
   nur öffentliche Textangaben, kein Markup, keine Formulardaten
```

## Missbrauchsfälle → Gegenmassnahme

| Missbrauchsfall | Gegenmassnahme |
| --- | --- |
| Fremde Seite rahmt die Site als Kulisse ein (Clickjacking, Marken-Missbrauch) | CSP `frame-ancestors` nur self + flowertech.ch |
| Fremde Einbettung schaltet den Auswahlmodus | Herkunfts-Allowlist in wunsch.js (doppelter Boden zu frame-ancestors) |
| Kompromittierte/abgelöste Abhängigkeit gelangt in den Build | `package-lock.json` fixiert Versionen; `npm audit` sauber (sharp ≥ 0.35.3) |
| Manipulierte Bilder der alten Website treffen verwundbare Bildverarbeitung | sharp ohne bekannte CVEs; Bilder-Schritt darf fehlschlagen, ohne den Deploy zu reissen |
| Unbemerkt unvollständiger / vermischter Deploy | pruefe-ausgabe bricht den Build ab (Pflichtdateien, verbotene Flächen) |
| Zweitkopie der Site unter anderer Adresse veraltet vor sich hin | GitHub-Pages-Workflow entfernt; Pages deaktivieren (manuell) |
| Push direkt auf `main` an der Prüfung vorbei | Branch-Schutz — manuell in GitHub einzustellen (S7) |
| Konto-Übernahme GitHub/Netlify | MFA/2FA — manuell (S7) |

## Ausser Umfang

Der Funktions-Server des Kundenlinks (Repository `flowertech`), die
Verwaltung anderer Projekte (`verwaltung-djsamsparkling`) und der
Aufgaben-Weg (`ai-sync`) haben eigene Prüfungen in ihren Repositories.
