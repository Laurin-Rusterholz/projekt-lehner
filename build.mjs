#!/usr/bin/env node
/**
 * Statischer Seitengenerator für bkh-brumag.ch – ohne Abhängigkeiten.
 *
 *   src/layout.html   Rahmen (Kopf, Navigation, Fusszeile)
 *   src/pages/*.html  Inhalte mit kleinem Meta-Block
 *   src/data/*.json   Katzen, Bilder, Stammdaten
 *   src/assets/       CSS, JS, Bilder (werden 1:1 kopiert)
 *
 * Ergebnis landet in docs/ und kann direkt über GitHub Pages oder jeden
 * beliebigen Webspace ausgeliefert werden.
 *
 *   node build.mjs
 */
import { readFile, writeFile, mkdir, rm, cp, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));
const SRC = path.join(root, 'src');
const OUT = path.join(root, 'docs');

const readJson = async (p) => JSON.parse(await readFile(path.join(SRC, 'data', p), 'utf8'));

const site = await readJson('site.json');
const cats = await readJson('cats.json');
const media = await readJson('media.json');
const faq = await readJson('faq.json');

const BUILD_YEAR = new Date().getFullYear();

/* ---------------------------------------------------------------- Helfer */

const esc = (s = '') =>
  String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const absolute = (rel) => `${site.url.replace(/\/$/, '')}/${String(rel).replace(/^\//, '')}`;

const legacyUrl = (rel) => (rel ? site.legacyImageBase.replace(/\/$/, '') + rel : '');

/**
 * Baut ein <picture> mit AVIF-freiem, aber schlankem WebP/JPEG-Paar,
 * srcset für mehrere Breiten und Lazy-Loading.
 * `data-fallback` verweist auf das Originalbild der bisherigen Website –
 * so bleibt die Seite auch dann vollständig, wenn die optimierten Dateien
 * noch nicht erzeugt wurden (siehe scripts/fetch-images.mjs).
 */
function picture(image, opts = {}) {
  const {
    sizes = '(min-width: 56rem) 33vw, 100vw',
    widths = image.widths || [480, 800, 1200],
    aspect = 'portrait',
    loading = 'lazy',
    priority = false,
    className = ''
  } = opts;

  const set = (ext) => widths.map((w) => `${image.base}-${w}.${ext} ${w}w`).join(', ');
  const fallbackWidth = widths[Math.min(1, widths.length - 1)];
  const frameClass = ['media', aspect ? `media--${aspect}` : '', className].filter(Boolean).join(' ');

  return `<div class="${frameClass}" data-placeholder="${esc(image.alt || 'Bild folgt')}">
  <picture>
    <source type="image/webp" srcset="${set('webp')}" sizes="${esc(sizes)}">
    <img src="${image.base}-${fallbackWidth}.jpg"
         srcset="${set('jpg')}"
         sizes="${esc(sizes)}"
         alt="${esc(image.alt || '')}"
         loading="${priority ? 'eager' : loading}"
         decoding="${priority ? 'sync' : 'async'}"${priority ? '\n         fetchpriority="high"' : ''}
         data-fallback="${esc(legacyUrl(image.legacy))}">
  </picture>
</div>`;
}

/* ------------------------------------------------------------- Bausteine */

/* Früher ein Slider mit acht Bildern und dunkler Bühne. Jetzt ein
   Familienalbum: ein grosses Foto, zwei kleine schräg daneben — hingelegt
   wie auf den Küchentisch. Ohne [data-hero] im Markup bleibt der alte
   Slider-Code in main.js einfach still. */
function heroBlock() {
  const { slides, widths, label } = media.hero;
  const bild = (i, opts) =>
    picture({ base: slides[i].base, legacy: slides[i].legacy, widths, alt: '' }, opts)
      .split('\n')
      .map((l) => '        ' + l)
      .join('\n');
  return `    <div class="album" role="img" aria-label="${esc(label)}">
      <figure class="album__main">
${bild(0, { sizes: '(min-width: 56rem) 55vw, 92vw', aspect: 'wide', priority: true })}
      </figure>
      <figure class="album__side album__side--a">
${bild(3, { sizes: '18vw', aspect: 'square' })}
      </figure>
      <figure class="album__side album__side--b">
${bild(4, { sizes: '18vw', aspect: 'square' })}
      </figure>
    </div>`;
}

