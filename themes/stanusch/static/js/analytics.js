/* Umami events.

   Two ways in, and each is used where it fits:

     data-umami-event="..."   on markup the server writes once and never
                              touches again - the nav, the theme toggle,
                              the social icons. Self-documenting, and it
                              works whether or not this file loads.

     window.siteTrack(...)    everywhere else. The filter bar and the
                              entry list are rebuilt in JavaScript, so an
                              attribute on a rebuilt node would never be
                              bound. Those go through the helper below.

   Anything inside #entries is delegated from the document rather than
   bound per element, for the same reason: the nodes are replaced whenever
   a filter changes.

   Nothing here collects anything about a person. Umami is cookieless, and
   the payloads below are the name of a tag or a section, never a visitor. */
(function () {
  var QUEUE = [];
  var tries = 0;

  function send(name, data) {
    if (window.umami && typeof window.umami.track === 'function') {
      try { window.umami.track(name, data); } catch (e) {}
      return true;
    }
    return false;
  }

  /* The umami script is deferred and sits at the foot of the page, so an
     early event can land before it exists. Hold those and flush once it
     turns up; give up after ten seconds rather than leak a growing array. */
  function flush() {
    if (!QUEUE.length) return;
    if (!send(QUEUE[0].n, QUEUE[0].d)) {
      if (++tries > 20) { QUEUE.length = 0; return; }
      setTimeout(flush, 500);
      return;
    }
    QUEUE.shift();
    flush();
  }

  window.siteTrack = function (name, data) {
    if (!name) return;
    if (send(name, data)) return;
    if (QUEUE.length < 50) QUEUE.push({ n: name, d: data });
    setTimeout(flush, 500);
  };

  /* ---------- delegated link tracking ---------- */

  var host = window.location.host;

  function label(el, fallback) {
    var t = (el.textContent || '').replace(/\s+/g, ' ').trim();
    return t ? t.slice(0, 60) : fallback;
  }

  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a[href]');
    if (!a) return;

    /* Already carries its own event name - umami handles it, and doing it
       again here would count the click twice. */
    if (a.hasAttribute('data-umami-event')) return;

    var href = a.getAttribute('href') || '';

    if (href.indexOf('mailto:') === 0) {
      window.siteTrack('email-click', { from: location.pathname });
      return;
    }

    /* Where the click happened matters more than the link itself. */
    if (a.closest('.entry-more')) {
      var sr = a.querySelector('.sr-only');
      window.siteTrack('entry-read-more', {
        entry: sr ? sr.textContent.replace(/^:\s*/, '').slice(0, 60)
                  : (a.getAttribute('href') || ''),
        section: location.pathname.split('/')[1] || ''
      });
      return;
    }

    if (a.closest('.tags')) {
      window.siteTrack('tag-link', {
        tag: label(a, ''),
        from: location.pathname
      });
      return;
    }

    if (a.closest('.to-top')) {
      window.siteTrack('back-to-top', { via: 'link', from: location.pathname });
      return;
    }

    if (a.closest('.back')) {
      window.siteTrack('back-link', { to: href });
      return;
    }

    /* Everything that leaves the site, wherever it sits. Mostly the DOIs
       and press links inside entries, which is the number worth having. */
    if (a.host && a.host !== host) {
      window.siteTrack('outbound', {
        url: (a.host + a.pathname).slice(0, 80),
        from: location.pathname
      });
    }
  }, true);
})();
