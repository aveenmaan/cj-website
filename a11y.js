/* CJ's Liquors — Accessibility widget
   Text size, contrast, dyslexia-friendly font, highlight links, pause animations, reading guide.
   Preferences persist per device (localStorage). Include in <head>: prefs apply before first paint. */
(function () {
  'use strict';
  var KEY = 'cjs-a11y-prefs';
  var DEFAULTS = { textSize: 1, contrast: 'normal', font: 'default', highlightLinks: false, pauseAnimations: false, readingGuide: false };
  var ZOOM = { 0: '0.9', 1: '1', 2: '1.15', 3: '1.3' };
  var root = document.documentElement;
  var state = Object.assign({}, DEFAULTS);

  try { Object.assign(state, JSON.parse(localStorage.getItem(KEY) || '{}')); } catch (e) {}

  var fontLoaded = false;
  function loadDyslexicFont() {
    if (fontLoaded) return;
    fontLoaded = true;
    var l = document.createElement('link');
    l.rel = 'stylesheet';
    l.href = 'https://fonts.googleapis.com/css2?family=Atkinson+Hyperlegible:wght@400;700&display=swap';
    document.head.appendChild(l);
  }

  function apply() {
    root.style.setProperty('zoom', ZOOM[state.textSize] || '1');
    root.style.setProperty('--a11y-zoom', ZOOM[state.textSize] || '1');
    root.setAttribute('data-a11y-contrast', state.contrast);
    root.setAttribute('data-a11y-font', state.font);
    root.setAttribute('data-a11y-highlight-links', String(state.highlightLinks));
    root.setAttribute('data-a11y-pause-motion', String(state.pauseAnimations));
    if (state.font === 'dyslexic') loadDyslexicFont();
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) {}
    syncUI();
    syncGuide();
  }

  // ── Reading guide ────────────────────────────────────────────────
  var guide = null;
  function moveGuide(e) {
    var y = e.touches && e.touches[0] ? e.touches[0].clientY : e.clientY;
    if (guide && typeof y === 'number') guide.style.top = (y - 20) + 'px';
  }
  function syncGuide() {
    if (state.readingGuide && !guide) {
      guide = document.createElement('div');
      guide.className = 'a11y-reading-guide';
      guide.setAttribute('aria-hidden', 'true');
      guide.style.top = '40%';
      document.body.appendChild(guide);
      window.addEventListener('mousemove', moveGuide, { passive: true });
      window.addEventListener('touchmove', moveGuide, { passive: true });
    } else if (!state.readingGuide && guide) {
      window.removeEventListener('mousemove', moveGuide);
      window.removeEventListener('touchmove', moveGuide);
      guide.remove();
      guide = null;
    }
  }

  // ── Widget UI ────────────────────────────────────────────────────
  var fab, panel, built = false, lastFocus = null;

  function opt(group, value, label) {
    return '<button type="button" class="a11y-opt" data-group="' + group + '" data-value="' + value + '" aria-pressed="false">' + label + '</button>';
  }
  function toggle(key, label) {
    return '<div class="a11y-row"><span id="a11y-l-' + key + '">' + label + '</span>' +
      '<button type="button" class="a11y-switch" role="switch" aria-checked="false" aria-labelledby="a11y-l-' + key + '" data-toggle="' + key + '"><span class="a11y-knob"></span></button></div>';
  }

  function build() {
    if (built) return;
    built = true;

    fab = document.createElement('button');
    fab.type = 'button';
    fab.className = 'a11y-fab';
    fab.setAttribute('aria-label', 'Open accessibility menu');
    fab.setAttribute('aria-expanded', 'false');
    fab.setAttribute('aria-controls', 'a11y-panel');
    fab.innerHTML = '<svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="4.5" r="1.8"/><path d="M5 8.5l7 1.5 7-1.5M12 10v5M12 15l-3.5 6M12 15l3.5 6"/></svg>';

    panel = document.createElement('div');
    panel.id = 'a11y-panel';
    panel.className = 'a11y-panel';
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-label', 'Accessibility options');
    panel.hidden = true;
    panel.innerHTML =
      '<div class="a11y-head"><div><h2 class="a11y-title">Accessibility</h2><p class="a11y-sub">Preferences are saved on this device.</p></div>' +
      '<button type="button" class="a11y-close" aria-label="Close accessibility menu">&#10005;</button></div>' +
      '<div class="a11y-sec"><div class="a11y-label" id="a11y-h-size">Text Size</div><div class="a11y-grid a11y-g4" role="group" aria-labelledby="a11y-h-size">' +
        opt('textSize', 0, 'A-') + opt('textSize', 1, 'A') + opt('textSize', 2, 'A+') + opt('textSize', 3, 'A++') + '</div></div>' +
      '<div class="a11y-sec"><div class="a11y-label" id="a11y-h-contrast">Contrast</div><div class="a11y-grid a11y-g2" role="group" aria-labelledby="a11y-h-contrast">' +
        opt('contrast', 'normal', 'Normal') + opt('contrast', 'high', 'High Contrast') + '</div></div>' +
      '<div class="a11y-sec"><div class="a11y-label" id="a11y-h-font">Font</div><div class="a11y-grid a11y-g2" role="group" aria-labelledby="a11y-h-font">' +
        opt('font', 'default', 'Default') + opt('font', 'dyslexic', 'Dyslexia-Friendly') + '</div></div>' +
      '<div class="a11y-toggles">' + toggle('highlightLinks', 'Highlight Links') + toggle('pauseAnimations', 'Pause Animations') + toggle('readingGuide', 'Reading Guide') + '</div>' +
      '<button type="button" class="a11y-reset">Reset All</button>';

    document.body.appendChild(panel);
    document.body.appendChild(fab);

    fab.addEventListener('click', function () { panel.hidden ? openPanel() : closePanel(); });
    panel.querySelector('.a11y-close').addEventListener('click', closePanel);
    panel.querySelector('.a11y-reset').addEventListener('click', function () { state = Object.assign({}, DEFAULTS); apply(); });

    panel.addEventListener('click', function (e) {
      var o = e.target.closest('.a11y-opt');
      if (o) {
        var g = o.getAttribute('data-group'), v = o.getAttribute('data-value');
        state[g] = g === 'textSize' ? parseInt(v, 10) : v;
        apply();
        return;
      }
      var s = e.target.closest('.a11y-switch');
      if (s) { var k = s.getAttribute('data-toggle'); state[k] = !state[k]; apply(); }
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && !panel.hidden) { closePanel(); fab.focus(); }
    });
    document.addEventListener('click', function (e) {
      if (!panel.hidden && !panel.contains(e.target) && !fab.contains(e.target)) closePanel();
    });

    syncUI();
  }

  function openPanel() {
    lastFocus = document.activeElement;
    panel.hidden = false;
    fab.setAttribute('aria-expanded', 'true');
    fab.setAttribute('aria-label', 'Close accessibility menu');
    var first = panel.querySelector('.a11y-close');
    if (first) first.focus();
  }
  function closePanel() {
    panel.hidden = true;
    fab.setAttribute('aria-expanded', 'false');
    fab.setAttribute('aria-label', 'Open accessibility menu');
  }

  function syncUI() {
    if (!built) return;
    panel.querySelectorAll('.a11y-opt').forEach(function (b) {
      var on = String(state[b.getAttribute('data-group')]) === b.getAttribute('data-value');
      b.classList.toggle('active', on);
      b.setAttribute('aria-pressed', String(on));
    });
    panel.querySelectorAll('.a11y-switch').forEach(function (b) {
      var on = !!state[b.getAttribute('data-toggle')];
      b.classList.toggle('on', on);
      b.setAttribute('aria-checked', String(on));
    });
  }

  apply();
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { build(); syncGuide(); });
  } else { build(); syncGuide(); }
})();
