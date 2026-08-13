# Sicherheits-Audit — Website Brumag*CH (projekt-lehner)

Stand: 2026-08-13 · geprüfter Stand: `main` nach dem Hoflädeli-Redesign
(`e12e802`) samt Banner-Bereinigung (PR #9) · Modus: Audit **und** beauftragte
Härtung · Prüfende Umgebung ohne Zugriff auf die Live-Adressen (Netzsperre) —
Live-Nachweise stehen unter „Offen / manuell".

## Einstufung

**Profil 2: GitHub-Quelle + statischer Host (Netlify).** Dieses Repository
liefert ausschliesslich statische Seiten; es gibt hier keinen Server-Code,
keine Authentifizierung, keine Datenbank, keine Zahlungen. Jedes ausgelieferte
Byte ist öffentlich — Geheimnisse haben im Repo und im Build-Ergebnis nichts
verloren (geprüft, siehe S8). Der Änderungswunsch-Weg (Kundenlink →
Netlify-Funktion → Aufgabe) liegt im Repository `flowertech` und ist dort
getestet; er ist **nicht** Gegenstand dieses Audits.

## Befunde

Schweregrade: P0 kritisch … P3 gering. Status: behoben / akzeptiert / offen.

### S1 · P2 · behoben — Keine Sicherheits-Antwortkopfzeilen, Einbettung für jedermann
Die Site sendete keinerlei Sicherheits-Header; jede fremde Seite konnte sie
einrahmen (Clickjacking-Kulisse, fremde Einbettung des Markennamens).
**Fix:** `netlify.toml` setzt jetzt für `/*`:
`Content-Security-Policy: frame-ancestors 'self' https://flowertech.ch https://www.flowertech.ch; object-src 'none'; base-uri 'self'`,
`X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`,
`Permissions-Policy` (Kamera/Mikrofon/Standort/Zahlung/USB aus),
`Strict-Transport-Security: max-age=31536000`.
Einbetten darf die Seite damit nur noch der FlowerTech-Kundenlink und sie
selbst. **Verifikation:** Konfiguration im Repo; Live-Nachweis nach Deploy
(siehe SECURITY_TEST_PLAN.md) — aus dieser Umgebung nicht möglich.

### S2 · P2 · behoben — Alte Auslieferungsflächen wurden bei jedem Deploy neu erzeugt
`build-vorschau.mjs` baute `/vorschau/`, `/verwaltung/` und legte einen
Vorschau-Streifen in jede Seite — obwohl der Kundenlink die einzige Oberfläche
sein soll. Mehr öffentliche Fläche, veralteter Rahmen, Duplikat der
Verwaltung. **Fix:** Skript, Assets (`vorschau.css`, `vorschau.js`) und der
Build-Schritt entfernt; `scripts/pruefe-ausgabe.mjs` bricht den Deploy ab,
wenn eine dieser Flächen wieder auftaucht (Trennungs-Wächter).
**Verifikation:** `node build.mjs && node scripts/pruefe-ausgabe.mjs` grün;
Wächter läuft in jedem Netlify-Build.

### S3 · P2 · behoben — Zweitveröffentlichung über GitHub Pages
`.github/workflows/pages.yml` veröffentlichte eine vollständige Kopie der Site
(inkl. alter Vorschau-Zentrale) auf `…github.io`, mit nur Tag-gepinnten
Actions. Zweite öffentliche Kopie = doppelte Angriffs- und Verwechslungsfläche.
**Fix:** Workflow entfernt; es verbleiben keine GitHub-Actions-Workflows in
diesem Repo. **Manuell (Repo-Einstellungen):** GitHub Pages deaktivieren,
falls dort noch ein alter Stand ausgeliefert wird — das kann nur die
Repo-Inhaberin/der Inhaber.

### S4 · P2 · behoben — Ungepinnte Build-Abhängigkeit mit bekannten Lücken
Es gab kein Lockfile; Netlify installierte bei jedem Build die jeweils neueste
`sharp` 0.33.x. `npm audit` meldete für `sharp <0.35.0` vier als **hoch**
eingestufte libvips-CVEs (GHSA-f88m-g3jw-g9cj: CVE-2026-33327/-33328,
CVE-2026-35590/-35591). sharp verarbeitet beim Build die Bilder der alten
Website — verwundbare Bildverarbeitung auf teils fremdem Eingabematerial.
**Fix:** `sharp` auf `^0.35.3` gehoben, `package-lock.json` eingecheckt;
`npm audit`: **0 Schwachstellen**. Die genutzte API (rotate/resize/jpeg/webp)
ist unverändert; schlägt der Bilder-Schritt dennoch fehl, überlebt der Deploy
das ausdrücklich (Build-Kommando fängt ihn ab).

### S5 · P3 · behoben — Auswahlmodus-Empfänger nahm Befehle jeder Herkunft an
`wunsch.js` akzeptierte `arm`/`disarm`/`clear` von jedem einbettenden Fenster
und antwortete an `'*'`. Übertragen werden zwar nur öffentliche Textangaben,
aber der Modus liess sich von fremden Einbettungen schalten. **Fix:**
Herkunfts-Allowlist (`flowertech.ch`, `www.flowertech.ch`, lokale Abnahme)
für eingehende Nachrichten; Antworten gehen nach der ersten gültigen Meldung
gezielt an diese Herkunft. Zusammen mit S1 (`frame-ancestors`) ist die fremde
Einbettung ohnehin unterbunden — doppelter Boden.

### S6 · P3 · akzeptiert — Kontaktformular ohne Server, E-Mail-Adresse öffentlich
Das Formular hat bewusst kein Backend (`FORM_ENDPOINT = ''`): Es öffnet ein
vorbefülltes `mailto:`, ein Honeypot-Feld (`website`) fängt simple Bots. Es
gibt serverseitig nichts, das Daten annimmt, speichert oder weiterleitet.
Die E-Mail-Adresse steht — wie schon auf der bisherigen Website — im Klartext;
Spam-Risiko bekannt und akzeptiert. Wird später ein Formular-Dienst
eingetragen, braucht es dort Rate-Limits und Spam-Schutz (siehe
RESIDUAL_RISK.md).

### S7 · P3 · offen / manuell — Konto- und Plattform-Kontrollen
Aus dem Code nicht prüfbar, gehört aber zur Kette: GitHub-Konto mit
MFA/Passkey; Branch-Schutz auf `main` (mind. Pull-Request-Pflicht); Netlify-
Konto mit 2FA; bei Live-Gang auf `bkh-brumag.ch` die Domain im Host
verifizieren, kein Wildcard-DNS, alte DNS-Einträge beim Umzug entfernen.

### S8 · Info — Secret-Scan ohne Funde
Arbeitsstand und Git-Verlauf wurden heuristisch nach gängigen Mustern
durchsucht (API-Keys, Tokens `ghp_…`/`sk-…`/`AIza…`, private Schlüssel,
Firebase/Hook-Verweise): **keine Funde**. Grenze: musterbasierte Suche, kein
spezialisierter Scanner in dieser Umgebung verfügbar — als Lücke dokumentiert,
nicht als „bestanden" verbucht. Empfehlung: GitHub Secret Scanning /
Push Protection in den Repo-Einstellungen aktivieren (manuell).

### S9 · P3 · offen (Empfehlung) — Strikte CSP erst nach Probelauf
Die heutige CSP beschränkt Einbettung, Objekte und `base-uri`. Eine strikte
`script-src`/`style-src`-Policy braucht Hashes (eingebettetes JSON-LD; das vom
Auswahlmodus eingefügte `<style>`) und einen Staging-Probelauf — ungetestet
live gesetzt könnte sie Sichtbares abreissen. Bewusst zurückgestellt,
Vorgehen in SECURITY_TEST_PLAN.md.

## Verifikation (drei Sichten)

* **Statisch:** Code-/Konfig-Durchsicht (Layout, Build, Skripte, netlify.toml),
  Secret-Scan (S8), `npm audit` gegen das neue Lockfile (0 Funde).
* **Dynamisch:** `node build.mjs && node scripts/pruefe-ausgabe.mjs` (grün,
  15 Seiten, Trennungs-Wächter); der Rahmen selbst (Kundenlink) ist im
  Repository `flowertech` mit 952 DOM-Prüfungen abgedeckt.
* **Operativ:** Netlify-Deploy-Preview pro PR als Pflicht-Check; Live-Header
  und Live-Einbettung nach Merge durch die Inhaberin/den Inhaber
  (SECURITY_TEST_PLAN.md) — aus dieser Umgebung netzbedingt nicht möglich.

## Entscheid

**CONDITIONALLY READY** für den geprüften Umfang (statische Website auf
Netlify). Bedingungen: ① Live-Nachweis der Header nach dem Deploy und Probe,
dass der Kundenlink die Seite weiterhin einbettet (frame-ancestors!),
② GitHub Pages deaktivieren, falls noch aktiv, ③ Konto-Kontrollen aus S7.
Keine offenen P0/P1. Diese Website ist damit nicht „unhackbar" — reduziert
sind Angriffsfläche und Blastradius im genannten Umfang; Grenzen stehen in
RESIDUAL_RISK.md.
