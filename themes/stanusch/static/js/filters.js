/* The controls above a section's entries. Three independent things:

     View     how entries are grouped - by category, by tag, or one list
     Order    newest first or oldest first
     Filter   which tags an entry must carry to show at all

   They used to be one control labelled "Sort by", which meant picking a tag
   also changed the grouping, and there was no way to narrow the category
   view at all. Splitting them means any filter works in any view.

   "By category" at newest-first with nothing filtered is exactly what the
   server rendered, so that combination restores the original HTML verbatim
   rather than rebuilding it. The curated category order can never drift.

   The tag picker arranges its pills under the groups defined in
   data/tag_groups.yaml. That file is the only place the arrangement is
   written down - nothing below hard-codes a tag name. */
(function () {
  var root = document.getElementById('entries');
  var bar  = document.querySelector('.filters');
  if (!root || !bar) return;

  var section   = bar.getAttribute('data-section') || '';
  var viewBar   = bar.querySelector('.filter-views');
  var orderBtn  = bar.querySelector('.filter-order');
  var openBtn   = bar.querySelector('.filter-open');
  var openCount = bar.querySelector('.filter-open-count');
  var picker    = bar.querySelector('.tag-picker');
  var searchIn  = bar.querySelector('#tag-search');
  var valueBar  = bar.querySelector('.filter-values');
  var selBar    = bar.querySelector('.filter-selection');

  var defaultHTML = root.innerHTML;

  /* The curated category order, read back off the page the server sent, so
     a rebuilt category view can't disagree with the Overview list. */
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
     `mode` is how they combine: 'all' wants an entry carrying every one of
     them, 'any' wants an entry carrying at least one. */
  var state = {
    view: 'category',
    order: 'newest',
    picked: [],
    mode: 'all',
    query: ''
  };

  /* Only reached if data/tag_groups.yaml is missing or unreadable, when the
     picker falls back to one flat alphabetical run. */
  var FLAT_COLLAPSE_OVER = 24;
  var flatExpanded = false;

  /* Each group shows this many tags, then hides the tail behind a toggle of
     its own, so no single group crowds out the rest. */
  var GROUP_SHOW = 10;
  var openGroups = {};

  var reduceMotion = window.matchMedia &&
                     window.matchMedia('(prefers-reduced-motion: reduce)').matches;

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

  /* Tag order for the headings in the entry list, so it reads in the same
     sequence as the picker rather than one long alphabetical run. */
  var tagOrder = {};
  var tagGroupOf = {};
  (function () {
    var n = 0;
    tagPlan.forEach(function (group) {
      group.blocks.forEach(function (block) {
        block.tags.forEach(function (t) {
          tagOrder[t] = n++;
          tagGroupOf[t] = group.name;
        });
      });
    });
  })();

  function byTagOrder(a, b) {
    var x = tagOrder.hasOwnProperty(a) ? tagOrder[a] : Infinity;
    var y = tagOrder.hasOwnProperty(b) ? tagOrder[b] : Infinity;
    if (x !== y) return x - y;
    return a.localeCompare(b);
  }

  function byName(a, b) { return a.localeCompare(b); }

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
      track('filter-tag-add', ev({ tag: tag, view: state.view }));
    }
    refresh();
  }

  function refresh() {
    renderValues();
    renderSelection();
    renderCount();
    draw();
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

  function heading(text, prefix) {
    var h = document.createElement('h2');
    h.className = 'category';
    h.id = prefix + '-' + slugify(text);
    h.textContent = text;
    return h;
  }

  function emptyNote(text) {
    var p = document.createElement('p');
    p.className = 'filter-empty';
    p.textContent = text;
    return p;
  }

  /* ---------- rendering: entries ---------- */

  function renderFlat(list) {
    root.innerHTML = '';
    sorted(list).forEach(function (i) {
      root.appendChild(i.node.cloneNode(true));
    });
    root.appendChild(backToTop());
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
      root.appendChild(heading(n, 'cat'));
      sorted(groups[n]).forEach(function (i) {
        root.appendChild(i.node.cloneNode(true));
      });
      root.appendChild(backToTop());
    });
  }

  function renderByTag(list) {
    root.innerHTML = '';
    var groups = {};

    list.forEach(function (i) {
      var keys = i.tags.length ? i.tags : ['Untagged'];
      keys.forEach(function (k) { (groups[k] = groups[k] || []).push(i); });
    });

    var names = Object.keys(groups).sort(grouped ? byTagOrder : byName);
    var lastGroup = null;

    names.forEach(function (n) {
      if (grouped) {
        var g = tagGroupOf.hasOwnProperty(n) ? tagGroupOf[n] : 'Other';
        if (g !== lastGroup) {
          var label = document.createElement('p');
          label.className = 'tag-run';
          label.textContent = g;
          root.appendChild(label);
          lastGroup = g;
        }
      }
      /* Prefixed 'tag' rather than 'cat' so a tag and a category sharing a
         name can't produce two elements with the same id. */
      root.appendChild(heading(n, 'tag'));
      sorted(groups[n]).forEach(function (i) {
        root.appendChild(i.node.cloneNode(true));
      });
      root.appendChild(backToTop());
    });
  }

  /* "all" of two unrelated tags often matches nothing. Say so, and offer
     the switch rather than leaving a blank page. */
  function renderNothing() {
    root.innerHTML = '';
    root.appendChild(emptyNote(state.picked.length > 1
      ? 'No entry carries all of those tags.'
      : 'Nothing here.'));

    if (state.mode === 'all' && state.picked.length > 1) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'filter-empty-action';
      b.textContent = 'Show entries with any of them instead';
      b.addEventListener('click', function () {
        state.mode = 'any';
        track('filter-mode', ev({ mode: 'any', from: 'empty-state' }));
        renderSelection();
        draw();
      });
      root.appendChild(b);
    }
  }

  function draw() {
    var list = matching();

    /* The one combination the server already rendered. Restoring it beats
       rebuilding it: no chance of the curated order drifting. */
    if (state.view === 'category' && state.order === 'newest' && !state.picked.length) {
      root.innerHTML = defaultHTML;
      return;
    }

    if (!list.length) { renderNothing(); return; }

    if (state.view === 'flat') { renderFlat(list); return; }
    if (state.view === 'tag')  { renderByTag(list); return; }
    renderByCategory(list);
  }

  /* ---------- rendering: the picker ---------- */

  function pill(label, tag) {
    var b = document.createElement('button');
    b.type = 'button';

    if (tag === null) {
      /* The "All" pill, which just empties the selection. */
      b.textContent = label;
      b.setAttribute('aria-pressed', String(!state.picked.length));
    } else {
      var n = tagCount[tag] || 0;
      b.appendChild(document.createTextNode(label));
      var c = document.createElement('span');
      c.className = 'pill-count';
      c.setAttribute('aria-hidden', 'true');
      c.textContent = n;
      b.appendChild(c);
      /* The count reads as a stray number otherwise. */
      b.setAttribute('aria-label', label + ', ' + n + (n === 1 ? ' entry' : ' entries'));
      b.setAttribute('aria-pressed', String(isPicked(tag)));
    }

    b.addEventListener('click', function () {
      if (tag !== null) { togglePick(tag); return; }
      if (!state.picked.length) return;
      state.picked = [];
      track('filter-clear', ev({ from: 'all-pill' }));
      refresh();
    });
    return b;
  }

  function pillRow(tags) {
    var row = document.createElement('div');
    row.className = 'tag-pills';
    tags.forEach(function (t) { row.appendChild(pill(t, t)); });
    return row;
  }

  function noMatch() {
    valueBar.appendChild(emptyNote('No tag matches \u201c' + state.query.trim() + '\u201d.'));
  }

  /* Rebuilds the pills only. The search input lives outside this
     container so typing never costs it focus. */
  function renderValues() {
    valueBar.innerHTML = '';
    valueBar.classList.remove('is-collapsed', 'is-grouped');

    var q = state.query.trim().toLowerCase();
    function hit(v) { return !q || v.toLowerCase().indexOf(q) > -1; }

    /* Fallback for a missing or unreadable data/tag_groups.yaml: one flat
       alphabetical run, the way this looked before the groups existed. */
    if (!grouped) {
      var values = allTags.filter(hit);
      if (q && !values.length) { noMatch(); return; }

      valueBar.classList.toggle('is-collapsed',
        !q && values.length > FLAT_COLLAPSE_OVER && !flatExpanded);

      if (!q) valueBar.appendChild(pill('All', null));
      values.forEach(function (v) { valueBar.appendChild(pill(v, v)); });

      if (!q && values.length > FLAT_COLLAPSE_OVER) {
        var t = document.createElement('button');
        t.type = 'button';
        t.className = 'filter-toggle';
        t.textContent = flatExpanded ? 'Show fewer' : 'Show all ' + values.length;
        t.addEventListener('click', function () {
          flatExpanded = !flatExpanded;
          renderValues();
        });
        valueBar.appendChild(t);
      }
      return;
    }

    valueBar.classList.add('is-grouped');

    if (!q) {
      var allRow = document.createElement('div');
      allRow.className = 'tag-pills tag-pills--all';
      allRow.appendChild(pill('All', null));
      valueBar.appendChild(allRow);
    }

    var shown = 0;

    tagPlan.forEach(function (group) {
      var blocks = group.blocks.map(function (b) {
        return { name: b.name, tags: b.tags.filter(hit) };
      }).filter(function (b) { return b.tags.length; });

      if (!blocks.length) return;

      var wrap = document.createElement('div');
      wrap.className = 'tag-group';

      var title = document.createElement('p');
      title.className = 'tag-group-title';
      title.textContent = group.name;
      wrap.appendChild(title);

      /* A group with nothing nested and a long tail gets a toggle. A search
         result is already short, so it is never trimmed. */
      var simple = blocks.length === 1 && !blocks[0].name;
      var tail = 0;

      blocks.forEach(function (b) {
        var tags = b.tags;

        if (simple && !q && tags.length > GROUP_SHOW && !openGroups[group.name]) {
          var head = tags.slice(0, GROUP_SHOW);
          /* A picked tag in the hidden tail would otherwise vanish while
             still filtering the list, so pull it back into view. */
          var strays = tags.slice(GROUP_SHOW).filter(isPicked);
          tail = tags.length - head.length - strays.length;
          tags = head.concat(strays);
        }

        shown += tags.length;

        if (b.name) {
          var sub = document.createElement('div');
          sub.className = 'tag-subgroup';
          var subTitle = document.createElement('p');
          subTitle.className = 'tag-subgroup-title';
          subTitle.textContent = b.name;
          sub.appendChild(subTitle);
          sub.appendChild(pillRow(tags));
          wrap.appendChild(sub);
        } else {
          wrap.appendChild(pillRow(tags));
        }
      });

      if (simple && !q && (tail || openGroups[group.name])) {
        var more = document.createElement('button');
        more.type = 'button';
        more.className = 'filter-toggle';
        more.textContent = openGroups[group.name] ? 'Show fewer' : '+ ' + tail + ' more';
        more.addEventListener('click', function () {
          openGroups[group.name] = !openGroups[group.name];
          track('filter-group-expand',
                ev({ group: group.name, open: openGroups[group.name] ? 'yes' : 'no' }));
          renderValues();
        });
        wrap.appendChild(more);
      }

      valueBar.appendChild(wrap);
    });

    if (q && !shown) noMatch();
  }

  /* ---------- rendering: what's currently picked ---------- */

  function modeSwitch() {
    var group = document.createElement('span');
    group.className = 'selection-mode';
    group.setAttribute('role', 'group');
    group.setAttribute('aria-label', 'Combine tags');

    ['all', 'any'].forEach(function (m) {
      var b = document.createElement('button');
      b.type = 'button';
      b.textContent = m;
      b.setAttribute('aria-pressed', String(state.mode === m));
      b.addEventListener('click', function () {
        if (state.mode === m) return;
        state.mode = m;
        track('filter-mode', ev({ mode: m, tags: state.picked.length }));
        renderSelection();
        draw();
      });
      group.appendChild(b);
    });

    return group;
  }

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

    /* One tag combines with nothing, so the switch would only be noise. */
    if (state.picked.length > 1) {
      selBar.appendChild(word('with'));
      selBar.appendChild(modeSwitch());
      selBar.appendChild(word('of'));
    } else {
      selBar.appendChild(word('tagged'));
    }

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
      track('filter-clear', ev({ from: 'clear-button' }));
      refresh();
    });
    selBar.appendChild(clear);
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

  function setView(name) {
    if (state.view === name) return;
    state.view = name;

    Array.prototype.forEach.call(viewBar.querySelectorAll('button'), function (b) {
      b.setAttribute('aria-pressed', String(b.getAttribute('data-view') === name));
    });

    track('filter-view', ev({ view: name, tags: state.picked.length }));
    draw();
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

  function setPicker(open) {
    if (!picker || !openBtn) return;
    picker.hidden = !open;
    openBtn.setAttribute('aria-expanded', String(open));
    if (open) {
      renderValues();
      if (searchIn) searchIn.focus();
    }
  }

  /* ---------- wiring ---------- */

  viewBar.addEventListener('click', function (e) {
    var btn = e.target.closest('button[data-view]');
    if (btn) setView(btn.getAttribute('data-view'));
  });

  if (orderBtn) {
    orderBtn.addEventListener('click', function () {
      var next = state.order === 'newest' ? 'oldest' : 'newest';
      setOrder(next);
      track('filter-order', ev({ order: next, view: state.view }));
    });
  }

  if (openBtn) {
    openBtn.addEventListener('click', function () {
      var open = picker.hidden;
      setPicker(open);
      if (open) track('filter-picker-open', ev({ view: state.view }));
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
      var first = valueBar.querySelector('button');
      if (first) first.click();
    });
  }

  /* Escape closes the picker, from anywhere inside the bar. */
  bar.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && picker && !picker.hidden) {
      setPicker(false);
      openBtn.focus();
    }
  });

  /* The jump list points at the category headings. From the tag or flat
     view, switch back first so there is something to jump to. */
  Array.prototype.forEach.call(
    document.querySelectorAll('.category-jump a'),
    function (a) {
      a.addEventListener('click', function (e) {
        track('overview-jump', ev({ category: a.textContent.trim() }));

        if (state.view === 'category') return;   // native anchor is fine
        e.preventDefault();
        setView('category');

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

  renderCount();
  bar.hidden = false;
})();
