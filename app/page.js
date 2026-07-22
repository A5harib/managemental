"use client";
import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAuth, useClerk, UserButton } from "@clerk/nextjs";
import Logo from "./Logo";
import { fileUrl, kind, humanSize, ago } from "./lib";

export default function Home() {
  const { isSignedIn } = useAuth();
  const { openSignIn } = useClerk();
  const [session, setSession] = useState(null); // null = all
  const files = useQuery(api.files.list, session ? { session } : {});
  const sessions = useQuery(api.files.sessions, {});
  const [drag, setDrag] = useState(false);

  async function upload(fileList) {
    for (const file of fileList) {
      const form = new FormData();
      form.append("file", file);
      if (session) form.append("session", session);
      form.append("agent", "you");
      await fetch(`/api/upload`, { method: "POST", body: form });
    }
  }

  return (
    <main className="w-full max-w-6xl mx-auto px-6 py-10">
      <header className="flex items-center gap-4 mb-2">
        <Logo size={88} />
        <div className="flex-1">
          <h1 className="text-2xl font-semibold tracking-tight glow" style={{ color: "#ffe4b0" }}>
            Managemental
          </h1>
          <p className="text-sm" style={{ color: "#b9a98f" }}>
            Everything your agents drop, under one lamp.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <a
            href="/map"
            className="px-4 py-2 rounded-full text-sm font-medium transition-colors"
            style={{ border: "1px solid rgba(255,207,122,0.3)", color: "#ffcf7a" }}
          >
            Vector map
          </a>
          {isSignedIn ? (
            <>
              <span className="text-xs" style={{ color: "#a8935e" }}>
                signed in · uploads sync to Jarvis
              </span>
              <UserButton />
            </>
          ) : (
            <button
              onClick={() => openSignIn()}
              className="px-4 py-2 rounded-full text-sm font-medium transition-colors"
              style={{ background: "#ffcf7a", color: "#2a2016" }}
            >
              Sign in to Jarvis
            </button>
          )}
        </div>
      </header>

      {/* session filter */}
      <div className="flex flex-wrap gap-2 my-6">
        <Chip active={!session} onClick={() => setSession(null)}>
          All
        </Chip>
        {sessions?.map((s) => (
          <Chip key={s.session} active={session === s.session} onClick={() => setSession(s.session)}>
            {s.session} · {s.count}
          </Chip>
        ))}
      </div>

      {/* dropzone */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDrag(true);
        }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDrag(false);
          upload(e.dataTransfer.files);
        }}
        className="rounded-xl border-2 border-dashed p-6 text-center text-sm mb-8 transition-colors"
        style={{
          borderColor: drag ? "#ffb347" : "#3a2c1a",
          background: drag ? "rgba(255,179,71,0.08)" : "transparent",
          color: "#b9a98f",
        }}
      >
        Drop files here to upload{session ? ` into “${session}”` : ""}, or{" "}
        <label className="underline cursor-pointer" style={{ color: "#ffcf7a" }}>
          browse
          <input type="file" multiple hidden onChange={(e) => upload(e.target.files)} />
        </label>
        .
      </div>

      {/* grid */}
      {files === undefined ? (
        <p style={{ color: "#b9a98f" }}>Lighting the lamp…</p>
      ) : files.length === 0 ? (
        <p style={{ color: "#b9a98f" }}>Nothing here yet. Point an agent at the upload endpoint.</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-5">
          {files.map((f) => (
            <Card key={f.name} f={f} />
          ))}
        </div>
      )}
    </main>
  );
}

function Chip({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className="px-3 py-1 rounded-full text-sm transition-colors"
      style={{
        background: active ? "#ffcf7a" : "rgba(255,255,255,0.05)",
        color: active ? "#2a2016" : "#d8c8ac",
        border: "1px solid rgba(255,207,122,0.25)",
      }}
    >
      {children}
    </button>
  );
}

function Card({ f }) {
  const k = kind(f.mime);
  const url = fileUrl(f.name);
  return (
    <a href={`/v/${encodeURIComponent(f.name)}`} className="note rounded-lg overflow-hidden flex flex-col">
      <div className="h-32 flex items-center justify-center overflow-hidden" style={{ background: "#fffbe0" }}>
        {k === "image" ? (
          <img src={url} alt={f.name} className="w-full h-full object-cover" />
        ) : (
          <span className="text-3xl">
            {k === "video" ? "🎬" : k === "html" ? "🌐" : k === "other" ? "📦" : "📄"}
          </span>
        )}
      </div>
      <div className="p-3">
        <div className="text-sm font-medium truncate">{f.name}</div>
        <div className="text-xs mt-1 flex justify-between" style={{ color: "#8a7a56" }}>
          <span>{humanSize(f.size)}</span>
          <span>{ago(f._creationTime)}</span>
        </div>
        {f.session ? (
          <div className="text-[11px] mt-1" style={{ color: "#a8935e" }}>#{f.session}</div>
        ) : null}
      </div>
    </a>
  );
}