function catCard(cat) {
  const meta = [`${cat.colourCode} · ${cat.colour}`, `geb. ${cat.bornText}`].join(' &middot; ');
  const tags = [
    cat.title ? `<li class="tag tag--accent">${esc(cat.title)}</li>` : '',
    cat.carries ? `<li class="tag">${esc(cat.carries)}</li>` : '',
    cat.awards.length && !cat.title ? `<li class="tag">${esc(cat.awards[0])}</li>` : ''
  ]
    .filter(Boolean)
    .join('');

  return `      <article class="card card--link">
${picture(cat.image, { sizes: '(min-width: 56rem) 25vw, (min-width: 38rem) 45vw, 90vw', aspect: 'portrait' })
    .split('\n')
    .map((l) => '        ' + l)
    .join('\n')}
        <div class="card__body">
          <h3 class="card__title"><a href="katze-${cat.slug}.html">${esc(cat.callName)}</a></h3>
          <p class="card__meta"><span data-birth="${cat.born}">${meta}</span></p>
          ${tags ? `<ul class="tag-list">${tags}</ul>` : ''}
          <p class="card__text">${esc(cat.teaser)}</p>
          <p class="card__more" aria-hidden="true">Steckbrief ansehen</p>
        </div>
      </article>`;
}

function catsGrid() {
  return `    <div class="grid grid--3">
${cats.map(catCard).join('\n')}
    </div>`;
}

function archiveGallery() {
  const { images, widths } = media.archive;
  const items = images
    .map((image, i) => {
      const img = { ...image, widths };
      return `      <li>
        <button type="button" class="gallery__btn" data-lightbox="archiv"
                data-full="${img.base}-${widths[widths.length - 1]}.jpg"
                data-caption="${esc(img.alt)}">
          <span class="visually-hidden">Bild ${i + 1} gross anzeigen</span>
${picture(img, { sizes: '(min-width: 56rem) 22vw, 45vw', aspect: 'square' })
        .split('\n')
        .map((l) => '          ' + l)
        .join('\n')}
        </button>
      </li>`;
    })
    .join('\n');

  return `    <ul class="gallery">
${items}
    </ul>`;
}

function litterImage() {
  const image = media.litter.images[0];
  return picture(image, { sizes: '(min-width: 56rem) 50vw, 92vw', aspect: 'wide' });
}

function faqBlock() {
  const items = faq
    .map(
      (f) => `      <details class="faq__item">
        <summary>${esc(f.q)}</summary>
        <div class="faq__body"><p>${esc(f.a)}</p></div>
      </details>`
    )
    .join('\n');
  return `    <div class="faq">\n${items}\n    </div>`;
}

function pairingsTable() {
  // Nur belegte Verbindungen aus den Stammbäumen unserer eigenen Katzen.
  const rows = cats
    .filter((c) => c.dam.name.includes('Brumag'))
    .map(
      (c) => `        <li>
          <span class="timeline__date">Wurf ${esc(c.bornText)}</span>
          <h3>${esc(c.sire.name)} &times; ${esc(c.dam.name)}</h3>
          <p>Daraus stammt <a href="katze-${c.slug}.html">${esc(c.callName)}</a> &ndash; ${esc(c.colourCode)}, ${esc(c.colour)}.</p>
        </li>`
    )
    .join('\n');

  return `      <ol class="timeline">
${rows}
      </ol>`;
}

/* ------------------------------------------------------- Katzen-Detailseiten */

