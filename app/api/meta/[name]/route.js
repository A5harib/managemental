// GET /api/meta/:name — website-domain alias: JSON metadata for a file.
const SITE = process.env.NEXT_PUBLIC_CONVEX_URL.replace(".convex.cloud", ".convex.site");

export async function GET(req, { params }) {
  const { name } = await params;
  const res = await fetch(`${SITE}/meta/${encodeURIComponent(name)}`);
  return Response.json(await res.json(), { status: res.status });
}
