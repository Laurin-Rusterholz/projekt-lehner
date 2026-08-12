/* =========================================================================
   Auswahlmodus für die FlowerTech-Vorschau
   -------------------------------------------------------------------------
   Diese Website wird im FlowerTech-Kundenlink als Vorschau eingebettet. Damit
   die Kundschaft dort sagen kann „genau DIESE Stelle soll anders werden“,
   meldet dieses Skript auf Anforderung, worauf getippt wurde.

   Es läuft ausschliesslich, wenn beides zutrifft:

     1. Die Seite steht in einem Rahmen (window.top !== window.self), und
     2. die Adresse trägt `?embed=flowertech` (oder `?wunsch=1`).

   Für normale Besucherinnen und Besucher passiert hier also nie etwas — kein
   Ereignis wird abgefangen, kein Stil eingefügt, kein Klick umgeleitet.

   Übertragen wird nur, was ohnehin öffentlich auf dieser Seite steht: die
   Adresse der Seite, die id und Überschrift des Abschnitts und eine kurze
   Bezeichnung des angetippten Elements. Kein Markup, kein DOM, keine
   Formularinhalte.

   Gegenstelle ist `fragebogen.html` auf flowertech.ch; sie prüft ihrerseits
   Herkunft und Form jeder Nachricht.
   ========================================================================= */