function catPageBody(cat) {
  const facts = [
    ['Vollständiger Name', esc(cat.name)],
    ['Farbe', `${esc(cat.colourCode)} &ndash; ${esc(cat.colour)}${cat.carries ? `, ${esc(cat.carries)}` : ''}`],
    [
      'Geboren',
      `<time datetime="${cat.born}">${esc(cat.bornText)}</time><span data-birth="${cat.born}"></span>`
    ],
    ['Vater', `${esc(cat.sire.name)} <span class="tag">${esc(cat.sire.code)} &middot; ${esc(cat.sire.colour)}</span>`],
    ['Mutter', `${esc(cat.dam.name)} <span class="tag">${esc(cat.dam.code)} &middot; ${esc(cat.dam.colour)}</span>`],
    [
      'Blutgruppe',
      cat.bloodGroup ? esc(cat.bloodGroup) : `<span class="hint">${esc(cat.bloodGroupNote || 'noch nicht bestimmt')}</span>`
    ],
    ['Gesundheit', cat.health.map((h) => `<li class="tag">${esc(h)}</li>`).join('')]
  ];

  const factList = facts
    .map(([dt, dd]) =>
      dt === 'Gesundheit'
        ? `        <dt>${dt}</dt>\n        <dd><ul class="tag-list">${dd}</ul></dd>`
        : `        <dt>${dt}</dt>\n        <dd>${dd}</dd>`
    )
    .join('\n');

  const awards = cat.awards.length
    ? `
<section class="section section--tight wrap">
  <h2>Ausstellungserfolge</h2>
  <ul class="tag-list">${cat.awards.map((a) => `<li class="tag tag--accent">${esc(a)}</li>`).join('')}</ul>
  <p class="hint" style="margin-top:.9rem">BIV = Best in Variety, Nom. BIS = Nomination for Best in Show, BIS = Best in Show.</p>
</section>`
    : '';

  const gallery = (cat.gallery || [])
    .map((g) => picture(g, { sizes: '(min-width: 56rem) 45vw, 92vw', aspect: 'wide' }))
    .join('\n');

  return `<nav class="wrap breadcrumb" aria-label="Brotkrumen-Navigation">
  <ol>
    <li><a href="index.html">Start</a></li>
    <li><a href="katzen.html">Unsere Katzen</a></li>
    <li aria-current="page">${esc(cat.callName)}</li>
  </ol>
</nav>

<section class="section wrap">
  <div class="grid grid--split">
    <div class="stack">
      <p class="page-head__kicker">${esc(cat.title || 'Unsere Katzen')}</p>
      <h1>${esc(cat.callName)}</h1>
      <p class="lead">${esc(cat.intro)}</p>
      <dl class="facts">
${factList}
      </dl>
    </div>
    <div class="stack">
${picture(cat.image, { sizes: '(min-width: 56rem) 45vw, 92vw', aspect: 'portrait', priority: true })}
${gallery}
    </div>
  </div>
</section>
${awards}

<section class="section wrap">
  <div class="note">
    <p class="note__title">Gesundheitsvorsorge</p>
    <p>Alle unsere Zuchtkatzen stehen unter tierärztlicher Kontrolle, sind gegen Katzenseuche, Herpes, Chlamydien
      und Leukose geimpft und werden regelmässig am Tierspital der Universität Zürich per Ultraschall auf HCM
      untersucht. <a href="ueber-uns.html">Mehr über unsere Zucht</a></p>
  </div>
</section>

<section class="section wrap">
  <div class="btn-row">
    <a class="btn btn--ghost" href="katzen.html">Alle Katzen</a>
    <a class="btn btn--primary" href="kontakt.html">Kontakt aufnehmen</a>
  </div>
</section>`;
}

/* ------------------------------------------------------------ JSON-LD */

function jsonldFor(kind, extra = {}) {
  const b = site.breeder;
  const organisation = {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    name: `${site.name} – ${site.tagline}`,
    description: site.shortDescription,
    url: site.url,
    email: b.email,
    telephone: b.phone,
    foundingDate: String(site.foundedYear),
    address: {
      '@type': 'PostalAddress',
      postalCode: b.postalCode,
      addressLocality: b.city,
      addressRegion: b.region,
      addressCountry: b.countryCode
    },
    memberOf: site.memberships.map((m) => ({ '@type': 'Organization', name: m.name, alternateName: m.abbr }))
  };

  const faqPage = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faq.map((f) => ({
      '@type': 'Question',
      name: f.q,
      acceptedAnswer: { '@type': 'Answer', text: f.a }
    }))
  };

  const data =
    kind === 'organisation' ? organisation :
    kind === 'faq' ? faqPage :
    { '@context': 'https://schema.org', ...extra };
  return `<script type="application/ld+json">${JSON.stringify(data)}</script>`;
}

