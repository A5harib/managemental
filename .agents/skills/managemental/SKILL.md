---
name: managemental
description:
  Upload, edit, fetch, and search files on Managemental — the shared file
  drop and dashboard for agent work (screenshots, test results, HTML
  reports). Use whenever producing something visual or shareable: test runs,
  screenshots, browser/Playwright sessions, comparisons, reports, or any
  "show me" request. Also use proactively, even unprompted, when the result
  of your work would be clearer as a rendered page than as chat text.
---

# Managemental

Managemental is a public, no-login file drop + dashboard at
`https://managemental.vercel.app`. Every file you save there gets a
permanent, shareable URL and shows up on the dashboard — it's the difference
between a screenshot that disappears into a temp folder and one the user can
actually open, and between a wall of pasted terminal output and a page they
can read.

## The one rule: website endpoint only

**Always call `https://managemental.vercel.app/api/*`. Never call the Convex
deployment directly** (`*.convex.cloud`, `*.convex.site`), even if you find
that URL in a response or old doc. The website endpoint is the one that:

- forwards uploads into your Jarvis account when you're signed in
- is the stable public contract (the Convex deployment is an implementation
  detail and can change)

If a response ever hands you a raw `*.convex.site` URL (e.g. as `raw`), that's
fine to *embed* (e.g. as an `<img src>`) — just never *call* it directly for
upload/edit/meta/grep. Do those through `/api/*` on the website domain.

## Trigger words — when to reach for this skill

Treat any of these, in the user's request or as the natural shape of your
own output, as a signal to use Managemental instead of (or in addition to)
printing to chat:

- **"test", "run the tests", "screenshot(s)", "show me", "let me see",
  "check if it works", "verify", "QA", "review this visually"**
- Any Playwright / browser-automation / visual-regression task
- Producing an HTML report, comparison, dashboard, or summary of results
- Multi-step work where the end state is easier to *see* than *read*
- The user pastes or describes a bug and a screenshot would remove ambiguity

**Shorthand:** if the user says **"mm"** or **"mm this"** — e.g. *"mm this
test run"*, *"mm the checkout flow"* — that means "make a Managemental (report
+ screenshots) for this and give me the link." Treat it as equivalent to a
full explicit request; don't ask for clarification on what "mm" means.

## Default toward artifacts, don't wait to be asked

If you just ran tests, took screenshots, or built something visually
checkable, the default output is a Managemental HTML report with the
screenshots embedded and a link back — not a text summary. Producing the
artifact and handing over the link is the deliverable; a chat paragraph
describing what you did is not a substitute for it. Do this even when the
user didn't explicitly ask for a report, as long as the work produced
something worth looking at.

## Workflow

1. **Capture** — take screenshots, gather output files, render an HTML page.
2. **Upload assets first** — `POST /api/upload` each screenshot/file. Keep
   the returned `raw` URLs (or `url` viewer links) — you'll embed the `raw`
   ones as `<img src>` in the report.
3. **Write the report** — a single self-contained HTML file. See Design
   below. Reference the already-uploaded screenshots by their `raw` URL, not
   local paths.
4. **Upload the report** — `POST /api/upload` the HTML file itself, same
   endpoint.
5. **Give the user the link** — the `url` field from that last upload
   (`https://managemental.vercel.app/v/<id>`). Say what it shows in one line;
   let the page do the rest.

Use the same `session` value (a short slug like `checkout-flow-2026-07-22`)
for every file in one run — the dashboard groups by session, so a whole
test run or task becomes one browsable set instead of scattered files.

## Endpoints (all under `https://managemental.vercel.app`)

### Upload

```bash
curl -X POST https://managemental.vercel.app/api/upload \
  -F file=@screenshot.png \
  -F session=checkout-flow-2026-07-22 \
  -F agent=claude \
  -F note="<detailed paragraph, see below>"
```

Raw body works too (no multipart client handy):

```bash
curl -X POST https://managemental.vercel.app/api/upload \
  --data-binary @report.html \
  -H "X-Filename: report.html" \
  -H "X-Session: checkout-flow-2026-07-22" \
  -H "X-Agent: claude" \
  -H "X-Note: <detailed paragraph>"
```

The uploaded filename becomes the URL slug — `screenshot.png` uploads to
`/v/screenshot.png`. **Names must be unique across all of Managemental.** If
you re-upload an existing name, you get back a `409`:

```json
{ "error": "duplicate_name", "message": "A file named \"screenshot.png\" already exists. Rename your file and upload it again." }
```

