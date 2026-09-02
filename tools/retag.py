#!/usr/bin/env python3
"""
Rewrite tag names across content/ front matter.

Run from the site root:      python3 tools/retag.py
Preview without writing:     python3 tools/retag.py --dry-run

Edit RENAMES below and re-run to make further tag changes. Renaming a tag
onto one that already exists in the same entry merges them (the duplicate
is dropped, original order preserved).
"""

import argparse
import pathlib
import re
import sys
from collections import Counter

# --- Requested renames ------------------------------------------------------
RENAMES = {
    "methods":          "research protocols",
    "API":              "API / data access",
    "media archeology": "media archaeology",
    "post-humanist":    "post-humanism",
    "propaganda":       "disinformation",
    "ads":              "Ads & ad libraries",
    "surrealism":       "Surrealism/Dada",
    "Dada":             "Surrealism/Dada",

    # Two names for one subject, split across sections: "magic AI" was only
    # ever used by projects and "AI magic" only by publications, so nothing
    # linked the two. Same for a lone "elections" beside "election integrity".
    "magic AI":         "AI magic",
    "elections":        "election integrity",
}

# --- Misspellings and casing that block clean grouping ----------------------
# Same meaning as their target, just typed differently in a few entries.
NORMALISE = {
    "chabots":              "chatbots",
    "Agnetic AI Accounts":  "Agentic AI Accounts",
    "auto-ethnography":     "autoethnography",
    "elections integrity":  "election integrity",
    "AI Search":            "AI search",
}

TAGS_LINE = re.compile(r'^(tags:\s*)\[(.*)\]\s*$', re.MULTILINE)
QUOTED = re.compile(r'"((?:[^"\\]|\\.)*)"')


def rewrite(tags, mapping, stats):
    """Apply mapping, then drop duplicates while keeping first-seen order."""
    out, seen = [], set()
    for tag in tags:
        new = mapping.get(tag, tag)
        if new != tag:
            stats[(tag, new)] += 1
        if new.casefold() in seen:
            stats[(new, "<merged duplicate>")] += 1
            continue
        seen.add(new.casefold())
        out.append(new)
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--dry-run", action="store_true")
    ap.add_argument("--root", default="content")
    args = ap.parse_args()

    root = pathlib.Path(args.root)
    if not root.is_dir():
        sys.exit(f"No {root}/ directory here - run this from the site root.")

    mapping = {**RENAMES, **NORMALISE}
    stats = Counter()
    touched = 0

    for path in sorted(root.rglob("*.md")):
        text = path.read_text(encoding="utf-8")
        # Only the front matter block, so a tags: line in prose is left alone.
        end = text.find("\n---", 4)
        if not text.startswith("---") or end == -1:
            continue
        head, body = text[:end], text[end:]

        def sub(match):
            tags = QUOTED.findall(match.group(2))
            new = rewrite(tags, mapping, stats)
            joined = ", ".join('"%s"' % t.replace('"', '\\"') for t in new)
            return "%s[%s]" % (match.group(1), joined)

        new_head = TAGS_LINE.sub(sub, head)
        if new_head != head:
            touched += 1
            if not args.dry_run:
                path.write_text(new_head + body, encoding="utf-8")

    label = "Would change" if args.dry_run else "Changed"
    print("%s %d file(s)\n" % (label, touched))
    for (old, new), n in sorted(stats.items(), key=lambda kv: (-kv[1], kv[0][0].lower())):
        print("  %-24s -> %-24s %d" % (old, new, n))


if __name__ == "__main__":
    main()