/* --------------------------------------------------------------- Rahmen */

function navHtml(activeKey) {
  return site.nav
    .map((item) => {
      const current = item.key === activeKey ? ' aria-current="page"' : '';
      return `        <li><a class="site-nav__link" href="${item.href}"${current}>${esc(item.label)}</a></li>`;
    })
    .join('\n');
}

function footerLinksHtml() {
  return site.footerLinks
    .map((l) => `        <li><a href="${l.href}">${esc(l.label)}</a></li>`)
    .join('\n');
}

const TOKENS = {
  hero: heroBlock,
  faq: faqBlock,
  'cats-grid': catsGrid,
  'archive-gallery': archiveGallery,
  'litter-image': litterImage,
  pairings: pairingsTable,
  'litter-date': () => esc(media.litter.bornText),
  'litter-datetime': () => media.litter.born,
  email: () => esc(site.breeder.email),
  phone: () => esc(site.breeder.phoneDisplay),
  'phone-href': () => site.breeder.phone.replace(/\s/g, ''),
  'founded-year': () => String(site.foundedYear),
  'years-active': () => String(BUILD_YEAR - site.foundedYear)
};

function expand(html) {
  return html.replace(/\{\{([a-z0-9-]+)\}\}/gi, (match, key) =>
    Object.prototype.hasOwnProperty.call(TOKENS, key) ? TOKENS[key]() : match
  );
}

function parseMeta(raw) {
  const m = raw.match(/^<!--meta\s*([\s\S]*?)-->\s*/);
  if (!m) return { meta: {}, body: raw };
  const meta = {};
  for (const line of m[1].split('\n')) {
    const idx = line.indexOf(':');
    if (idx === -1) continue;
    const key = line.slice(0, idx).trim();
    if (key) meta[key] = line.slice(idx + 1).trim();
  }
  return { meta, body: raw.slice(m[0].length) };
}

async function render(layout, { slug, meta, body }) {
  const title = meta.title ? `${meta.title} – ${site.name} Britisch Kurzhaar` : `${site.name} – ${site.tagline}`;
  const jsonld = meta.jsonld ? jsonldFor(meta.jsonld) : '';

  const html = layout
    .replace('{{title}}', esc(title))
    .replace('{{ogTitle}}', esc(meta.title || `${site.name} – ${site.tagline}`))
    .replace(/\{\{description\}\}/g, esc(meta.description || site.shortDescription))
    .replace(/\{\{canonical\}\}/g, absolute(slug === 'index' ? '' : `${slug}.html`))
    .replace('{{robots}}', meta.robots || 'index, follow')
    .replace('{{ogImage}}', absolute(meta.ogImage || 'assets/img/cats/dayanara-1200.jpg'))
    .replace('{{jsonld}}', jsonld)
    .replace('{{bodyClass}}', `page-${slug}`)
    .replace('{{nav}}', navHtml(meta.nav || slug))
    .replace('{{footerLinks}}', footerLinksHtml())
    .replace(/\{\{phoneHref\}\}/g, site.breeder.phone.replace(/\s/g, ''))
    .replace(/\{\{phoneDisplay\}\}/g, esc(site.breeder.phoneDisplay))
    .replace('{{year}}', String(BUILD_YEAR))
    .replace('{{content}}', expand(body).trimEnd())
    // Baukommentare sind Notizen an die Werkstatt, nicht an die Besucher.
    .replace(/[ \t]*<!--[\s\S]*?-->\n?/g, '');

  await writeFile(path.join(OUT, `${slug}.html`), html, 'utf8');
  sammleTexte(slug, meta, html);
  return slug;
}

/* ------------------------------------------------------- Inhalt für die
   Verwaltung. Die Verwaltung im FlowerTech-Kundenlink soll nicht leer
   dastehen und auch nichts erfinden: Sie zeigt, was HEUTE auf der Website
   steht. Dafür legt der Build eine maschinenlesbare Abschrift der
   ausgelieferten Inhalte daneben — dieselben Felder, die die Verwaltung
   anbietet, damit dort nichts umgedeutet werden muss.

   Nur Öffentliches: exakt die Texte und Bildadressen, die ohnehin auf jeder
   Seite stehen. Keine Zugangsdaten, keine Projektinterna. */

