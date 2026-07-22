// POST /api/upload — website-domain alias for the Convex upload endpoint.
// Forwards the raw request body+headers to Convex, rewrites returned URLs to
// point back at this site's viewer. Same fields as the Convex endpoint.
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
  }
  return Response.json(data, { status: res.status });
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
