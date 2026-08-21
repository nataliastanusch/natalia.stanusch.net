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
themes/stanusch/
  layouts/
    _default/       page templates (list, single, about, taxonomy)
    blog/           blog templates
    partials/       header, nav, footer, social, particles, entry, tags,
                    theme-init (inline, must stay in <head>)
    index.html      the homepage
  static/
    css/style.css
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
