"use client";
import { use, useEffect, useState } from "react";
import Link from "next/link";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import Logo from "../../Logo";
import { fileUrl, kind, humanSize } from "../../lib";

export default function Viewer({ params }) {
  const { name } = use(params);
  const decodedName = decodeURIComponent(name);
  const f = useQuery(api.files.getByName, { name: decodedName });
  const url = fileUrl(decodedName);

  if (f === undefined)
    return (
      <main className="w-full max-w-4xl mx-auto px-6 py-8">
        <HeaderLink />
        <p style={{ color: "#b9a98f" }}>Loading…</p>
      </main>
    );
  if (f === null)
    return (
      <main className="w-full max-w-4xl mx-auto px-6 py-8">
        <HeaderLink />
        <p style={{ color: "#b9a98f" }}>Not found.</p>
      </main>
    );

  const k = kind(f.mime);
  // HTML gets the full viewport — a thin metadata strip up top, iframe fills the rest.
  if (k === "html") {
    return (
      <div className="w-full h-screen flex flex-col">
        <MetaBar f={f} url={url} compact />
        <iframe src={url} title={f.name} className="flex-1 w-full border-0" style={{ background: "#fff" }} />
      </div>
    );
  }

  return (
    <main className="w-full max-w-4xl mx-auto px-6 py-8">
      <HeaderLink />
      <MetaCard f={f} url={url} />
      <Preview k={k} url={url} name={f.name} />
    </main>
  );
}

function HeaderLink() {
  return (
    <Link href="/" className="flex items-center gap-3 mb-6">
      <Logo size={40} />
      <span className="text-sm" style={{ color: "#b9a98f" }}>← back to the lamp</span>
    </Link>
  );
}

function MetaCard({ f, url }) {
  return (
    <div className="note rounded-lg p-4 mb-4">
      <div className="text-lg font-semibold">{f.name}</div>
      <div className="text-xs mt-1" style={{ color: "#8a7a56" }}>
        {f.mime} · {humanSize(f.size)}
        {f.session ? ` · #${f.session}` : ""}
        {f.agent ? ` · by ${f.agent}` : ""}
      </div>
      {f.note ? <p className="text-sm mt-2 whitespace-pre-wrap">{f.note}</p> : null}
      <div className="flex gap-3 mt-3 text-sm">
        <a href={url} className="underline" style={{ color: "#a06b1a" }} target="_blank" rel="noreferrer">
          open raw
        </a>
        <button
          className="underline"
          style={{ color: "#a06b1a" }}
          onClick={() => navigator.clipboard.writeText(url)}
        >
          copy link
        </button>
      </div>
    </div>
  );
}

function MetaBar({ f, url }) {
  const [copied, setCopied] = useState(false);
  return (
    <div
      className="flex items-center gap-4 px-4 py-2 shrink-0 border-b"
      style={{ background: "#1e1813", borderColor: "#3a2c1a" }}
    >
      <Link href="/" className="flex items-center gap-2 shrink-0">
        <Logo size={26} />
      </Link>
      <span className="text-sm font-medium truncate" style={{ color: "#f2e6d4" }}>
        {f.name}
      </span>
      <span className="text-xs shrink-0" style={{ color: "#8a7a56" }}>
        {humanSize(f.size)}
        {f.session ? ` · #${f.session}` : ""}
      </span>
      <div className="ml-auto flex gap-3 text-xs shrink-0">
        <a href={url} target="_blank" rel="noreferrer" className="underline" style={{ color: "#ffcf7a" }}>
          open raw
        </a>
        <button
          className="underline"
          style={{ color: "#ffcf7a" }}
          onClick={() => {
            navigator.clipboard.writeText(url);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          }}
        >
          {copied ? "copied!" : "copy link"}
        </button>
      </div>
    </div>
  );
}

const BOX = "rounded-lg overflow-hidden border";
const BOX_STYLE = { borderColor: "#3a2c1a", background: "#0d0a07" };

function Preview({ k, url, name }) {
  if (k === "image")
    return (
      <div className={BOX} style={{ ...BOX_STYLE, padding: 8 }}>
        <img src={url} alt={name} style={{ maxWidth: "100%", display: "block", margin: "0 auto" }} />
      </div>
    );
  if (k === "video")
    return <video src={url} controls className={BOX} style={{ ...BOX_STYLE, width: "100%" }} />;
  // json / csv / text / other: fetch and render as styled text, not a bare iframe
  return <TextPreview url={url} />;
}

function TextPreview({ url }) {
  const [text, setText] = useState(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch(url)
      .then((r) => r.text())
      .then((t) => !cancelled && setText(t))
      .catch(() => !cancelled && setError(true));
    return () => {
      cancelled = true;
    };
  }, [url]);

  if (error) return <p style={{ color: "#b9a98f" }}>Couldn't load a preview. Try "open raw".</p>;
  if (text === null) return <p style={{ color: "#b9a98f" }}>Loading preview…</p>;

  return (
    <pre
      className={BOX}
      style={{
        ...BOX_STYLE,
        maxHeight: "70vh",
        overflow: "auto",
        padding: "1rem",
        margin: 0,
        fontSize: "0.8rem",
        lineHeight: 1.5,
        color: "#e8dcc4",
        whiteSpace: "pre-wrap",
        wordBreak: "break-word",
      }}
    >
      {text}
    </pre>
  );
}
