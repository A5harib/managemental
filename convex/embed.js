// HuggingFace Inference API — all-MiniLM-L6-v2 (384-dim). Same model/endpoint
// as jarvis-web's convex/embed.ts, so vectors would be comparable if ever
// compared across the two projects. Plain fetch, safe in the default Convex
// runtime (no Node built-ins).
const HF_MODEL = "sentence-transformers/all-MiniLM-L6-v2";
const HF_URL = `https://router.huggingface.co/hf-inference/models/${HF_MODEL}/pipeline/feature-extraction`;

// Returns a 384-dim float array, or null on any failure (missing key, empty
// text, HF down). Callers treat null as "no embedding" rather than aborting
// the upload — the vector map just skips files with none.
export async function embedTextSafe(text) {
  const key = process.env.HUGGINGFACE_API_KEY;
  if (!key || !text || !text.trim()) return null;

  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const res = await fetch(HF_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${key}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ inputs: text, options: { wait_for_model: true } }),
      });
      if (res.status === 503) {
        await new Promise((r) => setTimeout(r, 1500 * attempt));
        continue;
      }
      if (!res.ok) return null;
      const json = await res.json();
      const vector = Array.isArray(json[0]) ? json[0] : json;
      return Array.isArray(vector) && vector.length > 0 ? vector : null;
    } catch {
      return null;
    }
  }
  return null;
}