const texteSammlung = [];

const ohneTags = (s) =>
  String(s)
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&ndash;/g, '–')
    .replace(/&middot;/g, '·')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim();

function sammleTexte(slug, meta, html) {
  if (slug === '404') return; // Fehlerseite ist Technik, kein Inhalt zum Pflegen
  const seite = meta.title || (slug === 'index' ? 'Startseite' : slug);
  const haupt = (/<main[^>]*>([\s\S]*?)<\/main>/.exec(html) || ['', ''])[1];
  const nimm = (muster, name) => {
    const treffer = muster.exec(haupt);
    if (!treffer) return;
    const wert = ohneTags(treffer[1]);
    if (wert) texteSammlung.push({ label: `${seite} · ${name}`, wert });
  };

  nimm(/<h1[^>]*>([\s\S]*?)<\/h1>/, 'Überschrift');
  nimm(/<p class="(?:page-head__lead|lead)"[^>]*>([\s\S]*?)<\/p>/, 'Einleitung');

  let m;
  const h2 = /<h2[^>]*>([\s\S]*?)<\/h2>/g;
  let nummer = 0;
  while ((m = h2.exec(haupt)) !== null) {
    const wert = ohneTags(m[1]);
    nummer += 1;
    if (wert) texteSammlung.push({ label: `${seite} · Abschnitt ${nummer}`, wert });
  }
}

async function writeInhalt() {
  const bild = (base, breite) => `${base}-${breite}.jpg`;

  const eintraege = cats.map((cat) => ({
    name: `${cat.callName} – ${cat.name}`,
    kurz: cat.teaser || '',
    geboren: cat.bornText || '',
    merkmale: [cat.colourCode, cat.colour, cat.carries].filter(Boolean).join(' · '),
    bild: bild(cat.image.base, (cat.image.widths || [800])[1] || cat.image.widths[0]),
    text: cat.intro || ''
  }));

  const galerie = (media.archive?.images || []).map((b) => ({
    bild: bild(b.base, (media.archive.widths || [800])[1] || media.archive.widths[0]),
    name: b.alt || ''
  }));

  const anschrift = [
    site.breeder.family,
    [site.breeder.postalCode, site.breeder.city].filter(Boolean).join(' '),
    site.breeder.country
  ].filter(Boolean).join(', ');

  await writeFile(
    path.join(OUT, 'inhalt.json'),
    JSON.stringify(
      {
        hinweis: 'Abschrift der veroeffentlichten Inhalte dieser Website. Erzeugt von build.mjs.',
        stand: new Date().toISOString(),
        commit: process.env.COMMIT_REF || process.env.GITHUB_SHA || '',
        eintraege,
        galerie,
        kontakt: [
          { label: 'E-Mail', wert: site.breeder.email || '' },
          { label: 'Telefon', wert: site.breeder.phoneDisplay || '' },
          { label: 'Adresse', wert: anschrift }
        ],
        recht: [
          { label: 'Verantwortlich', wert: site.breeder.family || '' },
          { label: 'Adresse', wert: anschrift },
          { label: 'E-Mail', wert: site.breeder.email || '' }
        ],
        texte: texteSammlung
      },
      null,
      1
    ),
    'utf8'
  );
}

/* ------------------------------------------------------------- Nebendateien */

