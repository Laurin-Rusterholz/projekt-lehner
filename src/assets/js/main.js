/* =========================================================================
   Brumag*CH – Britisch Kurzhaar
   Progressive Enhancement: Die Seite funktioniert vollständig ohne JavaScript.
   Dieses Skript ergänzt Menü, Slider, Galerie, Alters-Angaben und Formular.
   ========================================================================= */
(() => {
  'use strict';

  /* -----------------------------------------------------------------------
     Konfiguration
     FORM_ENDPOINT: URL eines Formular-Dienstes (z. B. Formspree, Basin,
     eigenes PHP-Skript). Bleibt der Wert leer, öffnet das Kontaktformular
     stattdessen das E-Mail-Programm – so gehen auch ohne Backend keine
     Anfragen verloren.
     --------------------------------------------------------------------- */
  const FORM_ENDPOINT = '';
  const CONTACT_MAIL = 'info@bkh-brumag.ch';

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));

  /* --- Navigation ------------------------------------------------------ */
  function initNav() {
    const toggle = $('.nav-toggle');
    const nav = $('#hauptnavigation');
    if (!toggle || !nav) return;

    const setOpen = (open) => {
      toggle.setAttribute('aria-expanded', String(open));
      nav.classList.toggle('is-open', open);
    };

    toggle.addEventListener('click', () => {
      setOpen(toggle.getAttribute('aria-expanded') !== 'true');
    });

    nav.addEventListener('click', (e) => {
      if (e.target.closest('a')) setOpen(false);
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && toggle.getAttribute('aria-expanded') === 'true') {
        setOpen(false);
        toggle.focus();
      }
    });

    // Beim Wechsel auf Desktop-Breite den Zustand zurücksetzen.
    window.matchMedia('(min-width: 56rem)').addEventListener('change', (e) => {
      if (e.matches) setOpen(false);
    });
  }

  /* --- Bild-Fallback ---------------------------------------------------
     Erst die lokale, für das Web optimierte Datei. Fehlt sie (weil die
     Originale noch nicht mit `npm run images` geholt wurden), wird auf die
     Originaladresse ausgewichen. Schlägt auch das fehl, zeigt der Rahmen
     einen ruhigen Platzhalter statt eines kaputten Bildsymbols.
     ------------------------------------------------------------------- */
  function handleImageError(img) {
    const frame = img.closest('.media');
    const fallback = img.dataset.fallback;

    if (fallback && img.dataset.fallbackUsed !== 'true') {
      img.dataset.fallbackUsed = 'true';
      const picture = img.closest('picture');
      if (picture) $$('source', picture).forEach((s) => s.remove());
      img.removeAttribute('srcset');
      img.removeAttribute('sizes');
      img.src = fallback;
      return;
    }

    if (frame) {
      frame.classList.add('is-missing');
      if (!frame.dataset.placeholder) {
        frame.dataset.placeholder = img.alt || 'Bild folgt';
      }
    }
  }

  function initImageFallbacks() {
    $$('img[data-fallback]').forEach((img) => {
      img.addEventListener('error', () => handleImageError(img));
      // Bilder, die schon vor dem Laden des Skripts gescheitert sind.
      if (img.complete && img.naturalWidth === 0) handleImageError(img);
    });
  }

  /* --- Hero-Slider ----------------------------------------------------- */
  function initHero() {
    const hero = $('[data-hero]');
    if (!hero) return;

    const slides = $$('.hero__slide', hero);
    if (slides.length < 2) return;

    const dotsBox = $('.hero__dots', hero);
    let index = 0;
    let timer = null;

    const dots = slides.map((_, i) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'hero__dot';
      b.setAttribute('aria-label', `Bild ${i + 1} von ${slides.length} anzeigen`);
      b.addEventListener('click', () => { show(i); restart(); });
      dotsBox.appendChild(b);
      return b;
    });

    function show(next) {
      slides[index].classList.remove('is-active');
      dots[index].removeAttribute('aria-current');
      index = (next + slides.length) % slides.length;
      slides[index].classList.add('is-active');
      dots[index].setAttribute('aria-current', 'true');

      // Nachfolgende Bilder erst laden, wenn sie an die Reihe kommen.
      const upcoming = slides[(index + 1) % slides.length].querySelector('img');
      if (upcoming) upcoming.loading = 'eager';
    }

    function restart() {
      if (timer) clearInterval(timer);
      if (prefersReducedMotion.matches) return;
      timer = setInterval(() => show(index + 1), 6500);
    }

    show(0);
    restart();

    hero.addEventListener('mouseenter', () => timer && clearInterval(timer));
    hero.addEventListener('mouseleave', restart);
    hero.addEventListener('focusin', () => timer && clearInterval(timer));
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) { if (timer) clearInterval(timer); } else { restart(); }
    });
    prefersReducedMotion.addEventListener('change', restart);
  }

  /* --- Lightbox für Galerien ------------------------------------------- */
  function initLightbox() {
    const triggers = $$('[data-lightbox]');
    if (!triggers.length || !window.HTMLDialogElement) return;

    const dialog = document.createElement('dialog');
    dialog.className = 'lightbox';
    dialog.innerHTML = `
      <div class="lightbox__inner">
        <button type="button" class="lightbox__btn lightbox__close" data-close aria-label="Galerie schliessen">✕</button>
        <figure class="lightbox__figure"><img alt=""></figure>
        <div class="lightbox__bar">
          <button type="button" class="lightbox__btn" data-prev aria-label="Vorheriges Bild">‹</button>
          <p class="lightbox__caption" role="status"></p>
          <button type="button" class="lightbox__btn" data-next aria-label="Nächstes Bild">›</button>
        </div>
      </div>`;
    document.body.appendChild(dialog);

    const img = $('img', dialog);
    const caption = $('.lightbox__caption', dialog);
    let current = 0;
    let opener = null;

    function render(i) {
      current = (i + triggers.length) % triggers.length;
      const t = triggers[current];
      const source = t.querySelector('img');
      // Reihenfolge: grosse Datei → das bereits geladene Vorschaubild → Originaladresse.
      img.dataset.chain = [source?.currentSrc, source?.dataset.fallback].filter(Boolean).join('|');
      img.src = t.dataset.full || source?.currentSrc || source?.src || '';
      img.alt = source?.alt || '';
      caption.textContent = `${t.dataset.caption || source?.alt || ''} (${current + 1} von ${triggers.length})`;
    }

    img.addEventListener('error', () => {
      const chain = (img.dataset.chain || '').split('|').filter(Boolean);
      const next = chain.shift();
      img.dataset.chain = chain.join('|');
      if (next && next !== img.src) img.src = next;
    });

    triggers.forEach((t, i) => {
      t.addEventListener('click', () => {
        opener = t;
        render(i);
        dialog.showModal();
      });
    });

    dialog.addEventListener('click', (e) => {
      if (e.target.closest('[data-close]') || e.target === dialog) dialog.close();
      if (e.target.closest('[data-next]')) render(current + 1);
      if (e.target.closest('[data-prev]')) render(current - 1);
    });

    dialog.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowRight') { e.preventDefault(); render(current + 1); }
      if (e.key === 'ArrowLeft') { e.preventDefault(); render(current - 1); }
    });

    dialog.addEventListener('close', () => {
      img.removeAttribute('src');
      if (opener) opener.focus();
    });
  }

  /* --- Alter aus Geburtsdatum ------------------------------------------ */
  function initAges() {
    const now = new Date();
    $$('[data-birth]').forEach((el) => {
      const raw = el.dataset.birth;
      const [y, m = '1', d = '1'] = raw.split('-');
      const birth = new Date(Number(y), Number(m) - 1, Number(d));
      if (Number.isNaN(birth.getTime()) || birth > now) return;

      let months = (now.getFullYear() - birth.getFullYear()) * 12 + (now.getMonth() - birth.getMonth());
      if (now.getDate() < birth.getDate()) months -= 1;

      let text;
      if (months < 1) {
        const weeks = Math.floor((now - birth) / 6048e5);
        text = weeks <= 1 ? 'wenige Tage alt' : `${weeks} Wochen alt`;
      } else if (months < 24) {
        text = months === 1 ? '1 Monat alt' : `${months} Monate alt`;
      } else {
        const years = Math.floor(months / 12);
        text = `${years} Jahre alt`;
      }

      const out = document.createElement('span');
      out.className = 'age';
      out.textContent = ` · ${text}`;
      el.appendChild(out);
    });
  }

  /* --- Kontaktformular -------------------------------------------------- */
  function initForm() {
    const form = $('[data-contact-form]');
    if (!form) return;

    const status = $('.form__status', form);
    const submit = $('button[type="submit"]', form);

    const say = (message, kind) => {
      status.textContent = message;
      status.classList.toggle('is-ok', kind === 'ok');
      status.classList.toggle('is-error', kind === 'error');
    };

    if (!FORM_ENDPOINT) {
      form.dataset.mode = 'mailto';
    }

    form.addEventListener('submit', async (e) => {
      // Honigtopf: von Menschen unsichtbar, von Bots gern ausgefüllt.
      if (form.elements.website && form.elements.website.value) {
        e.preventDefault();
        return;
      }
      if (!form.reportValidity()) return;
      e.preventDefault();

      const data = new FormData(form);
      data.delete('website');

      if (!FORM_ENDPOINT) {
        const body = [
          `Name: ${data.get('name') || ''}`,
          `E-Mail: ${data.get('email') || ''}`,
          `Telefon: ${data.get('telefon') || ''}`,
          '',
          data.get('nachricht') || ''
        ].join('\n');
        const href = `mailto:${CONTACT_MAIL}?subject=${encodeURIComponent(data.get('betreff') || 'Anfrage über bkh-brumag.ch')}&body=${encodeURIComponent(body)}`;
        window.location.href = href;
        say('Ihr E-Mail-Programm wurde geöffnet. Klappt das nicht, schreiben Sie uns direkt an ' + CONTACT_MAIL + '.', 'ok');
        return;
      }

      submit.disabled = true;
      say('Anfrage wird gesendet …', null);
      try {
        const res = await fetch(FORM_ENDPOINT, {
          method: 'POST',
          body: data,
          headers: { Accept: 'application/json' }
        });
        if (!res.ok) throw new Error(res.statusText);
        form.reset();
        say('Vielen Dank – Ihre Nachricht ist bei uns eingegangen. Wir melden uns in den nächsten Tagen.', 'ok');
      } catch (err) {
        say(`Das Senden hat leider nicht geklappt. Bitte schreiben Sie uns direkt an ${CONTACT_MAIL} oder rufen Sie an.`, 'error');
      } finally {
        submit.disabled = false;
      }
    });
  }

  /* --- Jahreszahl in der Fusszeile -------------------------------------- */
  function initYear() {
    const el = $('[data-current-year]');
    if (el) el.textContent = String(new Date().getFullYear());
  }

  /* --- Start ------------------------------------------------------------ */
  initNav();
  initImageFallbacks();
  initHero();
  initLightbox();
  initAges();
  initForm();
  initYear();
})();
