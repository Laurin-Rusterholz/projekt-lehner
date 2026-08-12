/*
 * Die Vorschau-Zentrale, Verhalten.
 * ---------------------------------------------------------------------------
 * Vier Ansichten an EINER Adresse: Website, Verwaltung, Offerte, AGB & Kunde.
 * Website und Verwaltung sind echte Seiten in einem Rahmenfenster — was hier
 * zu sehen ist, ist wirklich die ausgelieferte Seite und kein Abbild davon.
 *
 * Der Änderungswunsch wird ausdrücklich NICHT von hier verschickt: Diese Seite
 * hat keinen Posteingang. Sie stellt den Text zusammen und legt ihn in die
 * Zwischenablage — abgeschickt wird er über den FlowerTech-Kundenlink, wo der
 * Wunsch direkt am richtigen Vorgang landet. Lieber ein ehrlicher Zwischen-
 * schritt als ein Knopf, der so tut, als ginge etwas raus.
 */
(function () {
  'use strict';

  var d = document;
  var $ = function (sel) { return d.querySelector(sel); };
  var $$ = function (sel) { return Array.prototype.slice.call(d.querySelectorAll(sel)); };

  var rahmen = $('#rahmen');
  var rahmenFeld = $('#rahmenFeld');
  var rahmenHinweis = $('#rahmenHinweis');
  var ANSICHTEN = ['website', 'verwaltung', 'offerte', 'agb'];

  /* ── Ansicht wechseln ─────────────────────────────────────────────────── */

  function zeige(ansicht, ersetzeVerlauf) {
    if (ANSICHTEN.indexOf(ansicht) < 0) ansicht = 'website';

    $$('.schalter__knopf').forEach(function (knopf) {
      knopf.setAttribute('aria-selected', String(knopf.dataset.ansicht === ansicht));
    });

    var imRahmen = ansicht === 'website' || ansicht === 'verwaltung';
    if (rahmenFeld) rahmenFeld.hidden = !imRahmen;
    if (rahmenHinweis) rahmenHinweis.hidden = !imRahmen;
    $$('.tafel').forEach(function (tafel) { tafel.hidden = tafel.dataset.ansicht !== ansicht; });

    if (imRahmen && rahmen) {
      var ziel = rahmen.dataset[ansicht];
      // Nur neu laden, wenn wirklich eine andere Seite gemeint ist.
      if (ziel && rahmen.getAttribute('src') !== ziel) rahmen.setAttribute('src', ziel);
      if (rahmenHinweis) rahmenHinweis.textContent = rahmen.dataset[ansicht + 'Hinweis'] || '';
    }

    var frisch = ansicht === 'website' ? location.pathname : location.pathname + '?ansicht=' + ansicht;
    try {
      if (ersetzeVerlauf) history.replaceState({ ansicht: ansicht }, '', frisch);
      else history.pushState({ ansicht: ansicht }, '', frisch);
    } catch (e) { /* file:// oder gesperrter Verlauf — die Ansicht stimmt trotzdem */ }
  }

  $$('.schalter__knopf').forEach(function (knopf) {
    knopf.addEventListener('click', function () { zeige(knopf.dataset.ansicht, false); });
  });

  window.addEventListener('popstate', function (ev) {
    zeige((ev.state && ev.state.ansicht) || param('ansicht') || 'website', true);
  });

  function param(name) {
    try { return new URLSearchParams(location.search).get(name) || ''; } catch (e) { return ''; }
  }

  /* ── Handyansicht und Neu laden ───────────────────────────────────────── */

  var handyKnopf = $('#handy');
  if (handyKnopf && rahmenFeld) {
    handyKnopf.addEventListener('click', function () {
      var an = rahmenFeld.dataset.geraet === 'handy';
      rahmenFeld.dataset.geraet = an ? 'desktop' : 'handy';
      handyKnopf.setAttribute('aria-pressed', String(!an));
      handyKnopf.textContent = an ? '📱 Handyansicht' : '🖥 Volle Breite';
    });
  }

  var neuKnopf = $('#neuLaden');
  if (neuKnopf && rahmen) {
    neuKnopf.addEventListener('click', function () {
      // Ein Zeitstempel erzwingt das echte Neuladen, auch bei gecachter Seite.
      var basis = (rahmen.getAttribute('src') || '/').split('#')[0].split('?')[0];
      rahmen.setAttribute('src', basis + '?stand=' + Date.now());
    });
  }

  /* ── Änderungsleiste: Filter ──────────────────────────────────────────── */

  function filtere(bereich) {
    $$('.filter__knopf').forEach(function (knopf) {
      knopf.setAttribute('aria-pressed', String(knopf.dataset.filter === bereich));
    });
    var sichtbar = 0;
    $$('.eintrag').forEach(function (eintrag) {
      var passt = bereich === 'alle' || eintrag.dataset.bereich === bereich;
      eintrag.hidden = !passt;
      if (passt) sichtbar += 1;
    });
    var zaehler = $('#zaehler');
    if (zaehler) {
      zaehler.textContent = sichtbar === 1 ? '1 Eintrag' : sichtbar + ' Einträge';
    }
  }

  $$('.filter__knopf').forEach(function (knopf) {
    knopf.addEventListener('click', function () { filtere(knopf.dataset.filter); });
  });

  /* ── Änderungswunsch: zusammenstellen, nicht verschicken ──────────────── */

  var wunschFeld = $('#wunsch');
  var wunschKnopf = $('#wunschKopieren');
  var wunschStatus = $('#wunschStatus');

  function melde(text, gut) {
    if (!wunschStatus) return;
    wunschStatus.textContent = text;
    wunschStatus.style.color = gut ? '' : '#a4322b';
  }

  if (wunschKnopf && wunschFeld) {
    wunschKnopf.addEventListener('click', function () {
      var text = String(wunschFeld.value || '').trim();
      if (text.length < 3) {
        melde('Bitte kurz beschreiben, was geändert werden soll.', false);
        wunschFeld.focus();
        return;
      }
      var projekt = (d.body.dataset.projekt || 'Website-Projekt');
      var voll = 'Änderungswunsch zu: ' + projekt + '\n\n' + text;

      var fertig = function () {
        melde('Kopiert. Fügen Sie ihn auf Ihrem Kundenlink ein — dort geht er ab.', true);
      };
      var gescheitert = function () {
        // Kein stiller Fehlschlag: Der Text wird markiert, damit er von Hand
        // kopiert werden kann.
        wunschFeld.value = voll;
        wunschFeld.focus();
        wunschFeld.select();
        melde('Bitte mit Strg/Cmd + C kopieren.', false);
      };

      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(voll).then(fertig, gescheitert);
      } else {
        gescheitert();
      }
    });
  }

  var wunschSprung = $('#zumWunsch');
  if (wunschSprung && wunschFeld) {
    wunschSprung.addEventListener('click', function (ev) {
      ev.preventDefault();
      wunschFeld.scrollIntoView({ block: 'center' });
      wunschFeld.focus();
    });
  }

  /* ── Start ────────────────────────────────────────────────────────────── */

  filtere('alle');
  zeige(param('ansicht') || 'website', true);
})();
