# stanusch.net - a Hugo site

Rubik, black text, a crimson accent (`#9b0012`), and a particle field
behind the homepage.

---

## Running it

**Hugo 0.158.0 or newer is required.** The site uses the `build` front
matter key (which replaced `_build` in 0.145.0) and `Language.Locale`
(which replaced `LanguageCode` in 0.158.0). On macOS: `brew install hugo`.

From this folder:

```
hugo server
```

Open <http://localhost:1313>. Edits reload automatically.

To build the files you upload to your host:

```
hugo
```

Everything lands in `public/`. That folder's contents go into
`public_html` on your server. Nothing else gets uploaded.

---

## The homepage

The text in the centre of the homepage is the body of
`content/_index.md`:

```markdown
---
title: "Natalia Stanusch"
---

Researcher working on ***your one-line description***.
```

It's ordinary markdown, so headings, links, italics, and several
paragraphs all work - the layout centres whatever you put there.

---

## Adding a publication, project, or press item

One markdown file per item, in the matching folder. The **body of the file
is the entry** - you write it and style it, the theme doesn't assemble it.

`content/publications/my-new-article.md`:

```markdown
---
date: 2025-03-14
category: "Articles"
tags: ["archives", "digital humanities"]
---

[*The title of the piece*](https://doi.org/...). **Journal of Something**,
vol. 14, no. 2 (2025), pp. 33–58. Peer-reviewed.

An optional second paragraph describing the work.
```

Front matter holds organisation only, never appearance:

| Field | Does what |
|---|---|
| `category` | which heading the entry files under |
| `date` | sorts entries, newest first, within a category |
| `tags` | optional; builds the tag pages |
| `title` | optional; **turns the entry into a page** - see below |

Everything visible - italics, bold, links, punctuation, line breaks,
ordering - lives in the markdown body. Two entries on the same page can
be formatted completely differently.

### Short entry, or a page of its own

`title` is the switch:

**No `title`.** The entry is a citation. Its whole markdown body shows on
the section page and that's the end of it.

**A `title` is set.** The entry becomes a page you can write on. The
section page shows **only its first paragraph**, followed by a
"Read more" link; everything after that first paragraph lives on the
entry's own page.

```markdown
---
title: "Algorithmic archives and the limits of retrieval"
date: 2026-02-10
category: "Articles"
tags: ["archives"]
---

[*Algorithmic archives and the limits of retrieval*](https://doi.org/...).
**Third Journal**, vol. 3, no. 1 (2026), pp. 5–29.

Everything from this paragraph down appears only on the entry's own page.
Background, a longer abstract, links to data or slides - as much as you
like.
```

So the first paragraph does double duty: it's the citation line on the
section page and the opening of the full piece. Write it to work as both.

**`title` is never printed anywhere.** It sets the browser tab and the RSS
entry, and it's read out after "Read more" for screen readers. It is
deliberately not shown as a heading, because your first paragraph already
contains the title, styled how you wanted it - printing it again above
would duplicate it.

"First paragraph" really means **first block of any kind**. A body that
opens with a list or a heading shows that, not the first `<p>` further
down. If the opening block is a heading, the block after it comes too,
since a bare heading makes a useless preview.

Two small consequences worth knowing:

- A titled entry with only one paragraph still gets a "Read more" link,
  which leads to a page showing that same paragraph. If there's nothing
  more to say, leave `title` out.
- Untitled entries still have pages at their URLs; nothing links to them.
  They exist because Hugo only collects tags from pages it renders, so
  switching them off would empty the tag pages.

### Category headings and their order

Headings come from the `category` field. Their order is set in that
section's `_index.md`:

```yaml
category_order:
  - "Articles"
  - "Book Chapters"
```

Anything with a category not on that list still appears, alphabetically,
after the listed ones. Nothing silently disappears.

### Tags

Tags generate their own pages at `/tags/` automatically, and each tag
becomes a small link under the entry. Nothing to configure.

#### The controls: view, order, filter

`/publications/` and `/projects/` carry a bar with three independent
controls. They used to be one control called **Sort by**, which meant
picking a tag also changed the grouping and there was no way to narrow the
category view at all. They are now separate, and any filter works in any
view:

| Control | Options |
|---|---|
| **View** | *By category* (the curated `category_order` from `_index.md`), *By tag*, *One list* |
| **Order** | one button that flips between *↓ Newest first* and *↑ Oldest first* |
| **Filter by** | *Tags* — opens the picker below |

*By category* at *Newest first* with nothing filtered is exactly what the
server renders, so that combination restores the original HTML rather than
rebuilding it. Your curated order can never drift out of step with it.

#### Grouping the tag picker

The picker starts **closed**, behind the **Tags** button; a small badge on
that button counts what you have picked, so a filter is never invisible.
Which tags sit under which heading lives in `data/tag_groups.yaml`, and
nothing else needs editing to change it:

```yaml
groups:
  - name: AI               # a heading in the picker
    items:
      - tags:              # no name: one flat run of tags under it
          - AI
          - AI slop
      - name: Chatbots     # a labelled subgroup, nested under the heading
        tags: ["ChatGPT", "Gemini"]
```

Subgroups still work but are deliberately unused: headings inside headings
were harder to scan than one flat run. Add a `name` to a block if a group
ever grows enough to need the extra level.

Order in the file is order on the page, and the file lists tags most-used
first, because each group shows its first ten and hides the rest behind a
"+ n more". A few things it does for you:

- Matching ignores case, and the pill shows the tag as the entry spells it.
- Each pill carries the number of entries using that tag.
- A tag you list but haven't used yet is skipped, so you can add tags to
  the file ahead of using them. `Copilot`, `Gemini`, `Grok` and `Facebook`
  are sitting there now, waiting.
- A tag you've used but haven't listed collects under **Other** at the
  end. That group is the place to look for tags that need a home — it is
  empty right now, and worth keeping that way.
- A tag listed under two groups lands in the first one only.

#### Renaming or merging tags

`tools/retag.py` rewrites tag names across every entry's front matter. Add
a line to `RENAMES`, run `python3 tools/retag.py --dry-run` to see what it
would touch, then run it for real. Renaming a tag onto one that already
exists in the same entry merges them.

Two tags that meant the same thing were merged this way: `magic AI` (used
only by projects) into `AI magic` (used only by publications), and a stray
`elections` into `election integrity`. Remove those lines from `RENAMES`
if you want the distinction back.

#### Picking several tags at once

Clicking a tag adds it to the filter; clicking it again takes it out. Pick
two or more and a small **all / any** switch appears beside the button:

- **all** — only entries carrying *every* tag picked (the default)
- **any** — entries carrying *at least one* of them

That line also counts the matches and lists what's picked, so you can drop
a single tag with its `×` or drop the lot with **Clear**. A picked tag
stays visible in the picker even if its group is trimmed, so nothing
filters the list invisibly.

Narrowing with **all** can easily reach nothing — two tags that never
appear together on one entry. Rather than a blank page, that says so and
offers to switch to **any**.

#### Tags containing `/` or `&`

Hugo builds the tag page's URL from the tag itself, and treats a `/` as a
folder separator, so `Surrealism/Dada` would otherwise land at
`/tags/surrealism/dada/` — a nested path, with a 404 at the parent. Two
tags are pinned to sensible URLs instead:

| File | Pins |
| --- | --- |
| `content/tags/surrealism/dada/_index.md` | `/tags/surrealism-dada/` |
| `content/tags/api-/-data-access/_index.md` | `/tags/api-data-access/` |

The odd folder names are how Hugo files those two tags internally, so
they have to be spelled exactly that way. **Don't delete or rename those
folders** — the tag pages move back to the ugly URLs if you do. If you
add another tag with a `/` in it, copy the same pattern.

`&` is safe by comparison: `Ads & ad libraries` sits at
`/tags/ads--ad-libraries/`. The doubled dash is cosmetic, and that one
can't be pinned the same way, so it's left alone.

#### Renaming tags across every entry

`tools/retag.py` rewrites tag names in bulk. Edit the `RENAMES` map at
the top, then:

```bash
python3 tools/retag.py --dry-run   # show what would change
python3 tools/retag.py             # do it
```

Renaming a tag onto one an entry already has merges the two rather than
leaving a duplicate. Note that renaming changes the tag's URL, so the old
`/tags/<name>/` will 404 — add `aliases` to the new tag's `_index.md` if
that matters for a particular tag.