(() => {
  'use strict';

  const NS = 'flowertech-wunsch';

  let imRahmen = false;
  try {
    imRahmen = window.top !== window.self;
  } catch (e) {
    // Cross-Origin-Zugriff auf window.top ist blockiert — dann steht die Seite
    // sicher in einem fremden Rahmen.
    imRahmen = true;
  }
  /* Der Schalter steht in der Adresse — aber nur auf der ERSTEN Seite. Wer in
     der Vorschau weiterklickt, landet auf `/verpaarungen.html` ohne Parameter,
     und der Auswahlmodus waere still verschwunden. Genau das war der Befund
     „geht ueberhaupt nicht". Deshalb wird die Anforderung fuer diesen Tab
     gemerkt und gilt fuer jede Folgeseite. */
  const MERKER = "ft-embed";
  let angefordert = /[?&](embed=flowertech|wunsch=1)(&|$)/.test(location.search);
  try {
    if (angefordert) window.sessionStorage.setItem(MERKER, "1");
    else if (window.sessionStorage.getItem(MERKER) === "1") angefordert = true;
  } catch (e) {
    /* ohne sessionStorage gilt nur die Adresse */
  }
  if (!imRahmen || !angefordert) return;

  let aktiv = false;
  let markiert = null;

  const stil = document.createElement('style');
  stil.textContent =
    '.ft-pick, .ft-pick * { cursor: crosshair !important; }' +
    '.ft-pick-ziel { outline: 3px solid #a06bff !important; outline-offset: 2px !important;' +
    ' background: rgba(160,107,255,.12) !important; }' +
    '.ft-pick-fahne { position: fixed; left: 50%; bottom: 16px; transform: translateX(-50%);' +
    ' z-index: 2147483647; background: #a06bff; color: #fff;' +
    ' font: 600 13px/1.35 system-ui, -apple-system, sans-serif; padding: 9px 15px;' +
    ' border-radius: 999px; pointer-events: none; box-shadow: 0 6px 24px rgba(0,0,0,.35); }';
  document.head.appendChild(stil);

  const fahne = document.createElement('div');
  fahne.className = 'ft-pick-fahne';
  fahne.hidden = true;
  fahne.textContent = 'Auf die Stelle tippen, die geändert werden soll';

  const anhaengen = () => {
    if (document.body && !fahne.parentNode) document.body.appendChild(fahne);
  };
  if (document.body) anhaengen();
  else document.addEventListener('DOMContentLoaded', anhaengen);

  function senden(nachricht) {
    nachricht.ns = NS;
    try {
      // Ziel ist der Rahmen, der uns eingebettet hat. Er prüft die Herkunft;
      // übertragen werden ausschliesslich öffentliche Angaben dieser Seite.
      window.parent.postMessage(nachricht, '*');
    } catch (e) {
      /* kein Elternfenster erreichbar */
    }
  }

  function markieren(node) {
    if (markiert === node) return;
    if (markiert) markiert.classList.remove('ft-pick-ziel');
    markiert = node;
    if (markiert) markiert.classList.add('ft-pick-ziel');
  }

  /** Kurze, verständliche Bezeichnung des angetippten Elements. */
  function bezeichnung(node) {
    if (!node) return '';
    let t = (node.getAttribute('aria-label') || node.getAttribute('alt') || node.title || '').trim();
    if (!t && node.tagName === 'IMG') t = 'Bild';
    if (!t && (node.tagName === 'VIDEO' || (node.querySelector && node.querySelector('video')))) t = 'Video';
    if (!t) t = (node.textContent || '').replace(/\s+/g, ' ').trim();
    if (!t) t = node.tagName.toLowerCase();
    return t.length > 90 ? t.slice(0, 89) + '…' : t;
  }

  /** Der Abschnitt, in dem das Element sitzt — id und Überschrift. */
  function abschnitt(node) {
    const sec = node.closest && node.closest('section[id], section, article[id], header, footer, main');
    if (!sec) return { id: '', titel: '' };
    const id = sec.id || (sec.tagName === 'HEADER' ? 'header' : sec.tagName === 'FOOTER' ? 'footer' : '');
    const h = sec.querySelector && sec.querySelector('h1, h2, h3');
    return { id: id, titel: h ? h.textContent.replace(/\s+/g, ' ').trim().slice(0, 80) : '' };
  }

  /** Element statt Textknoten — und kleine Hüllen auf etwas Greifbares heben. */
  function ziel(node) {
    if (!node || node.nodeType !== 1) return document.body;
    let n = node;
    while (n.parentElement && /^(SPAN|STRONG|EM|B|I|SMALL|PICTURE|SOURCE|SVG|PATH)$/.test(n.tagName)) {
      n = n.parentElement;
    }
    return n;
  }

  function setzeAktiv(an) {
    aktiv = !!an;
    document.documentElement.classList.toggle('ft-pick', aktiv);
    fahne.hidden = !aktiv;
    if (!aktiv) markieren(null);
  }

  document.addEventListener('mouseover', (e) => {
    if (!aktiv) return;
    markieren(ziel(e.target));
  }, true);

  /* Im Auswahlmodus wird jeder Klick abgefangen: Die Seite soll nicht
     navigieren, sondern die Stelle melden. Ausgeschaltet bleibt die Website
     vollständig bedienbar — Menü, Links, Slider, Formulare. */
  ['click', 'submit'].forEach((typ) => {
    document.addEventListener(typ, (e) => {
      if (!aktiv) return;
      e.preventDefault();
      e.stopPropagation();
      if (typ !== 'click') return;
      const node = ziel(e.target);
      const sec = abschnitt(node);
      markieren(node);
      senden({
        type: 'pick',
        section: sec.id,
        sectionTitle: sec.titel,
        label: bezeichnung(node),
        tag: node.tagName.toLowerCase(),
        /* Ein Verweis oder Knopf waere im Auswahlmodus gesprungen. Der
           Kundenlink sagt deshalb dazu, wie man ihn wirklich oeffnet. */
        oeffnet: !!(node.closest && node.closest('a[href], button, [role="button"]')),
        url: location.href.replace(/([?&])(embed=flowertech|wunsch=1)(&|$)/, '$1').replace(/[?&]$/, ''),
        lang: document.documentElement.lang || '',
      });
    }, true);
  });

  window.addEventListener('message', (e) => {
    const d = e.data;
    if (!d || d.ns !== NS) return;
    if (d.type === 'arm') setzeAktiv(true);
    else if (d.type === 'disarm') setzeAktiv(false);
    else if (d.type === 'clear') markieren(null);
  });

  /* Bereitmeldung: Erst daran erkennt der Kundenlink, dass die Auswahl auf
     dieser Vorschau wirklich verbunden ist. Bleibt sie aus, sagt er es. */
  senden({
    type: 'ready',
    url: location.href,
    lang: document.documentElement.lang || '',
  });
})();
