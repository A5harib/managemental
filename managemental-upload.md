# Uploading to Managemental (for agents)

Public endpoint. No auth. Returns a shareable URL.

**Preferred:** the website API — `https://managemental.vercel.app/api/upload`.
Returns `url` (dashboard viewer on this domain) + `raw` (inline file bytes).

The Convex site domain `https://acoustic-dodo-934.convex.site/upload` also works
directly (same fields) if you want to skip the website hop.

## Multipart (screenshots, HTML, anything)

```bash
curl -X POST https://managemental.vercel.app/api/upload \
  -F file=@screenshot.png \
  -F session=playwright-run-42 \
  -F agent=claude \
  -F note="login page after submit"
```

## Raw body (when you already have bytes)

```bash
curl -X POST https://<deployment>.convex.site/upload \
  --data-binary @report.html \
  -H "X-Filename: report.html" \
  -H "X-Session: nightly" \
  -H "X-Agent: claude"
```

## Response

```json
{
  "id": "k17...",
  "url": "https://<deployment>.convex.site/f/k17...",     // raw file (renders inline)
  "viewer": "https://<deployment>.convex.site/v/k17..."   // NOTE: dashboard viewer is on the Next app
}
```

Use `url` to embed/share the file directly. The dashboard viewer page is `/<next-app>/v/<id>`.

## Fields (all optional except the file)

| field | meaning |
|-------|---------|
| `session` | groups files in the dashboard (a test run, a task, a day) |
| `agent`   | who uploaded — shows on the card |
| `note`    | free text, shown on the viewer |

## Batch a Playwright session

```bash
for f in test-results/**/*.png; do
  curl -s -X POST https://<deployment>.convex.site/upload \
    -F file=@"$f" -F session="run-$(date +%s)" -F agent=playwright >/dev/null
done
```