const FAVICON = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">
<rect width="48" height="48" rx="10" fill="#9d6127"/>
<g fill="#fffdf7">
<path d="M24 27c-6.2 0-11 3.7-11 8.6 0 3.3 2.5 5.4 6.2 5.4 1.9 0 3.3-.5 4.8-.5s2.9.5 4.8.5c3.7 0 6.2-2.1 6.2-5.4C35 30.7 30.2 27 24 27Z"/>
<ellipse cx="12.4" cy="20.6" rx="4.1" ry="5.4" transform="rotate(-18 12.4 20.6)"/>
<ellipse cx="35.6" cy="20.6" rx="4.1" ry="5.4" transform="rotate(18 35.6 20.6)"/>
<ellipse cx="19.6" cy="12.4" rx="3.8" ry="5.2" transform="rotate(-8 19.6 12.4)"/>
<ellipse cx="28.4" cy="12.4" rx="3.8" ry="5.2" transform="rotate(8 28.4 12.4)"/>
</g></svg>
`;

async function writeSitemap(slugs) {
  const today = new Date().toISOString().slice(0, 10);
  const urls = slugs
    .filter((s) => s !== '404')
    .map((s) => {
      const loc = absolute(s === 'index' ? '' : `${s}.html`);
      const priority = s === 'index' ? '1.0' : s.startsWith('katze-') ? '0.6' : '0.8';
      return `  <url>\n    <loc>${loc}</loc>\n    <lastmod>${today}</lastmod>\n    <priority>${priority}</priority>\n  </url>`;
    })
    .join('\n');

  await writeFile(
    path.join(OUT, 'sitemap.xml'),
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`,
    'utf8'
  );

  await writeFile(
    path.join(OUT, 'robots.txt'),
    `User-agent: *\nAllow: /\n\nSitemap: ${absolute('sitemap.xml')}\n`,
    'utf8'
  );
}

/* ------------------------------------------------------------------ Build */

async function build() {
  await rm(OUT, { recursive: true, force: true });
  await mkdir(OUT, { recursive: true });

  const layout = await readFile(path.join(SRC, 'layout.html'), 'utf8');
  const slugs = [];

  const pageFiles = (await readdir(path.join(SRC, 'pages'))).filter((f) => f.endsWith('.html')).sort();
  for (const file of pageFiles) {
    const raw = await readFile(path.join(SRC, 'pages', file), 'utf8');
    const { meta, body } = parseMeta(raw);
    slugs.push(await render(layout, { slug: file.replace(/\.html$/, ''), meta, body }));
  }

  for (const cat of cats) {
    const meta = {
      title: `${cat.callName} – ${cat.name}`,
      description: `${cat.callName} (${cat.name}): ${cat.colourCode}, ${cat.colour}, geboren ${cat.bornText}. Abstammung, Farbe, Gesundheitstests und Ausstellungserfolge unserer Britisch-Kurzhaar-Katze.`,
      nav: 'katzen',
      ogImage: `${cat.image.base}-1200.jpg`
    };
    slugs.push(await render(layout, { slug: `katze-${cat.slug}`, meta, body: catPageBody(cat) }));
  }

  // _originals (unverkleinerte Downloads) gehören nicht ins Deployment.
  await cp(path.join(SRC, 'assets'), path.join(OUT, 'assets'), {
    recursive: true,
    filter: (src) => !src.includes('_originals')
  });
  await writeFile(path.join(OUT, 'assets', 'img', 'favicon.svg'), FAVICON, 'utf8');
  await writeFile(path.join(OUT, '.nojekyll'), '', 'utf8');
  await writeSitemap(slugs);
  await writeInhalt();

  /* Ein Marker, der sagt WELCHER Stand ausgeliefert wird. Ohne ihn liess sich
     von aussen nicht unterscheiden, ob eine fehlende Seite an einem alten
     Deploy liegt oder an der Auslieferung — man sah nur eine 404 und konnte
     raten. Diese Datei kostet nichts und beendet das Raten. */
  await writeFile(
    path.join(OUT, 'stand-website.txt'),
    [
      'Schritt      : build.mjs (Website)',
      `Seiten       : ${slugs.length}`,
      `Commit       : ${process.env.COMMIT_REF || process.env.GITHUB_SHA || 'unbekannt'}`,
      `Zweig        : ${process.env.BRANCH || process.env.GITHUB_REF_NAME || 'unbekannt'}`,
      `Gebaut       : ${new Date().toISOString()}`,
      ''
    ].join('\n'),
    'utf8'
  );

  console.log(`✓ ${slugs.length} Seiten erzeugt in docs/`);
  console.log('  ' + slugs.map((s) => `${s}.html`).join('  '));
}

await build();
