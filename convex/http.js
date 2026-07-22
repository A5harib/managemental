import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { api } from "./_generated/api";

const http = httpRouter();

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, X-Session, X-Agent, X-Note, X-Filename",
};

// POST /upload
// Two ways to send bytes:
//   multipart:  curl -F file=@shot.png -F session=run-42 -F agent=claude .../upload
//   raw body:   curl --data-binary @shot.png -H "X-Filename: shot.png" -H "X-Session: run-42" .../upload
// Returns { id, url, viewer }.
const upload = httpAction(async (ctx, req) => {
  const site = new URL(req.url).origin;
  const ct = req.headers.get("content-type") || "";

  let blob, name, session, agent, note;

  if (ct.includes("multipart/form-data")) {
    const form = await req.formData();
    const file = form.get("file");
    if (!file || typeof file === "string") {
      return json({ error: "no file field" }, 400);
    }
    blob = file;
    name = form.get("name") || file.name || "file";
    session = form.get("session") || "";
    agent = form.get("agent") || "";
    note = form.get("note") || "";
  } else {
    blob = await req.blob();
    name = req.headers.get("x-filename") || "file";
    session = req.headers.get("x-session") || "";
    agent = req.headers.get("x-agent") || "";
    note = req.headers.get("x-note") || "";
  }

  const storageId = await ctx.storage.store(blob);
  const id = await ctx.runMutation(api.files.record, {
    storageId,
    name: String(name),
    mime: blob.type || "application/octet-stream",
    size: blob.size,
    session: String(session),
    agent: String(agent),
    note: String(note),
  });

  return json({
    id,
    url: `${site}/f/${id}`,
    viewer: `${site}/v/${id}`,
    name: String(name),
    mime: blob.type || "application/octet-stream",
    size: blob.size,
    session: String(session),
    note: String(note),
  });
});

// GET /f/:id  -> serve the raw file bytes inline (so HTML/images render in-browser)
const serve = httpAction(async (ctx, req) => {
  const id = new URL(req.url).pathname.split("/").pop();
  const row = await ctx.runQuery(api.files.get, { id });
  if (!row || !row.url) return new Response("not found", { status: 404 });
  const res = await fetch(row.url);
  const headers = new Headers(res.headers);
  headers.set("Content-Type", row.mime);
  headers.set("Content-Disposition", `inline; filename="${row.name}"`);
  headers.set("Access-Control-Allow-Origin", "*");
  return new Response(res.body, { status: res.status, headers });
});

// PUT /f/:id  -> agent edit: replace a file's bytes in place, id/url unchanged.
// Same body formats as POST /upload (multipart `file=` or raw body + X-Filename).
const replace = httpAction(async (ctx, req) => {
  const id = new URL(req.url).pathname.split("/").pop();
  const ct = req.headers.get("content-type") || "";

  let blob;
  if (ct.includes("multipart/form-data")) {
    const form = await req.formData();
    const file = form.get("file");
    if (!file || typeof file === "string") return json({ error: "no file field" }, 400);
    blob = file;
  } else {
    blob = await req.blob();
  }

  const existing = await ctx.runQuery(api.files.get, { id });
  if (!existing) return json({ error: "not found" }, 404);

  const storageId = await ctx.storage.store(blob);
  await ctx.runMutation(api.files.replaceContent, {
    id,
    storageId,
    mime: blob.type || existing.mime,
    size: blob.size,
  });

  const site = new URL(req.url).origin;
  return json({ id, url: `${site}/f/${id}`, viewer: `${site}/v/${id}` });
});

// GET /meta/:id -> JSON metadata for a file (name, mime, size, session, note, urls).
// Use this to fetch a file's info; use GET /f/:id for the raw bytes themselves.
const meta = httpAction(async (ctx, req) => {
  const id = new URL(req.url).pathname.split("/").pop();
  const row = await ctx.runQuery(api.files.get, { id });
  if (!row) return json({ error: "not found" }, 404);
  const site = new URL(req.url).origin;
  return json({
    id: row._id,
    name: row.name,
    mime: row.mime,
    size: row.size,
    session: row.session,
    agent: row.agent,
    note: row.note,
    createdAt: row._creationTime,
    url: `${site}/f/${id}`,
    viewer: `${site}/v/${id}`,
  });
});

// GET /grep?q=text&session=optional&limit=optional
// Searches file names, notes, and (for text-like mime types) file contents.
const grep = httpAction(async (ctx, req) => {
  const params = new URL(req.url).searchParams;
  const q = params.get("q");
  if (!q) return json({ error: "q query param is required" }, 400);
  const session = params.get("session") || undefined;
  const limit = params.get("limit") ? Number(params.get("limit")) : undefined;

  const results = await ctx.runQuery(api.files.grep, { q, session, limit });
  const site = new URL(req.url).origin;
  return json({
    results: results.map((r) => ({ ...r, viewer: `${site}/v/${r.id}` })),
  });
});

http.route({ path: "/upload", method: "POST", handler: upload });
http.route({
  path: "/upload",
  method: "OPTIONS",
  handler: httpAction(async () => new Response(null, { status: 204, headers: CORS })),
});
http.route({ path: "/grep", method: "GET", handler: grep });
http.route({
  path: "/grep",
  method: "OPTIONS",
  handler: httpAction(async () => new Response(null, { status: 204, headers: CORS })),
});
http.route({ pathPrefix: "/f/", method: "GET", handler: serve });
http.route({ pathPrefix: "/f/", method: "PUT", handler: replace });
http.route({
  pathPrefix: "/f/",
  method: "OPTIONS",
  handler: httpAction(async () => new Response(null, { status: 204, headers: CORS })),
});
http.route({ pathPrefix: "/meta/", method: "GET", handler: meta });

export default http;

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "Content-Type": "application/json", ...CORS },
  });
}
