# Bilder

Dieser Ordner ist absichtlich fast leer. Die für das Web verkleinerten Bilddateien
(`cats/gigi-800.jpg`, `hero/hero-01-1400.webp` …) werden aus den Originalen erzeugt:

```bash
npm install --no-save sharp      # optional, aber empfohlen
node scripts/fetch-images.mjs
node build.mjs
```

Die Quelladressen und Zielnamen stehen in `src/data/cats.json` und `src/data/media.json`.
Erzeugte Grössen und die Originale unter `_originals/` sind über `.gitignore` ausgenommen –
so bleibt das Repository schlank.