### URLs

URLs come from the filename, so name files deliberately:
`content/publications/algorithmic-archives.md` becomes
`/publications/algorithmic-archives/`.

## The About page

`content/about.md` has two parts:

- `lede` in the front matter is the **wide centred block** at the top.
- Everything below the front matter is the **left-aligned column**.

---

## Turning the blog on

It ships off. The templates already exist, so when you want it:

1. Create `content/blog/_index.md`:
   ```yaml
   ---
   title: "Blog"
   ---
   ```
2. Set `enableBlog = true` in `hugo.toml`.
3. Add posts as `content/blog/my-post.md` with `title`, `date`, and `tags`.

The `blog` link appears in the nav on its own. Set the flag back to
`false` to hide it again - posts stay on disk, untouched.

---

## Dark theme

The site follows the reader's system setting by default and stores
nothing. The moon/sun button in the header switches it manually, and
**only that click writes to localStorage** - until someone chooses, the
site keeps tracking their system, including if they change it while the
page is open.

Three states, in effect:

| localStorage `theme` | Behaviour |
|---|---|
| absent | follows the system, live |
| `"light"` | always light |
| `"dark"` | always dark |

The theme is applied by a small inline script in `<head>` (the partial
`layouts/partials/theme-init.html`) so the page never flashes the wrong
colours before the stylesheet loads. It has to stay inline for that
reason - moving it to an external file reintroduces the flash.

Dark colours are the `--ink`, `--paper`, `--muted`, and `--rule` values
under `/* Dark theme */` in `style.css`.

---

## The accent picker

**Click five times anywhere in the header** - not on a link or the theme
button - and a small panel appears with a dropdown of presets and a
free colour picker. The choice is saved to localStorage and applies to
links, hovers, the current-page marker, and the particles.

**Reset** in that panel clears both saved values, putting the site back
to following the system with the default crimson.

Presets live in `layouts/partials/header.html` as ordinary `<option>`
tags - edit that list to change them.

### Why the accent isn't always exactly the colour you picked

`#9b0012` on a near-black background is about 1.7:1 contrast, which is
unreadable. So the accent is checked against the current background and
its lightness moved until it clears WCAG AA (4.5:1). Whatever you pick
stays legible in both themes, including extremes like pure black or
bright yellow.

If a colour already passes, it's used exactly as given - in light mode
the presets are all untouched.

Two variables, so you can use either:

- `--accent` - exactly what was chosen
- `--accent-display` - the adjusted, legible version; **this is what
  everything paints with**

Adjustment happens in HSL rather than by mixing towards white or black,
which would desaturate: crimson would turn dusty pink, deep blue grey.

---

## particles.js is vendored, not loaded from a CDN

`static/js/particles.js` is the library itself, with its MIT licence
beside it. No third-party request, works offline, and nothing breaks if
a CDN changes. Updating means replacing that one file.

It is re-initialised whenever the accent or theme changes, since
particles.js cannot recolour a running instance. That logic is
`window.initParticles` in `particles-config.js`.

---

## Every page's text lives in a content file

Nothing user-facing is hardcoded in a template. The full map:

| Page | Comes from |
|---|---|
| Homepage | `content/_index.md` (body) |
| Publications / Projects / Press | `content/<section>/_index.md` - the title, the optional intro paragraph, and `category_order` |
| Individual entries | one file each in those folders |
| About | `content/about.md` - `lede` for the centred block, body for the rest |
| Tags index | `content/tags/_index.md` - title and optional intro |
| A single tag's page | `content/tags/<tag>/_index.md`, if you want an intro on it |
| 404 | `content/notfound.md` |
| Blog | `content/blog/_index.md` plus one file per post |

Site title, social links, the menu, and `enableBlog` stay in `hugo.toml`,
since they are settings rather than writing.

### Why the 404 file isn't called 404.md

It can't be. Hugo treats `content/404.md` as the 404 page itself, which
moves the output to `/404/index.html` - and marking that file
`render: never` stops `/404.html` being written at all. Since `/404.html`
at the root is the file GitHub Pages actually serves, the content lives in
`content/notfound.md` and `layouts/404.html` reads it.

Delete `content/notfound.md` and the template falls back to its own
wording, so the 404 page can never end up blank.


---