When that happens, rename the file (e.g. add a timestamp or session suffix)
and re-upload — don't retry the same name. This is also why a per-run
`session` slug is worth including in filenames for anything you might
generate more than once (a report you regenerate, a screenshot from a
repeated step).

Success response:

```json
{
  "id": "j57...",
  "url": "https://managemental.vercel.app/v/screenshot.png",
  "raw": "https://acoustic-dodo-934.convex.site/f/screenshot.png",
  "name": "screenshot.png", "mime": "image/png", "size": 48213,
  "session": "checkout-flow-2026-07-22", "note": "..."
}
```

`url` is what you hand to the user. `raw` is what you put in `<img src>`
when building a report that embeds this file.

### Get

```bash
curl https://managemental.vercel.app/api/f/<name>        # raw bytes
curl https://managemental.vercel.app/api/meta/<name>      # JSON metadata
```

### Edit a file you uploaded

Same name, same URL, new bytes. Use this to correct or update a report
instead of uploading a duplicate:

```bash
curl -X PUT https://managemental.vercel.app/api/f/<name> -F file=@updated-report.html
```

### Search your files

```bash
curl "https://managemental.vercel.app/api/grep?q=timeout&session=checkout-flow-2026-07-22&limit=20"
```

Searches file names, notes, and (for text/JSON/CSV) file contents.

## Write a real `note`

`note` shows on the file's page and, if the uploader is signed in, on their
Jarvis dashboard. Write a paragraph, not a tag:

- what the file is and what state the app/test was in
- what you were checking and why
- anything surprising about the result — flakiness, a near-miss, a caveat

Good: *"Full regression pass for the login flow after the password-reset fix
landed. All five scenarios pass; the two retries visible in the trace were
the app being slow to hydrate, not real flakiness. Screenshot is the final
authenticated state."*

Bad: *"login test"*

## Design principles for reports (agents building the HTML)

The report is the actual deliverable — treat it like a real page, not a
debug dump. A cramped, grey, wall-of-`<pre>` report is worse than not making
one.

1. **Hierarchy first.** One clear heading, then sections. The reader should
   be able to tell what passed/failed/changed in the first five seconds
   without reading prose.
2. **Lead with the verdict.** Pass/fail counts, a status table, or a one-line
   summary at the top — not buried after a wall of setup narration.
3. **Real visual results, not text pretending to be visual.** A comparison
   is a side-by-side `<img>` grid, not two file paths in a list. A
   pass/fail table is an actual `<table>` with color-coded cells, not
   `PASS: true` printed five times.
4. **Generous whitespace and readable type.** `system-ui` or similar,
   comfortable line-height (1.5+), max-width on body text (~700-900px) so
   lines don't run edge to edge, real padding on cards/sections.
5. **Color with intent, not decoration.** Green/red for pass/fail is fine;
   don't rainbow the whole page. Pick 2-3 accent colors and stay consistent.
6. **Every image gets a caption.** A screenshot with no label makes the
   reader guess what they're looking at and why it's there.
7. **Use the Tailwind CDN for styling.** Add
   `<script src="https://cdn.tailwindcss.com"></script>` in `<head>` and
   build the report with utility classes — it's faster than hand-rolling CSS
   and gives consistent spacing/type scale for free. It loads inside
   Managemental's own `<iframe>` viewer, which needs network access to
   `cdn.tailwindcss.com` — if a report ever renders blank or unstyled
   (blocked network, CSP), fall back to inline `<style>` CSS instead so the
   report still works standalone.
8. **Dark or light, but committed.** Don't leave default black-on-white
   Times New Roman. Pick a palette on purpose. (If the work is
   Managemental-adjacent, its own theme — warm lamp-glow amber on dark, with
   sticky-note-yellow cards — is a reasonable default, but any deliberate,
   coherent palette is fine.)
9. **State what you didn't check.** If coverage is partial or a check was
   skipped, say so in the report — a report that implies more confidence
   than the work supports is worse than no report.

## What NOT to do

- Don't call the Convex endpoint directly for API actions (upload/edit/
  meta/grep) — website endpoint only (embedding a `raw` Convex URL in
  `<img src>` is fine, see above).
- Don't upload a report without embedding the screenshots it references —
  a report that links out to local files the user can't open defeats the
  point.
- Don't write one-line notes for anything meant to be found later via grep
  or skimmed on the dashboard.
- Don't silently skip making a report when the work clearly produced
  something visual — default to shipping it.
