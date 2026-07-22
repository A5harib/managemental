// Upload endpoint lives on the Convex *site* domain (.convex.site), not the
// .convex.cloud API domain. Derive it from the public URL.
export const SITE = (process.env.NEXT_PUBLIC_CONVEX_URL || "").replace(
  ".convex.cloud",
  ".convex.site"
);

export const fileUrl = (id) => `${SITE}/f/${id}`;

export function kind(mime = "") {
  if (mime.startsWith("image/")) return "image";
  if (mime.startsWith("video/")) return "video";
  if (mime === "text/html") return "html";
  if (mime.includes("json")) return "json";
  if (mime === "text/csv") return "csv";
  if (mime.startsWith("text/")) return "text";
  return "other";
}

export function humanSize(n) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

export function ago(ms) {
  const s = (Date.now() - ms) / 1000;
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}