## The header and the kitten

On every page except the homepage, the header and a small cat answer to the
scroll direction — in opposite directions, on purpose:

- **Scrolling up** — the header slides back into view, and the cat ducks
  away. You are heading up the page and the nav is right there.
- **Scrolling down** — the header retracts, and the cat pops up out of the
  bottom-right corner pointing at the top of the page. Click it to go back.

So exactly one way back is on screen at a time, and they never compete for
the same corner of the eye. Neither appears within the first screen, or on
a page too short to scroll. The header will not retract while the accent
picker is open or while your keyboard focus is inside it.

The cat is drawn in `layouts/partials/back-to-top.html` as plain SVG — no
image file, so it takes the accent colour and inverts cleanly in dark mode.
It squints and says *mrrp!* if you hover it. It is rendered `hidden` and
only revealed by `js/scroll.js`, so a reader without JavaScript never gets
a cat that cannot do anything; the "↑ Back to top" line at the end of each
category still works for them.

`prefers-reduced-motion` stills the arrow's bounce and the tail's wag, and
makes the scroll to the top instant rather than animated.

---

## Analytics

Umami, self-hosted at `umami.stanusch.net`, loaded from `partials/footer.html`.
It is cookieless, and none of the events below carry anything about a
visitor — the payloads are tag names and section names.

Events are named in two places, and the split is deliberate:

- **`data-umami-event="..."` in the markup** — for things the server writes
  once and never touches again: the nav, the theme toggle, the social
  icons. Self-documenting, and it works whether or not `analytics.js`
  loads.
- **`window.siteTrack(name, data)` from JavaScript** — for everything else.
  The filter bar and the entry list are rebuilt in the browser, so an
  attribute on a rebuilt node would never be bound. `js/analytics.js`
  defines the helper and delegates clicks from the document, which is why
  a tag pill still reports itself after the list has been re-rendered
  fifteen times.

Anything already carrying `data-umami-event` is skipped by the delegate, so
no click is ever counted twice.

| Event | Fires when | Carries |
|---|---|---|
| `nav-*` | a nav link, the site name | — |
| `theme-toggle` | light/dark is switched | `to` |
| `filter-view` | *By category* / *By tag* / *One list* | `section`, `view` |
| `filter-order` | the newest/oldest arrow | `section`, `order` |
| `filter-picker-open` | the **Tags** button opens the picker | `section` |
| `filter-tag-add`, `filter-tag-remove` | a tag pill | `section`, `tag` |
| `filter-mode` | the **all / any** switch | `section`, `mode` |
| `filter-group-expand` | a "+ n more" toggle | `section`, `group` |
| `filter-search` | a tag search, on a pause | `section`, `query`, `found` |
| `filter-clear` | **Clear** or the **All** pill | `section` |
| `overview-jump` | a link in the Overview list | `section`, `category` |
| `tag-link` | a tag under an entry | `tag` |
| `entry-read-more` | a "Read more" link | `entry` |
| `outbound` | any link leaving the site (DOIs, press) | `url` |
| `back-to-top` | the kitten or a text link | `via` |
| `easter-egg-accent-panel` | five clicks on the header | — |
| `easter-egg-particles` | first click on the homepage field | — |
| `easter-egg-kitten` | someone clicks the cat five times | — |

`filter-search` records what people typed **and whether it matched
anything**. A run of misses is a list of tags worth adding.

Two things are throttled rather than sent per-event, because they would
otherwise be pure noise: a tag search waits for you to stop typing, and the
accent colour input records where you stopped dragging rather than every
colour you passed over.

---

## Things you'll likely want to change

In **`hugo.toml`**:

| Setting | What it does |
|---|---|
| `linkedin`, `bluesky` | Footer icon links. Delete one and its icon disappears. |
| `baseURL` | Must match your real domain before you deploy. |
| `enableBlog` | Blog on or off. |

In **`themes/stanusch/static/css/style.css`**, the `:root` block at the top:

| Variable | What it does |
|---|---|
| `--accent` | The default accent, before any reader picks their own. |
| `--measure` | Text column width. Larger = less white space on the right. |
| `--ink`, `--paper` | Text and background colours. |

In **`themes/stanusch/static/js/particles-config.js`**: particle count,
speed, and link distance. Colour is read from `--accent-display`, so you
never set it twice.

