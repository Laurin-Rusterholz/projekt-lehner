#!/usr/bin/env node
/**
 * Holt die Originalbilder von der bisherigen Website und erzeugt daraus
 * web-taugliche Varianten (mehrere Breiten, JPEG + WebP).
 *
 *   node scripts/fetch-images.mjs
 *
 * Ohne zusätzliche Pakete werden die Originale nur heruntergeladen und
 * unverändert abgelegt. Ist `sharp` installiert (`npm install --no-save sharp`),
 * skaliert das Skript zusätzlich auf die in src/data/*.json hinterlegten
 * Breiten herunter – das ist der eigentliche Sinn der Übung, denn die
 * Originaldateien sind bis zu 5760 px breit.
 *
 * Alle Zieldateien und Quelladressen stehen in den Datendateien; hier ist
 * nichts doppelt gepflegt.
 */
import { readFile, writeFile, mkdir, access } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = path.join(root, 'src');

const readJson = async (p) => JSON.parse(await readFile(path.join(SRC, 'data', p), 'utf8'));
const site = await readJson('site.json');
const cats = await readJson('cats.json');
const media = await readJson('media.json');

const BASE = site.legacyImageBase.replace(/\/$/, '');
const ORIGINALS = path.join(SRC, 'assets', 'img', '_originals');

/* Alle Bilder aus den Datendateien einsammeln. */
function collect() {
  const items = [];
  const add = (image, widths) => {
    if (!image?.legacy) return;
    items.push({ legacy: image.legacy, base: image.base, widths: image.widths || widths });
  };

  for (const cat of cats) {
    add(cat.image, [480, 800, 1200]);
    (cat.gallery || []).forEach((g) => add(g, [480, 800, 1200]));
  }
  media.hero.slides.forEach((s) => add(s, media.hero.widths));
  media.litter.images.forEach((i) => add(i, [480, 800, 1200]));
  media.archive.images.forEach((i) => add(i, media.archive.widths));
  return items;
}

async function exists(p) {
  try { await access(p); return true; } catch { return false; }
}

async function download(url, target) {
  const res = await fetch(url, { redirect: 'follow' });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, buf);
  return buf;
}

async function loadSharp() {
  try {
    return (await import('sharp')).default;
  } catch {
    return null;
  }
}

async function main() {
  const items = collect();
  const sharp = await loadSharp();

  if (!sharp) {
    console.warn('! sharp ist nicht installiert – die Bilder werden nur heruntergeladen,');
    console.warn('  aber nicht verkleinert. Für optimierte Dateien:');
    console.warn('  npm install --no-save sharp && node scripts/fetch-images.mjs\n');
  }

  let ok = 0;
  let failed = 0;

  for (const item of items) {
    const url = BASE + item.legacy;
    const originalName = path.basename(item.base) + path.extname(item.legacy).toLowerCase();
    const originalPath = path.join(ORIGINALS, originalName);

    try {
      let buf;
      if (await exists(originalPath)) {
        buf = await readFile(originalPath);
        process.stdout.write(`· ${originalName} (bereits vorhanden)\n`);
      } else {
        buf = await download(url, originalPath);
        process.stdout.write(`↓ ${originalName}\n`);
      }

      await mkdir(path.join(SRC, path.dirname(item.base)), { recursive: true });

      for (const width of item.widths) {
        const jpg = path.join(SRC, `${item.base}-${width}.jpg`);
        const webp = path.join(SRC, `${item.base}-${width}.webp`);

        if (sharp) {
          await sharp(buf).rotate().resize({ width, withoutEnlargement: true })
            .jpeg({ quality: 82, mozjpeg: true, progressive: true }).toFile(jpg);
          await sharp(buf).rotate().resize({ width, withoutEnlargement: true })
            .webp({ quality: 78 }).toFile(webp);
        } else {
          // Ohne sharp: Original unverändert unter dem erwarteten Namen ablegen,
          // damit die Seite nicht auf die Fremdadresse ausweichen muss.
          await writeFile(jpg, buf);
        }
      }
      ok += 1;
    } catch (err) {
      failed += 1;
      console.error(`✗ ${url} – ${err.message}`);
    }
  }

  console.log(`\n${ok} Bild(er) verarbeitet, ${failed} fehlgeschlagen.`);
  if (ok) console.log('Jetzt "node build.mjs" ausführen, damit docs/ die neuen Dateien enthält.');
}

await main();
