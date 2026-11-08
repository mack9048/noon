// Noon Learn website: mobile menu, Courses dropdown on touch, filters, tabs and the
// demo/contact forms (they open WhatsApp, or email when no WhatsApp number is set).
(function () {
  var cfg = window.NOON || {};
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  // Mobile menu
  var menu = $('#mobile-menu');
  $$('[data-menu-open]').forEach(function (b) { b.addEventListener('click', function () { menu.classList.add('open'); b.setAttribute('aria-expanded', 'true'); $('.close', menu).focus(); }); });
  $$('[data-menu-close]').forEach(function (b) { b.addEventListener('click', function () { menu.classList.remove('open'); }); });
  if (menu) menu.addEventListener('click', function (e) { if (e.target === menu) menu.classList.remove('open'); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && menu) menu.classList.remove('open'); });

  // Courses dropdown: tap to open on touch screens
  $$('.dd-btn').forEach(function (b) {
    b.addEventListener('click', function () {
      var dd = b.parentElement; var open = !dd.classList.contains('open');
      dd.classList.toggle('open', open); b.setAttribute('aria-expanded', String(open));
    });
  });
  document.addEventListener('click', function (e) { $$('.dd.open').forEach(function (dd) { if (!dd.contains(e.target)) dd.classList.remove('open'); }); });

  // Filter chips: <div data-filter="group"> buttons with data-value; items with data-tags
  $$('[data-filter]').forEach(function (bar) {
    var group = bar.getAttribute('data-filter');
    var items = $$('[data-group="' + group + '"] [data-tags]');
    var freeOnly = $('[data-free-only="' + group + '"]');
    var count = $('[data-count="' + group + '"]');
    var current = 'all';
    function apply() {
      var shown = 0;
      items.forEach(function (it) {
        var ok = (current === 'all' || (' ' + it.getAttribute('data-tags') + ' ').indexOf(' ' + current + ' ') > -1) && (!freeOnly || !freeOnly.checked || it.hasAttribute('data-free'));
        it.hidden = !ok; if (ok) shown++;
      });
      if (count) count.textContent = shown + (shown === 1 ? ' item' : ' items');
    }
    $$('button[data-value]', bar).forEach(function (btn) {
      btn.addEventListener('click', function () {
        current = btn.getAttribute('data-value');
        $$('button[data-value]', bar).forEach(function (x) { x.setAttribute('aria-pressed', String(x === btn)); });
        apply();
      });
    });
    if (freeOnly) freeOnly.addEventListener('change', apply);
    apply();
  });

  // Simple single-choice buttons (boards, classes, "I am a ...")
  $$('[data-choice]').forEach(function (bar) {
    $$('button', bar).forEach(function (btn) {
      btn.addEventListener('click', function () {
        $$('button', bar).forEach(function (x) { x.setAttribute('aria-pressed', String(x === btn)); });
        var target = bar.getAttribute('data-choice');
        if (target) { var out = $(target); if (out) out.textContent = btn.getAttribute('data-label') || btn.textContent.trim(); }
      });
    });
  });

  // Tabs: [role=tablist] with buttons aria-controls
  $$('[role="tablist"]').forEach(function (list) {
    var tabs = $$('[role="tab"]', list);
    tabs.forEach(function (t) {
      t.addEventListener('click', function () {
        tabs.forEach(function (x) { var on = x === t; x.setAttribute('aria-selected', String(on)); var p = document.getElementById(x.getAttribute('aria-controls')); if (p) p.hidden = !on; });
      });
    });
  });

  // Forms → WhatsApp (if a number is set) or email
  $$('form[data-send]').forEach(function (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var data = new FormData(form); var lines = [form.getAttribute('data-send')];
      data.forEach(function (v, k) { if (String(v).trim()) lines.push(k + ': ' + v); });
      var who = $('[data-choice] [aria-pressed="true"]', form); if (who) lines.push('I am: ' + who.textContent.trim());
      var text = lines.join('\n');
      var wa = (cfg.whatsapp || '').replace(/\D/g, '');
      var url = wa ? 'https://wa.me/' + wa + '?text=' + encodeURIComponent(text)
        : 'mailto:' + (cfg.email || 'hello@noonlearn.app') + '?subject=' + encodeURIComponent(form.getAttribute('data-send')) + '&body=' + encodeURIComponent(text);
      window.open(url, '_blank', 'noopener');
      var ok = $('.form-ok', form); if (ok) ok.classList.add('show');
    });
  });

  // Year in footer
  $$('[data-year]').forEach(function (el) { el.textContent = new Date().getFullYear(); });
})();