---

## Where things live

```
content/            your writing - this is the only folder you edit day to day
  _index.md         the homepage text
  about.md
  publications/
  projects/
  press/
  tags/             tag page intros, plus the two url pins (see Tags)
data/
  tag_groups.yaml   the groups in the tag picker
tools/
  retag.py          bulk-rename tags across every entry
themes/stanusch/
  layouts/
    _default/       page templates (list, single, about, taxonomy)
    blog/           blog templates
    partials/       header, nav, footer, social, particles, entry, tags,
                    theme-init (inline, must stay in <head>)
    index.html      the homepage
  static/
    css/style.css
    js/filters.js            the view / order / filter controls
    js/analytics.js          siteTrack() + delegated umami events
    js/scroll.js             retracting header, the back-to-top kitten
    js/theme.js              toggle + accent picker
    js/particles-config.js
    js/particles.js          vendored library
hugo.toml           site settings
```

Every repeated piece of the page is a partial. Change
`partials/footer.html` once and it changes everywhere.

---

## Deploying with GitHub Actions to GitHub Pages

Two workflows ship in `.github/workflows/`:

| Workflow | Runs on | Does |
|---|---|---|
| `deploy.yml` | push to `main`, or by hand | builds and publishes to GitHub Pages |
| `build-check.yml` | pull requests, other branches | builds only, so breakage never reaches the live site |

Hugo is **pinned to 0.165.0** in both files - the version this site is
known to build with. Bump it deliberately rather than tracking latest.

### One-time setup

1. Push this folder to a GitHub repo. The repo root must be *this*
   folder - `hugo.toml` and `.github/` sit at the top level, not inside
   a subfolder.

2. In the repo: **Settings → Pages → Build and deployment → Source**,
   choose **GitHub Actions**. This step is required; without it the
   deploy job fails.

3. Push to `main`. Watch the run under the **Actions** tab. First deploy
   takes a couple of minutes.

Your site appears at `https://USERNAME.github.io/REPO-NAME/`. The
templates handle that subpath correctly, so check it works there before
attaching your domain.

### Attaching stanusch.net

1. **Settings → Pages → Custom domain**, enter `stanusch.net`, save.

2. At your DNS provider, create four A records for the apex domain
   pointing at GitHub:

   ```
   185.199.108.153
   185.199.109.153
   185.199.110.153
   185.199.111.153
   ```

   And optionally four AAAA records for IPv6:

   ```
   2606:50c0:8000::153
   2606:50c0:8001::153
   2606:50c0:8002::153
   2606:50c0:8003::153
   ```

   If you also want `www.stanusch.net` to work, add a CNAME record for
   `www` pointing to `USERNAME.github.io`.

3. Wait for DNS to propagate - up to 24 hours, usually far less - then
   tick **Enforce HTTPS** in Settings → Pages. GitHub issues the
   certificate automatically once the DNS check passes.

You do not need to edit `baseURL` in `hugo.toml` for any of this. The
workflow overrides it with whatever GitHub reports, so the same repo
builds correctly on the `github.io` subpath and on your domain.

`baseURL` only matters for `hugo server` locally.

### If the deploy fails

- *"Resource not accessible by integration"* - step 2 above wasn't done.
  Set the Pages source to GitHub Actions.
- *Site loads but unstyled* - the custom domain in Settings doesn't match
  the domain you're visiting. They have to agree.
- *404 on every page but the homepage* - usually a stale `CNAME` file in
  `static/`. This site doesn't ship one; you shouldn't need one.

---

## Deploying somewhere else instead

Run `hugo`, then upload the *contents* of `public/` into `public_html`
via SFTP. Repeat after each change. Netlify, Vercel, and Cloudflare Pages
also detect Hugo automatically if you'd rather use one of those.

---

## Note on the particle field

It runs on the homepage only - moving dots behind body text hurt
readability. To use it everywhere, open
`themes/stanusch/layouts/_default/baseof.html` and change

```
{{ if .IsHome }}{{ partial "particles.html" . }}{{ end }}
```

to just

```
{{ partial "particles.html" . }}
```

and drop `has-particles` onto the body class for every page.

The library loads from a CDN. If it ever fails, the page stays plain
white rather than breaking.
