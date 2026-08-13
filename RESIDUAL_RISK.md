# Restrisiken — Website Brumag*CH

Stand: 2026-08-13. Was nach der Härtung bewusst offen bleibt, und warum.

1. **Öffentliche E-Mail-Adresse und Telefonnummer.** Stehen — wie auf der
   bisherigen Website — im Klartext auf der Site (Kontakt, Impressum).
   Spam-/Scraping-Risiko akzeptiert; ein Formular-Backend mit Spam-Schutz
   kann das später abfedern, ist aber nicht Teil dieses Stands.

2. **Keine strikte script-src/style-src-CSP.** Eingebettetes JSON-LD und das
   vom Auswahlmodus eingefügte `<style>` brauchen Hashes; ungetestet gesetzt
   könnte die Policy Sichtbares abreissen. Zurückgestellt bis zu einem
   Staging-Probelauf (SECURITY_AUDIT.md S9). Das Risiko dahinter (XSS) ist
   auf einer statischen Site ohne Eingabeverarbeitung gering.

3. **Netlify-Build führt Installationsskripte aus.** `sharp` braucht seine
   nativen Artefakte; das Lockfile fixiert die Version, aber der Build
   vertraut npm-Registry und Netlify-Infrastruktur. Üblich und akzeptiert.

4. **Bilder stammen von der alten Website.** Ist deren Hosting kompromittiert,
   könnten manipulierte Bilder in den Build gelangen. Abgefedert durch
   aktuelles sharp (keine bekannten CVEs) und dadurch, dass der Bilder-Schritt
   den Deploy nie reissen kann; nicht durch Signaturen o. Ä. abgesichert.

5. **Plattform-Kontrollen sind nicht aus dem Code erzwingbar.** MFA, Branch-
   Schutz, Pages-Deaktivierung, Domain-Verifizierung liegen in den
   GitHub-/Netlify-Einstellungen (SECURITY_AUDIT.md S7, Prüfplan Punkt 5).

6. **Live-Nachweis steht aus.** Die Header- und Einbettungsprüfung (Prüfplan
   Punkt 3) konnte aus der Audit-Umgebung nicht ausgeführt werden
   (Netzsperre); bis dahin gilt der Stand als konfiguriert, nicht als live
   belegt.
