"use client";
import { useMemo, useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import Link from "next/link";
import Logo from "../Logo";
import { kind } from "../lib";
import { projectTo2D } from "../pca";

const KIND_COLOR = {
  image: "#7fc8dc",
  video: "#c98fe0",
  html: "#ffcf7a",
  json: "#8fdc9e",
  csv: "#8fdc9e",
  text: "#e8dcc4",
  other: "#b9a98f",
};

// Only draw a line between two files if their notes are this similar —
// otherwise every point ends up connected to every other point and the map
// turns into an unreadable hairball instead of showing real structure.
const EDGE_THRESHOLD = 0.55;
// Cap edges per file so one generic note doesn't fan out to everything.
const MAX_EDGES_PER_NODE = 4;

function cosineSim(a, b) {
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  return dot / (Math.sqrt(na) * Math.sqrt(nb) || 1);
}

// Computed on the original 384-dim embeddings, not the 2D projection —
// PCA distance in 2D is a lossy stand-in for real similarity, cosine on the
// full vector is the ground truth for "how alike are these two notes."
function buildEdges(files) {
  const edges = [];
  const perNodeCount = new Map();
  const scored = [];
  for (let i = 0; i < files.length; i++) {
    for (let j = i + 1; j < files.length; j++) {
      const sim = cosineSim(files[i].embedding, files[j].embedding);
      if (sim >= EDGE_THRESHOLD) scored.push({ i, j, sim });
    }
  }
  scored.sort((a, b) => b.sim - a.sim);
  for (const e of scored) {
    const ci = perNodeCount.get(e.i) || 0;
    const cj = perNodeCount.get(e.j) || 0;
    if (ci >= MAX_EDGES_PER_NODE || cj >= MAX_EDGES_PER_NODE) continue;
    edges.push(e);
    perNodeCount.set(e.i, ci + 1);
    perNodeCount.set(e.j, cj + 1);
  }
  return edges;
}

export default function VectorMap() {
  const files = useQuery(api.files.listWithEmbeddings, {});
  const [hover, setHover] = useState(null);

  // 2D projection is computed client-side (see app/pca.js) — recomputes on
  // every load, which is fine at Managemental's scale and means the map is
  // always live, never stale precomputed coordinates.
  const points = useMemo(() => {
    if (!files || files.length === 0) return [];
    const coords = projectTo2D(files.map((f) => f.embedding));
    return files.map((f, i) => ({ ...f, ...coords[i] }));
  }, [files]);

  const edges = useMemo(() => {
    if (!files || files.length < 2) return [];
    return buildEdges(files);
  }, [files]);

  return (
    <main className="w-full max-w-6xl mx-auto px-6 py-10">
      <header className="flex items-center gap-4 mb-8">
        <Link href="/" className="flex items-center gap-3">
          <Logo size={56} />
        </Link>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight glow" style={{ color: "#ffe4b0" }}>
            Vector map
          </h1>
          <p className="text-sm" style={{ color: "#b9a98f" }}>
            Every file, placed by how similar its note is to the others.
          </p>
        </div>
      </header>

      {files === undefined ? (
        <p style={{ color: "#b9a98f" }}>Loading…</p>
      ) : points.length === 0 ? (
        <p style={{ color: "#b9a98f" }}>
          No embedded files yet. Files get embedded from their <code>note</code> — upload
          something with a real note to see it appear here.
        </p>
      ) : (
        <>
          <div
            className="relative rounded-xl border overflow-hidden"
            style={{ borderColor: "#3a2c1a", background: "#0d0a07", aspectRatio: "16 / 9" }}
          >
            <svg viewBox="-1.15 -1.15 2.3 2.3" className="w-full h-full">
              {/* faint center cross for orientation, no axis labels — this space is relative, not measured */}
              <line x1="-1.15" y1="0" x2="1.15" y2="0" stroke="#3a2c1a" strokeWidth="0.004" />
              <line x1="0" y1="-1.15" x2="0" y2="1.15" stroke="#3a2c1a" strokeWidth="0.004" />
              {edges.map((e) => {
                const a = points[e.i];
                const b = points[e.j];
                const dimmed = hover && hover !== a.name && hover !== b.name;
                return (
                  <line
                    key={`${a.name}-${b.name}`}
                    x1={a.x}
                    y1={-a.y}
                    x2={b.x}
                    y2={-b.y}
                    stroke="#ffcf7a"
                    strokeWidth={0.003 + (e.sim - EDGE_THRESHOLD) * 0.012}
                    strokeOpacity={dimmed ? 0.06 : 0.18 + (e.sim - EDGE_THRESHOLD) * 0.6}
                    style={{ transition: "stroke-opacity 0.1s" }}
                  />
                );
              })}
              {points.map((p) => (
                <g
                  key={p.name}
                  style={{ cursor: "pointer" }}
                  onMouseEnter={() => setHover(p.name)}
                  onMouseLeave={() => setHover((h) => (h === p.name ? null : h))}
                  onClick={() => (window.location.href = `/v/${encodeURIComponent(p.name)}`)}
                >
                  {/* invisible larger hit area — the visible dot is too small to hover reliably */}
                  <circle cx={p.x} cy={-p.y} r="0.05" fill="transparent" />
                  <circle
                    cx={p.x}
                    cy={-p.y}
                    r={hover === p.name ? 0.026 : 0.018}
                    fill={KIND_COLOR[kind(p.mime)] || KIND_COLOR.other}
                    fillOpacity={hover && hover !== p.name ? 0.35 : 0.9}
                    stroke={hover === p.name ? "#ffe4b0" : "none"}
                    strokeWidth="0.006"
                    style={{ transition: "r 0.1s, fill-opacity 0.1s" }}
                  />
                  <text
                    x={p.x + 0.028}
                    y={-p.y + 0.012}
                    fontSize="0.032"
                    fill={hover === p.name ? "#ffe4b0" : "#b9a98f"}
                    fillOpacity={hover && hover !== p.name ? 0.4 : 0.85}
                    fontFamily="ui-monospace, monospace"
                    style={{ transition: "fill-opacity 0.1s" }}
                  >
                    {p.name}
                  </text>
                </g>
              ))}
            </svg>

            {hover &&
              (() => {
                const p = points.find((pt) => pt.name === hover);
                if (!p) return null;
                const leftPct = ((p.x + 1.15) / 2.3) * 100;
                const topPct = ((-p.y + 1.15) / 2.3) * 100;
                // Clamp the tooltip's own horizontal anchor near either edge
                // instead of always centering on the point — a centered,
                // fixed-width tooltip on a point near the left/right edge of
                // this overflow-hidden box gets silently clipped otherwise.
                const translateX = leftPct < 20 ? "0%" : leftPct > 80 ? "-100%" : "-50%";
                return (
                  <div
                    className="absolute pointer-events-none note rounded-lg px-3 py-2 text-xs w-56"
                    style={{
                      left: `${leftPct}%`,
                      top: `${topPct}%`,
                      transform: `translate(${translateX}, -130%)`,
                    }}
                  >
                    <div className="font-semibold truncate">{p.name}</div>
                    {p.note && <div className="mt-1 line-clamp-3">{p.note}</div>}
                  </div>
                );
              })()}
          </div>

          <div className="flex flex-wrap items-center gap-4 mt-4 text-xs" style={{ color: "#b9a98f" }}>
            {Object.entries(KIND_COLOR).map(([k, c]) => (
              <span key={k} className="flex items-center gap-1.5">
                <span
                  className="inline-block rounded-full"
                  style={{ width: 8, height: 8, background: c }}
                />
                {k}
              </span>
            ))}
            <span className="flex items-center gap-1.5 ml-2">
              <span className="inline-block" style={{ width: 16, height: 1, background: "#ffcf7a" }} />
              lines connect notes with closely related meaning
            </span>
          </div>
        </>
      )}
    </main>
  );
}
