// GET/PUT /api/f/:name — website-domain alias for editing/fetching a single file.
// GET returns the raw bytes; PUT replaces them in place (same name/url).
const SITE = process.env.NEXT_PUBLIC_CONVEX_URL.replace(".convex.cloud", ".convex.site");

export async function GET(req, { params }) {
  const { name } = await params;
  const res = await fetch(`${SITE}/f/${encodeURIComponent(name)}`);
  if (!res.ok) return new Response(res.body, { status: res.status });

  // fetch() auto-decompresses the body but leaves content-encoding/length on
  // res.headers pointing at the original compressed size — forwarding those
  // verbatim produces a response whose declared length doesn't match the
  // actual (decoded) bytes, which strips the body entirely at the edge.
  const headers = new Headers(res.headers);
  headers.delete("content-encoding");
  headers.delete("content-length");
  return new Response(res.body, { status: res.status, headers });
}

export async function PUT(req, { params }) {
  const { name } = await params;
  const res = await fetch(`${SITE}/f/${encodeURIComponent(name)}`, {
    method: "PUT",
    headers: req.headers,
    body: req.body,
    duplex: "half",
  });
  return Response.json(await res.json(), { status: res.status });
}
