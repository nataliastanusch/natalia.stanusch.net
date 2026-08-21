/* Theme toggle + the accent picker hidden behind five clicks on the header.
   All the colour maths lives in window.SiteTheme (set inline in <head>),
   so there is only one implementation of it. */
(function () {
  var T = window.SiteTheme;
  if (!T) return;

  var header = document.querySelector('.topbar');
  var toggle = document.querySelector('.theme-toggle');

  /* ---------- Theme toggle ---------- */

  function syncToggle() {
    if (!toggle) return;
    var dark = T.isDark();
    toggle.dataset.mode = dark ? 'dark' : 'light';
    toggle.setAttribute('aria-pressed', dark ? 'true' : 'false');
    toggle.setAttribute('aria-label',
      dark ? 'Switch to light theme' : 'Switch to dark theme');
  }

  if (toggle) {
    toggle.addEventListener('click', function () {
      var next = T.isDark() ? 'light' : 'dark';
      T.write('theme', next);          // only written once they interact
      T.setTheme(next);
      syncToggle();
    });
    syncToggle();
  }

  /* Follow the system while they haven't chosen for themselves. */
  if (window.matchMedia) {
    var mq = window.matchMedia('(prefers-color-scheme: dark)');
    var onSystemChange = function () {
      if (T.savedTheme()) return;      // they've chosen; leave them alone
      T.setTheme(null);
      syncToggle();
    };
    if (mq.addEventListener) mq.addEventListener('change', onSystemChange);
    else if (mq.addListener) mq.addListener(onSystemChange);
  }

  /* ---------- Accent picker ---------- */

  var panel  = document.querySelector('.accent-panel');
  if (!panel || !header) return;

  var select = panel.querySelector('.accent-select');
  var custom = panel.querySelector('.accent-custom');
  var reset  = panel.querySelector('.accent-reset');
  var close  = panel.querySelector('.accent-close');

  function openPanel() {
    panel.hidden = false;
    var current = T.accent();
    if (custom) custom.value = current;
    if (select) {
      // Match the dropdown to the current colour if it's one of the presets.
      select.value = current.toLowerCase();
      if (select.value !== current.toLowerCase()) select.selectedIndex = -1;
      select.focus();
    }
  }

  function closePanel() {
    panel.hidden = true;
  }

  function choose(hex) {
    if (!/^#[0-9a-f]{6}$/i.test(hex)) return;
    T.setAccent(hex);
    if (custom) custom.value = hex;
    syncToggle();
  }

  if (select) select.addEventListener('change', function () { choose(select.value); });
  if (custom) custom.addEventListener('input',  function () { choose(custom.value); });

  if (reset) {
    reset.addEventListener('click', function () {
      T.write('theme', null);
      T.write('accent', null);
      T.setTheme(null);                // back to following the system
      syncToggle();
      if (custom) custom.value = T.DEFAULT_ACCENT;
      if (select) select.value = T.DEFAULT_ACCENT;
    });
  }

  if (close) close.addEventListener('click', closePanel);

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && !panel.hidden) closePanel();
  });

  /* Five clicks on the header - but not on anything you could have
     meant to click, or navigating the site would trip it constantly. */
  var clicks = 0, timer = null;

  header.addEventListener('click', function (e) {
    if (e.target.closest('a, button, input, select, label')) return;

    clicks++;
    clearTimeout(timer);
    timer = setTimeout(function () { clicks = 0; }, 1500);

    if (clicks >= 5) {
      clicks = 0;
      openPanel();
    }
  });
})();
