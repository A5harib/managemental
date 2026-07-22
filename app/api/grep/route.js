// GET /api/grep?q=text&session=optional&limit=optional — website-domain alias.
const SITE = process.env.NEXT_PUBLIC_CONVEX_URL.replace(".convex.cloud", ".convex.site");

export async function GET(req) {
  const qs = new URL(req.url).search;
  const res = await fetch(`${SITE}/grep${qs}`);
  return Response.json(await res.json(), { status: res.status });
}
