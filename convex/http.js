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

http.route({ path: "/upload", method: "POST", handler: upload });
http.route({
  path: "/upload",
  method: "OPTIONS",
  handler: httpAction(async () => new Response(null, { status: 204, headers: CORS })),
});
http.route({ pathPrefix: "/f/", method: "GET", handler: serve });

export default http;

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "Content-Type": "application/json", ...CORS },
  });
}
