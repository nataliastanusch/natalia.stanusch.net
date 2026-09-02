/* Two things that answer to the scroll direction, and they answer to it in
   opposite directions on purpose:

     scrolling up    the header comes back, the kitten ducks away
     scrolling down  the header retracts, the kitten pops up

   So exactly one way back is on screen at any moment - the nav when you
   are heading up the page, the cat when you are heading down it - and they
   never compete for the same corner of the eye.

   Only on interior pages. The homepage is a single screen with nothing to
   scroll and a particle field the header should stay transparent over. */
(function () {
  var body = document.body;
  if (body.classList.contains('home')) return;

  var header = document.querySelector('.topbar');
  var cat    = document.querySelector('.cat-top');
  if (!header && !cat) return;

  /* Below this the header never retracts: on the first screen there is
     nothing to have scrolled past, and hiding it would just look like a
     glitch. */
  var ARM = 140;

  /* Ignore anything smaller. Trackpads and phones emit a constant dribble
     of one- and two-pixel scrolls, and reacting to those makes the header
     flicker on a page that is, to the reader, standing still. */
  var DELTA = 8;

  var lastY = window.pageYOffset || 0;
  var ticking = false;
  var catShown = false;
  var clicks = 0;

  var reduceMotion = window.matchMedia &&
                     window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function track(name, data) {
    if (window.siteTrack) window.siteTrack(name, data);
  }

  function showCat(on) {
    if (!cat || catShown === on) return;
    catShown = on;
    /* `hidden` is dropped before the class goes on, and only put back once
       the transition has run, so the cat animates in and out instead of
       blinking. While hidden it is out of the tab order too. */
    if (on) {
      cat.hidden = false;
      /* Forces the frame in between, or the browser folds both style
         changes together and there is nothing to transition from. */
      void cat.offsetWidth;
      cat.classList.add('is-in');
    } else {
      cat.classList.remove('is-in');
      if (reduceMotion) cat.hidden = true;
    }
  }

  if (cat) {
    cat.addEventListener('transitionend', function (e) {
      if (e.propertyName === 'transform' && !catShown) cat.hidden = true;
    });
  }

  function headerLocked() {
    /* Don't pull the header out from under someone who is using it: the
       accent panel hangs off it, and a keyboard user may be inside it. */
    if (!header) return true;
    var panel = header.querySelector('.accent-panel');
    if (panel && !panel.hidden) return true;
    return header.contains(document.activeElement);
  }

  function update() {
    ticking = false;

    var y = window.pageYOffset || 0;
    var diff = y - lastY;

    /* A page barely longer than the window has nothing to offer either
       control, and the browser's own bounce would toggle them constantly. */
    var scrollable = document.documentElement.scrollHeight - window.innerHeight;
    if (scrollable < ARM) {
      if (header) header.classList.remove('is-hidden', 'is-stuck');
      showCat(false);
      lastY = y;
      return;
    }

    if (header) header.classList.toggle('is-stuck', y > 4);

    if (y <= ARM) {
      if (header) header.classList.remove('is-hidden');
      showCat(false);
      lastY = y;
      return;
    }

    if (Math.abs(diff) < DELTA) return;   // keep lastY, wait for a real move

    if (diff > 0) {
      if (header && !headerLocked()) header.classList.add('is-hidden');
      showCat(true);
    } else {
      if (header) header.classList.remove('is-hidden');
      showCat(false);
    }

    lastY = y;
  }

  window.addEventListener('scroll', function () {
    if (ticking) return;
    ticking = true;
    window.requestAnimationFrame(update);
  }, { passive: true });

  /* The header must not stay hidden over a heading someone just tabbed to. */
  window.addEventListener('focusin', function (e) {
    if (header && header.contains(e.target)) header.classList.remove('is-hidden');
  });

  if (cat) {
    cat.addEventListener('click', function () {
      clicks++;
      track('back-to-top', { via: 'kitten', from: location.pathname });
      /* Nobody clicks a cat five times to get to the top of a page. */
      if (clicks === 5) track('easter-egg-kitten', { from: location.pathname });

      cat.classList.add('is-hopping');
      setTimeout(function () { cat.classList.remove('is-hopping'); }, 420);

      window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' });
    });
  }

  update();
})();
