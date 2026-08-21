/* Particle field. Re-runnable: the accent colour can change at any time,
   and particles.js has no way to recolour an existing instance. */
window.initParticles = function () {
  var el = document.getElementById('particles-js');
  if (!el || typeof particlesJS !== 'function') return;

  // Tear down any existing instance before building a new one.
  if (window.pJSDom && window.pJSDom.length) {
    try {
      window.pJSDom.forEach(function (d) { d.pJS.fn.vendors.destroypJS(); });
    } catch (e) {}
    window.pJSDom = [];
  }
  el.innerHTML = '';

  var accent = getComputedStyle(document.documentElement)
                 .getPropertyValue('--accent-display').trim() || '#9b0012';

  var still = window.matchMedia &&
              window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  particlesJS('particles-js', {
    particles: {
      number:  { value: 80, density: { enable: true, value_area: 900 } },
      color:   { value: accent },
      shape:   { type: 'circle' },
      opacity: { value: 0.75, random: false },
      size:    { value: 2.4, random: true },
      line_linked: {
        enable: true,
        distance: 150,
        color: accent,
        opacity: 0.35,
        width: 1
      },
      move: {
        enable: !still,
        speed: 1.8,
        direction: 'none',
        random: false,
        straight: false,
        out_mode: 'out',
        bounce: false
      }
    },
    interactivity: {
      detect_on: 'window',
      events: {
        onhover: { enable: !still, mode: 'grab' },
        onclick: { enable: !still, mode: 'push' },
        resize: true
      },
      modes: {
        grab: { distance: 160, line_linked: { opacity: 0.9 } },
        push: { particles_nb: 3 }
      }
    },
    retina_detect: true
  });
};

window.initParticles();


/* particles.js 2.0.0 listens only for mousemove and click. Feed touch into
   the same two fields the mouse handler writes. Attached out here rather
   than inside initParticles, so recolouring doesn't stack listeners. */
(function () {
  function pJS() {
    return window.pJSDom && window.pJSDom[0] ? window.pJSDom[0].pJS : null;
  }

  function track(e) {
    var p = pJS();
    var t = (e.touches && e.touches[0]) || (e.changedTouches && e.changedTouches[0]);
    if (!p || !t) return;
    var x = t.clientX, y = t.clientY;
    if (p.tmp.retina) {            // same scaling the mousemove handler applies
      x *= p.canvas.pxratio;
      y *= p.canvas.pxratio;
    }
    p.interactivity.mouse.pos_x = x;
    p.interactivity.mouse.pos_y = y;
    p.interactivity.status = 'mousemove';
  }

  // passive: the field sits behind the page, so this must never block scrolling
  window.addEventListener('touchstart', track, { passive: true });
  window.addEventListener('touchmove', track, { passive: true });

  window.addEventListener('touchend', function (e) {
    track(e);
    var p = pJS();
    if (!p) return;
    // let go, or the lines stay hooked where you last touched
    setTimeout(function () { p.interactivity.status = 'mouseleave'; }, 600);
  }, { passive: true });
  })();