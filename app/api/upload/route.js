import { auth } from "@clerk/nextjs/server";

// POST /api/upload — website-domain alias for the Convex upload endpoint.
// Forwards the raw request body+headers to Convex, rewrites returned URLs to
// point back at this site's viewer. If the uploader is signed in (Clerk),
// the file is also pushed to Jarvis so it shows up on their workflows page.
const SITE = process.env.NEXT_PUBLIC_CONVEX_URL.replace(".convex.cloud", ".convex.site");

export async function POST(req) {
  const res = await fetch(`${SITE}/upload`, {
    method: "POST",
    headers: req.headers,
    body: req.body,
    duplex: "half", // required when streaming a request body
  });
  const data = await res.json();
  const origin = new URL(req.url).origin;
  if (data.id) {
    data.raw = `${SITE}/f/${data.id}`; // inline file bytes (Convex serves these)
    data.viewer = `${origin}/v/${data.id}`; // dashboard viewer on this domain
    data.url = data.viewer;

    forwardToJarvis(data).catch((err) => console.error("Jarvis ingest failed:", err));
  }
  return Response.json(data, { status: res.status });
}

async function forwardToJarvis(file) {
  const { userId } = await auth();
  if (!userId) return; // not signed in — stays Managemental-only
  if (!process.env.JARVIS_WEB_URL || !process.env.MANAGEMENTAL_INGEST_SECRET) return;

  await fetch(`${process.env.JARVIS_WEB_URL}/api/managementals/ingest`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.MANAGEMENTAL_INGEST_SECRET}`,
    },
    body: JSON.stringify({
      clerkUserId: userId,
      managementalId: file.id,
      name: file.name,
      mime: file.mime,
      size: file.size,
      session: file.session,
      note: file.note,
      url: file.viewer,
      rawUrl: file.raw,
    }),
  });
}

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "*",
    },
  });
}
