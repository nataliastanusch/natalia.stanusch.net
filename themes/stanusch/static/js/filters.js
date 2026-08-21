/* Four ways to arrange a section's entries:

     Default      the curated order from category_order in _index.md
     Most recent  one flat list, newest first
     By tag       grouped under tag headings, with a search box; pick one to narrow
     By category  grouped under category headings; pick one to narrow

   The Default view is what the server renders, so the page is complete
   before this file runs. It's kept verbatim and restored rather than
   rebuilt, which means the curated order can never drift out of sync. */
(function () {
  var root = document.getElementById('entries');
  var bar  = document.querySelector('.filters');
  if (!root || !bar) return;

  var viewBar   = bar.querySelector('.filter-views');
  var searchBox = bar.querySelector('.filter-search');
  var searchIn  = bar.querySelector('#tag-search');
  var valueBar  = bar.querySelector('.filter-values');

  var defaultHTML = root.innerHTML;

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

  var state = { view: 'default', value: null, query: '' };

  /* Publications carry ~95 distinct tags. Showing them all at once buries
     the entries, so anything past this many collapses behind a toggle. */
  var COLLAPSE_OVER = 24;
  var expanded = false;

  var reduceMotion = window.matchMedia &&
                     window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- helpers ---------- */

  function newestFirst(a, b) {
    return a.date < b.date ? 1 : a.date > b.date ? -1 : 0;
  }

  function unique(list) {
    var seen = {}, out = [];
    list.forEach(function (v) {
      if (v && !seen[v]) { seen[v] = 1; out.push(v); }
    });
    return out.sort(function (a, b) { return a.localeCompare(b); });
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

  var allCategories = unique(items.map(function (i) { return i.category; }));

  function matching() {
    if (!state.value) return items;
    if (state.view === 'tag') {
      return items.filter(function (i) { return i.tags.indexOf(state.value) > -1; });
    }
    if (state.view === 'category') {
      return items.filter(function (i) { return i.category === state.value; });
    }
    return items;
  }

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

  /* ---------- rendering ---------- */

  function renderFlat(list) {
    root.innerHTML = '';
    list.slice().sort(newestFirst).forEach(function (i) {
      root.appendChild(i.node.cloneNode(true));
    });
    if (list.length) root.appendChild(backToTop());
  }

  function renderGrouped(list, key) {
    root.innerHTML = '';
    var groups = {};

    list.forEach(function (i) {
      var keys = key === 'tag' ? i.tags : [i.category || 'Uncategorised'];
      if (!keys.length) keys = ['Untagged'];
      keys.forEach(function (k) { (groups[k] = groups[k] || []).push(i); });
    });

    var names = Object.keys(groups).sort(function (a, b) { return a.localeCompare(b); });

    if (!names.length) {
      var p = document.createElement('p');
      p.className = 'filter-empty';
      p.textContent = 'Nothing here.';
      root.appendChild(p);
      return;
    }

    names.forEach(function (n) {
      root.appendChild(heading(n));
      groups[n].slice().sort(newestFirst).forEach(function (i) {
        root.appendChild(i.node.cloneNode(true));
      });
      root.appendChild(backToTop());
    });
  }

  /* Rebuilds the pills only. The search input lives outside this
     container so typing never costs it focus. */
  function renderValues() {
    var old = bar.querySelector('.filter-toggle');
    if (old) old.parentNode.removeChild(old);

    var all = state.view === 'tag' ? allTags
            : state.view === 'category' ? allCategories
            : null;

    if (!all) {
      valueBar.hidden = true;
      valueBar.innerHTML = '';
      return;
    }

    var q = state.query.trim().toLowerCase();
    var values = q
      ? all.filter(function (v) { return v.toLowerCase().indexOf(q) > -1; })
      : all;

    valueBar.innerHTML = '';
    valueBar.hidden = false;

    if (q && !values.length) {
      var none = document.createElement('p');
      none.className = 'filter-empty';
      none.textContent = 'No tag matches \u201c' + state.query.trim() + '\u201d.';
      valueBar.appendChild(none);
      valueBar.classList.remove('is-collapsed');
      return;
    }

    /* A search result is already short, so never collapse it. */
    var collapse = !q && values.length > COLLAPSE_OVER && !expanded;
    valueBar.classList.toggle('is-collapsed', collapse);

    var labels = q ? values : ['All'].concat(values);

    labels.forEach(function (v) {
      var isAll = !q && v === 'All';
      var b = document.createElement('button');
      b.type = 'button';
      b.textContent = v;
      b.setAttribute('aria-pressed',
        String(isAll ? state.value === null : state.value === v));
      b.addEventListener('click', function () {
        state.value = isAll ? null : v;
        renderValues();
        draw();
      });
      valueBar.appendChild(b);
    });

    if (!q && values.length > COLLAPSE_OVER) {
      var toggle = document.createElement('button');
      toggle.type = 'button';
      toggle.className = 'filter-toggle';
      toggle.textContent = expanded ? 'Show fewer' : 'Show all ' + values.length;
      toggle.addEventListener('click', function () {
        expanded = !expanded;
        renderValues();
      });
      valueBar.parentNode.insertBefore(toggle, valueBar.nextSibling);
    }
  }

  function draw() {
    var list = matching();

    if (state.view === 'default') {
      root.innerHTML = defaultHTML;
      return;
    }
    if (state.view === 'recent') { renderFlat(list); return; }

    /* "All" selected -> group; a specific value -> flat, newest first */
    if (state.value) renderFlat(list);
    else renderGrouped(list, state.view);
  }

  function setView(name) {
    state.view = name;
    state.value = null;
    state.query = '';
    expanded = false;

    if (searchIn) searchIn.value = '';
    if (searchBox) searchBox.hidden = name !== 'tag';

    Array.prototype.forEach.call(viewBar.querySelectorAll('button'), function (b) {
      b.setAttribute('aria-pressed', String(b.getAttribute('data-view') === name));
    });

    renderValues();
    draw();
  }

  /* ---------- wiring ---------- */

  viewBar.addEventListener('click', function (e) {
    var btn = e.target.closest('button[data-view]');
    if (btn) setView(btn.getAttribute('data-view'));
  });

  if (searchIn) {
    searchIn.addEventListener('input', function () {
      state.query = searchIn.value;
      renderValues();
    });

    /* Enter picks the first tag still showing. */
    searchIn.addEventListener('keydown', function (e) {
      if (e.key !== 'Enter') return;
      e.preventDefault();
      var first = valueBar.querySelector('button');
      if (first) first.click();
    });
  }

  /* The jump list points at the Default view's headings. From any other
     view, go back to Default first so there is something to jump to. */
  Array.prototype.forEach.call(
    document.querySelectorAll('.category-jump a'),
    function (a) {
      a.addEventListener('click', function (e) {
        if (state.view === 'default' && !state.value) return;  // native anchor is fine
        e.preventDefault();
        setView('default');
        var target = document.getElementById(a.getAttribute('href').slice(1));
        if (target) {
          target.scrollIntoView({
            behavior: reduceMotion ? 'auto' : 'smooth',
            block: 'start'
          });
        }
        if (history.replaceState) {
          history.replaceState(null, '', a.getAttribute('href'));
        }
      });
    }
  );

  bar.hidden = false;
})();
