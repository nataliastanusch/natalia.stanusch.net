/* The controls above a section's entries. Two things only:

     Order    newest first or oldest first
     Filter   which tags an entry must carry to show at all

   Entries are always grouped under their category headings, in the curated
   order from _index.md. There used to be a "View" control offering "By
   tag" and "One list" as well; both are gone. "By tag" listed every entry
   once per tag it carried, so filtering to two entries could render
   twenty-three cards under twenty-three headings, and "One list" was the
   category view with the only useful thing about it removed.

   Two rules keep the page from going blank under the reader:

     - Tags combine with "any" by default, not "all". Every tag in the
       picker is carried by at least one entry, so an "any" filter can
       never match nothing. "all" is still there, one click away, for
       narrowing on purpose - and it says so when it finds nothing.

     - The picker scrolls inside a fixed height instead of growing the
       page. An open picker used to run several screens tall, so filtering
       collapsed the document under someone who had scrolled into it.

   Newest-first with nothing picked is exactly what the server rendered, so
   that combination restores the original HTML rather than rebuilding it.
   The curated category order can never drift.

   The picker arranges its pills under the groups defined in
   data/tag_groups.yaml. That file is the only place the arrangement is
   written down - nothing below hard-codes a tag name. */
(function () {
  var root = document.getElementById('entries');
  var bar  = document.querySelector('.filters');
  if (!root || !bar) return;

  var section   = bar.getAttribute('data-section') || '';
  var orderBtn  = bar.querySelector('.filter-order');
  var openBtn   = bar.querySelector('.filter-open');
  var openCount = bar.querySelector('.filter-open-count');
  var picker    = bar.querySelector('.tag-picker');
  var searchIn  = bar.querySelector('#tag-search');
  var valueBar  = bar.querySelector('.filter-values');
  var selBar    = bar.querySelector('.filter-selection');
  var modeBox   = bar.querySelector('.picker-mode');
  var doneBtn   = bar.querySelector('.picker-done');
  var scroller  = bar.querySelector('.tag-scroller');
  var moreBtn   = bar.querySelector('.tag-more');
  var moreText  = moreBtn && moreBtn.querySelector('.tag-more-text');
  var moreCaret = moreBtn && moreBtn.querySelector('.tag-more-caret');

  var defaultHTML = root.innerHTML;

  /* The curated category order, read back off the page the server sent, so
     a rebuilt list can't disagree with the Overview links above it. */
  var categoryOrder = Array.prototype.map.call(
    root.querySelectorAll('h2.category'),
    function (h) { return h.textContent; }
  );

  var items = Array.prototype.slice.call(root.querySelectorAll('.entry'))
    .map(function (el) {
      return {
        node: el.cloneNode(true),
        date: el.getAttribute('data-date') || '',
        category: el.getAttribute('data-category') || '',
        tags: (el.getAttribute('data-tags') || '').split('|').filter(Boolean)
      };
    });

  if (!items.length) return;

  /* `picked` holds every chosen tag, in the order they were clicked.
     `mode` is how they combine: 'any' wants an entry carrying at least one
     of them, 'all' wants an entry carrying every one. */
  var state = { order: 'newest', picked: [], mode: 'any', query: '' };

  /* Every tag is rendered, always. Groups used to show ten and hide the
     rest behind a "+ n more" toggle, but expanding one shoved everything
     below it down the page, so finding a tag meant the picker kept moving
     under you. The list scrolls instead, and the button under it says how
     much is left - the panel is the same height however deep you are. */

  /* Every pill button, keyed by tag. A click flips the pressed state in
     place rather than rebuilding the picker, which would lose the scroll
     position and the focus ring on the pill just clicked. */
  var pillIndex = {};

  var reduceMotion = window.matchMedia &&
                     window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* Wide enough for the picker to live in the left margin as a column of
     its own. There it is always open and runs its full height - there is
     no panel to dismiss, and no reason to scroll it inside itself when the
     page scrolls perfectly well. Must match the breakpoint in style.css. */
  var railMQ = window.matchMedia ? window.matchMedia('(min-width: 78rem)') : null;
  function isRail() { return !!(railMQ && railMQ.matches); }

  function track(name, data) {
    if (window.siteTrack) window.siteTrack(name, data);
  }

  /* Every filter event carries the section, so publications and projects
     can be told apart in the dashboard. */
  function ev(data) {
    var out = { section: section };
    for (var k in data) {
      if (Object.prototype.hasOwnProperty.call(data, k)) out[k] = data[k];
    }
    return out;
  }

  /* ---------- helpers ---------- */

  function byDate(a, b) {
    var flip = state.order === 'oldest' ? -1 : 1;
    return (a.date < b.date ? 1 : a.date > b.date ? -1 : 0) * flip;
  }

  function sorted(list) { return list.slice().sort(byDate); }

  function byName(a, b) { return a.localeCompare(b); }

  function unique(list) {
    var seen = {}, out = [];
    list.forEach(function (v) { if (v && !seen[v]) { seen[v] = 1; out.push(v); } });
    return out.sort(byName);
  }

  /* Must agree with Hugo's `urlize`, which builds the ids on the headings. */
  function slugify(s) {
    return String(s).toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  var allTags = unique(items.reduce(function (acc, i) {
    return acc.concat(i.tags);
  }, []));

  /* How many entries carry each tag. Shown on the pills: with ninety tags,
     the count is the quickest way to tell a spine of the work from a tag
     used once. */
  var tagCount = (function () {
    var n = {};
    items.forEach(function (i) {
      i.tags.forEach(function (t) { n[t] = (n[t] || 0) + 1; });
    });
    return n;
  })();

  /* ---------- tag groups ---------- */

  var groupSpec = (function () {
    var el = document.getElementById('tag-groups');
    if (!el) return [];
    try {
      var parsed = JSON.parse(el.textContent || 'null');
      return Object.prototype.toString.call(parsed) === '[object Array]' ? parsed : [];
    } catch (e) {
      return [];
    }
  })();

  /* Walks the spec and keeps only the tags this section actually uses, so a
     heading never sits over an empty row. Matching ignores case, and the
     pill shows the tag as the entry spells it. A tag named in two groups
     lands in the first; a tag named in none collects under "Other". */
  var tagPlan = (function () {
    /* No spec at all -> no plan, and the picker falls back to a flat run.
       Without this the leftovers below would still build a single group,
       and every tag would sit under a heading reading "Other". */
    if (!groupSpec.length) return [];

    var canonical = {};
    allTags.forEach(function (t) {
      var k = t.toLowerCase();
      if (!(k in canonical)) canonical[k] = t;
    });

    var used = {}, plan = [];

    groupSpec.forEach(function (group) {
      var blocks = [];
      (group.items || []).forEach(function (item) {
        var pills = [];
        (item.tags || []).forEach(function (name) {
          var k = String(name).toLowerCase();
          if (canonical[k] && !used[k]) {
            used[k] = 1;
            pills.push(canonical[k]);
          }
        });
        if (pills.length) blocks.push({ name: item.name || '', tags: pills });
      });
      if (blocks.length) plan.push({ name: group.name || '', blocks: blocks });
    });

    var rest = allTags.filter(function (t) { return !used[t.toLowerCase()]; });
    if (rest.length) plan.push({ name: 'Other', blocks: [{ name: '', tags: rest }] });

    return plan;
  })();

  var grouped = tagPlan.length > 0;

  function isPicked(tag) { return state.picked.indexOf(tag) > -1; }

  function matching() {
    if (!state.picked.length) return items;

    return items.filter(function (i) {
      var has = function (t) { return i.tags.indexOf(t) > -1; };
      return state.mode === 'all' ? state.picked.every(has)
                                  : state.picked.some(has);
    });
  }

  /* Clicking a pill adds the tag or takes it back out again. */
  function togglePick(tag) {
    var at = state.picked.indexOf(tag);
    if (at > -1) {
      state.picked.splice(at, 1);
      track('filter-tag-remove', ev({ tag: tag }));
    } else {
      state.picked.push(tag);
      track('filter-tag-add', ev({ tag: tag, mode: state.mode }));
    }
    refresh();
  }

  function refresh() {
    syncPills();
    renderSelection();
    renderMode();
    renderCount();
    draw();
  }

  /* The pills are already on the page; only which of them read as pressed
     has changed. */
  function syncPills() {
    Object.keys(pillIndex).forEach(function (t) {
      var on = String(isPicked(t));
      pillIndex[t].forEach(function (b) { b.setAttribute('aria-pressed', on); });
    });
  }

  /* ---------- rendering: entries ---------- */

  /* Matches the one the server puts at the end of each category. */
  function backToTop() {
    var p = document.createElement('p');
    p.className = 'to-top to-top--section';
    var a = document.createElement('a');
    a.href = '#top';
    a.textContent = '\u2191 Back to top';
    p.appendChild(a);
    return p;
  }

  function heading(text) {
    var h = document.createElement('h2');
    h.className = 'category';
    h.id = 'cat-' + slugify(text);
    h.textContent = text;
    return h;
  }

  function emptyNote(text) {
    var p = document.createElement('p');
    p.className = 'filter-empty';
    p.textContent = text;
    return p;
  }

  function renderByCategory(list) {
    root.innerHTML = '';

    var groups = {};
    list.forEach(function (i) {
      var k = i.category || 'Other';
      (groups[k] = groups[k] || []).push(i);
    });

    /* Curated order first, then anything that turns up outside it. */
    var names = categoryOrder.filter(function (k) { return groups[k]; });
    Object.keys(groups).sort(byName).forEach(function (k) {
      if (names.indexOf(k) === -1) names.push(k);
    });

    names.forEach(function (n) {
      root.appendChild(heading(n));
      sorted(groups[n]).forEach(function (i) {
        root.appendChild(i.node.cloneNode(true));
      });
      root.appendChild(backToTop());
    });
  }

  /* Only reachable in "all" mode - see the note at the top of the file. */
  function renderNothing() {
    root.innerHTML = '';
    root.appendChild(emptyNote('No entry carries all of those tags.'));

    var b = document.createElement('button');
    b.type = 'button';
    b.className = 'filter-empty-action';
    b.textContent = 'Show entries with any of them instead';
    b.addEventListener('click', function () {
      setMode('any', 'empty-state');
    });
    root.appendChild(b);
  }

  function draw() {
    /* The one combination the server already rendered. Restoring it beats
       rebuilding it: no chance of the curated order drifting. */
    if (state.order === 'newest' && !state.picked.length) {
      root.innerHTML = defaultHTML;
      return;
    }

    var list = matching();
    if (!list.length) { renderNothing(); return; }
    renderByCategory(list);
  }

  /* ---------- rendering: the picker ---------- */

  function pill(tag) {
    var b = document.createElement('button');
    b.type = 'button';
    var n = tagCount[tag] || 0;

    b.appendChild(document.createTextNode(tag));
    var c = document.createElement('span');
    c.className = 'pill-count';
    c.setAttribute('aria-hidden', 'true');
    c.textContent = n;
    b.appendChild(c);

    /* The count would otherwise read as a stray number. */
    b.setAttribute('aria-label', tag + ', ' + n + (n === 1 ? ' entry' : ' entries'));
    b.setAttribute('aria-pressed', String(isPicked(tag)));
    b.addEventListener('click', function () { togglePick(tag); });

    (pillIndex[tag] = pillIndex[tag] || []).push(b);
    return b;
  }

  function pillRow(tags) {
    var row = document.createElement('div');
    row.className = 'tag-pills';
    tags.forEach(function (t) { row.appendChild(pill(t)); });
    return row;
  }

  function noMatch() {
    valueBar.appendChild(emptyNote('No tag matches \u201c' + state.query.trim() + '\u201d.'));
  }

  /* Rebuilds the pills. Called when the search changes and when the picker
     opens - never on a pick, which goes through syncPills instead. */
  function renderValues() {
    var top = valueBar.scrollTop;     // don't throw the reader back to the first group
    valueBar.innerHTML = '';
    valueBar.classList.remove('is-grouped');
    pillIndex = {};

    var q = state.query.trim().toLowerCase();
    function hit(v) { return !q || v.toLowerCase().indexOf(q) > -1; }

    /* Fallback for a missing or unreadable data/tag_groups.yaml: one flat
       alphabetical run, the way this looked before the groups existed. */
    if (!grouped) {
      var values = allTags.filter(hit);
      if (q && !values.length) { noMatch(); updateMore(); return; }
      values.forEach(function (v) { valueBar.appendChild(pill(v)); });
      valueBar.scrollTop = top;
      updateMore();
      return;
    }

    valueBar.classList.add('is-grouped');
    var shown = 0;

    tagPlan.forEach(function (group) {
      var blocks = group.blocks.map(function (b) {
        return { name: b.name, tags: b.tags.filter(hit) };
      }).filter(function (b) { return b.tags.length; });

      if (!blocks.length) return;

      var wrap = document.createElement('div');
      wrap.className = 'tag-group';

      var total = blocks.reduce(function (n, b) { return n + b.tags.length; }, 0);
      shown += total;

      /* Sticky, so you always know which group you are looking at however
         far down the list you have scrolled. */
      var title = document.createElement('p');
      title.className = 'tag-group-title';
      title.appendChild(document.createTextNode(group.name));

      var gcount = document.createElement('span');
      gcount.className = 'tag-group-count';
      gcount.setAttribute('aria-hidden', 'true');
      gcount.textContent = total;
      title.appendChild(gcount);
      wrap.appendChild(title);

      blocks.forEach(function (b) {
        if (b.name) {
          var sub = document.createElement('div');
          sub.className = 'tag-subgroup';
          var subTitle = document.createElement('p');
          subTitle.className = 'tag-subgroup-title';
          subTitle.textContent = b.name;
          sub.appendChild(subTitle);
          sub.appendChild(pillRow(b.tags));
          wrap.appendChild(sub);
        } else {
          wrap.appendChild(pillRow(b.tags));
        }
      });

      valueBar.appendChild(wrap);
    });

    if (q && !shown) noMatch();
    valueBar.scrollTop = top;
    updateMore();
  }

  /* ---------- the scroll, made visible ---------- */

  /* How many pills sit below the fold right now. Counted rather than
     estimated, because the pills wrap and a row holds anywhere between two
     and six of them depending on how long the tags are. */
  function hiddenBelow() {
    var limit = valueBar.scrollTop + valueBar.clientHeight - 2;
    var pills = valueBar.querySelectorAll('button');
    var n = 0;
    for (var i = 0; i < pills.length; i++) {
      if (pills[i].offsetTop + pills[i].offsetHeight > limit) n++;
    }
    return n;
  }

  /* Drives the fades at either edge and the button under them. Runs on
     scroll, on resize, and after any rebuild - anything that can change
     where the list has been cut off. */
  function updateMore() {
    if (!scroller) return;

    var over = valueBar.scrollHeight - valueBar.clientHeight > 2;
    scroller.classList.toggle('is-scrollable', over);

    if (!over) {
      /* Everything fits: no fades, and nothing to offer. */
      scroller.classList.add('is-top', 'is-end');
      if (moreBtn) moreBtn.hidden = true;
      return;
    }

    var atTop = valueBar.scrollTop <= 2;
    var atEnd = valueBar.scrollTop + valueBar.clientHeight >= valueBar.scrollHeight - 2;
    scroller.classList.toggle('is-top', atTop);
    scroller.classList.toggle('is-end', atEnd);

    if (!moreBtn) return;
    moreBtn.hidden = false;

    if (atEnd) {
      /* Nothing left below, so the button turns into the way back rather
         than vanishing under the cursor that was just paging with it. */
      moreBtn.dataset.dir = 'up';
      moreText.textContent = 'Top';
      moreCaret.textContent = '\u2303';
      moreBtn.setAttribute('aria-label', 'Back to the first group of tags');
    } else {
      var n = hiddenBelow();
      moreBtn.dataset.dir = 'down';
      moreText.textContent = n + ' more';
      moreCaret.textContent = '\u2304';
      moreBtn.setAttribute('aria-label',
        n + (n === 1 ? ' more tag' : ' more tags') + ' below. Scroll down.');
    }
  }

  function scrollValues(to) {
    /* scrollTo with options isn't everywhere, and isn't in jsdom. */
    if (valueBar.scrollTo) {
      valueBar.scrollTo({ top: to, behavior: reduceMotion ? 'auto' : 'smooth' });
    } else {
      valueBar.scrollTop = to;
    }
  }

  /* ---------- rendering: what's currently picked ---------- */

  function word(text) {
    var s = document.createElement('span');
    s.className = 'selection-word';
    s.textContent = text;
    return s;
  }

  function renderSelection() {
    selBar.innerHTML = '';

    if (!state.picked.length) { selBar.hidden = true; return; }
    selBar.hidden = false;

    var n = matching().length;

    var count = document.createElement('span');
    count.className = 'selection-count';
    count.textContent = n + (n === 1 ? ' entry' : ' entries');
    selBar.appendChild(count);

    selBar.appendChild(word(
      state.picked.length === 1 ? 'tagged'
        : state.mode === 'all' ? 'tagged with all of' : 'tagged with any of'));

    state.picked.forEach(function (t) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'selection-tag';
      b.setAttribute('aria-label', 'Remove tag ' + t);
      b.appendChild(document.createTextNode(t));
      var x = document.createElement('span');
      x.className = 'selection-x';
      x.setAttribute('aria-hidden', 'true');
      x.textContent = '\u00d7';
      b.appendChild(x);
      b.addEventListener('click', function () { togglePick(t); });
      selBar.appendChild(b);
    });

    var clear = document.createElement('button');
    clear.type = 'button';
    clear.className = 'selection-clear';
    clear.textContent = 'Clear';
    clear.addEventListener('click', function () {
      state.picked = [];
      track('filter-clear', ev({}));
      refresh();
    });
    selBar.appendChild(clear);
  }

  /* One tag combines with nothing, so the switch would only be noise. */
  function renderMode() {
    if (!modeBox) return;
    modeBox.innerHTML = '';

    if (state.picked.length < 2) { modeBox.hidden = true; return; }
    modeBox.hidden = false;

    modeBox.appendChild(word('matching'));

    var group = document.createElement('span');
    group.className = 'selection-mode';
    group.setAttribute('role', 'group');
    group.setAttribute('aria-label', 'Combine tags');

    ['any', 'all'].forEach(function (m) {
      var b = document.createElement('button');
      b.type = 'button';
      b.textContent = m;
      b.setAttribute('aria-pressed', String(state.mode === m));
      b.addEventListener('click', function () { setMode(m, 'switch'); });
      group.appendChild(b);
    });

    modeBox.appendChild(group);
    modeBox.appendChild(word('of them'));
  }

  /* The badge on the closed picker, so an active filter is never invisible. */
  function renderCount() {
    if (!openCount || !openBtn) return;
    var n = state.picked.length;
    openCount.hidden = !n;
    openCount.textContent = n ? String(n) : '';
    openBtn.setAttribute('aria-label',
      n ? 'Filter by tags, ' + n + ' selected' : 'Filter by tags');
  }

  /* ---------- controls ---------- */

  function setMode(m, from) {
    if (state.mode === m) return;
    state.mode = m;
    track('filter-mode', ev({ mode: m, from: from, tags: state.picked.length }));
    refresh();
  }

  function setOrder(name) {
    state.order = name;
    if (orderBtn) {
      orderBtn.setAttribute('data-order', name);
      orderBtn.querySelector('.filter-order-arrow').textContent =
        name === 'newest' ? '\u2193' : '\u2191';
      orderBtn.querySelector('.filter-order-text').textContent =
        name === 'newest' ? 'Newest first' : 'Oldest first';
    }
    draw();
  }

  function setPicker(open, focus) {
    if (!picker || !openBtn) return;
    if (isRail()) open = true;            // nothing to close in the margin

    picker.hidden = !open;
    openBtn.setAttribute('aria-expanded', String(open));
    if (!open) return;

    renderValues();
    /* Only when they asked for it. Stealing focus on a resize, or on load
       in the rail, would drag the page to the picker unbidden. */
    if (focus && searchIn) searchIn.focus();
  }

  /* ---------- wiring ---------- */

  if (orderBtn) {
    orderBtn.addEventListener('click', function () {
      var next = state.order === 'newest' ? 'oldest' : 'newest';
      setOrder(next);
      track('filter-order', ev({ order: next }));
    });
  }

  if (openBtn) {
    openBtn.addEventListener('click', function () {
      var open = picker.hidden;
      setPicker(open, true);
      if (open) track('filter-picker-open', ev({ tags: state.picked.length }));
    });
  }

  /* The scroll region drives its own indicator. rAF-throttled: a wheel
     gesture fires scroll events far faster than anything needs redrawing. */
  if (scroller) {
    var moreTicking = false;
    valueBar.addEventListener('scroll', function () {
      if (moreTicking) return;
      moreTicking = true;
      window.requestAnimationFrame(function () {
        moreTicking = false;
        updateMore();
      });
    }, { passive: true });

    /* Pills rewrap at a different width, so what is below the fold changes
       even though nothing scrolled. */
    var resizeTimer = null;
    window.addEventListener('resize', function () {
      if (picker && picker.hidden) return;
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(updateMore, 150);
    });
  }

  if (moreBtn) {
    moreBtn.addEventListener('click', function () {
      var down = moreBtn.dataset.dir !== 'up';
      /* A little less than a full height, so a row stays on screen as an
         anchor rather than paging blind. */
      scrollValues(down ? valueBar.scrollTop + valueBar.clientHeight - 28 : 0);
      track('filter-tag-scroll', ev({ dir: down ? 'down' : 'top' }));
    });
  }

  if (doneBtn) {
    doneBtn.addEventListener('click', function () {
      setPicker(false);
      openBtn.focus();
      /* Land on the results rather than wherever the picker happened to
         leave them. */
      if (bar.getBoundingClientRect().top < 0) {
        bar.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
      }
    });
  }

  if (searchIn) {
    /* Tracked on a pause rather than on a keystroke, so one search is one
       event and the dashboard records what people looked for, not how they
       type. Whether it found anything is the useful half: a run of misses
       is a list of tags worth adding. */
    var searchTimer = null;

    searchIn.addEventListener('input', function () {
      state.query = searchIn.value;
      renderValues();

      clearTimeout(searchTimer);
      var q = state.query.trim();
      if (q.length < 2) return;
      searchTimer = setTimeout(function () {
        track('filter-search', ev({
          query: q.toLowerCase().slice(0, 40),
          found: valueBar.querySelector('.filter-empty') ? 'no' : 'yes'
        }));
      }, 900);
    });

    /* Enter picks the first tag still showing. */
    searchIn.addEventListener('keydown', function (e) {
      if (e.key !== 'Enter') return;
      e.preventDefault();
      var first = valueBar.querySelector('.tag-pills button');
      if (first) first.click();
    });
  }

  /* Escape closes the picker, from anywhere inside the bar. */
  bar.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && picker && !picker.hidden && !isRail()) {
      setPicker(false);
      openBtn.focus();
    }
  });

  /* The Overview links point at category headings. A filter can hide the
     category someone is aiming at, so drop the filter rather than let the
     link do nothing. */
  Array.prototype.forEach.call(
    document.querySelectorAll('.category-jump a'),
    function (a) {
      a.addEventListener('click', function (e) {
        var id = a.getAttribute('href').slice(1);
        track('overview-jump', ev({ category: a.textContent.trim() }));

        if (document.getElementById(id)) return;   // native anchor is fine

        e.preventDefault();
        state.picked = [];
        refresh();
        var target = document.getElementById(id);
        if (target) {
          target.scrollIntoView({
            behavior: reduceMotion ? 'auto' : 'smooth',
            block: 'start'
          });
        }
      });
    }
  );

  /* Crossing the breakpoint changes what the picker is: a panel you open,
     or a column that is simply there. Re-measure, because the pills rewrap
     into a completely different width. */
  if (railMQ) {
    var onRail = function () {
      setPicker(isRail());
      updateMore();
    };
    if (railMQ.addEventListener) railMQ.addEventListener('change', onRail);
    else if (railMQ.addListener) railMQ.addListener(onRail);
  }

  renderCount();
  bar.hidden = false;

  /* In the rail the picker is open from the start, with nothing to click. */
  if (isRail()) setPicker(true);
})();
