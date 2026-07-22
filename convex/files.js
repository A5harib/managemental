import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const record = mutation({
  args: {
    storageId: v.id("_storage"),
    name: v.string(),
    mime: v.string(),
    size: v.number(),
    session: v.string(),
    agent: v.string(),
    note: v.string(),
  },
  handler: (ctx, args) => ctx.db.insert("files", args),
});

export const get = query({
  args: { id: v.id("files") },
  handler: async (ctx, { id }) => {
    const row = await ctx.db.get(id);
    if (!row) return null;
    return { ...row, url: await ctx.storage.getUrl(row.storageId) };
  },
});

// Agent edit: swap a file's bytes in place, same id/url. Old blob is
// deleted so re-saving a file repeatedly doesn't leak storage.
export const replaceContent = mutation({
  args: {
    id: v.id("files"),
    storageId: v.id("_storage"),
    mime: v.string(),
    size: v.number(),
  },
  handler: async (ctx, args) => {
    const row = await ctx.db.get(args.id);
    if (!row) throw new Error("file not found");
    await ctx.db.patch(args.id, {
      storageId: args.storageId,
      mime: args.mime,
      size: args.size,
    });
    await ctx.storage.delete(row.storageId);
    return { success: true };
  },
});

// Text search across file names/notes and, for text-like mime types, file
// contents. ponytail: scans every matching row's blob — fine at Managemental's
// scale, swap for a search index if the table gets huge.
export const grep = query({
  args: { q: v.string(), session: v.optional(v.string()), limit: v.optional(v.number()) },
  handler: async (ctx, { q, session, limit }) => {
    const rows = session
      ? await ctx.db
          .query("files")
          .withIndex("by_session", (i) => i.eq("session", session))
          .order("desc")
          .collect()
      : await ctx.db.query("files").order("desc").collect();

    const needle = q.toLowerCase();
    const isTextLike = (mime) =>
      mime.startsWith("text/") || mime.includes("json") || mime === "text/csv";

    const out = [];
    for (const r of rows) {
      if (out.length >= (limit ?? 50)) break;

      const nameHit = r.name.toLowerCase().includes(needle);
      const noteHit = r.note.toLowerCase().includes(needle);
      let contentMatch = null;

      if (!nameHit && !noteHit && isTextLike(r.mime)) {
        const url = await ctx.storage.getUrl(r.storageId);
        if (url) {
          const text = await (await fetch(url)).text();
          const idx = text.toLowerCase().indexOf(needle);
          if (idx !== -1) {
            contentMatch = text.slice(Math.max(0, idx - 40), idx + needle.length + 40);
          }
        }
      }

      if (nameHit || noteHit || contentMatch !== null) {
        out.push({
          id: r._id,
          name: r.name,
          mime: r.mime,
          session: r.session,
          note: r.note,
          matchedIn: nameHit ? "name" : noteHit ? "note" : "content",
          snippet: contentMatch,
          url: await ctx.storage.getUrl(r.storageId),
        });
      }
    }
    return out;
  },
});

// Dashboard feed: newest first, with resolved URLs. ponytail: full scan, add
// pagination when the table outgrows one screen of interest.
export const list = query({
  args: { session: v.optional(v.string()) },
  handler: async (ctx, { session }) => {
    const rows = session
      ? await ctx.db
          .query("files")
          .withIndex("by_session", (q) => q.eq("session", session))
          .order("desc")
          .collect()
      : await ctx.db.query("files").order("desc").collect();
    return Promise.all(
      rows.map(async (r) => ({ ...r, url: await ctx.storage.getUrl(r.storageId) }))
    );
  },
});

// Distinct sessions for the dashboard sidebar/filter.
export const sessions = query({
  args: {},
  handler: async (ctx) => {
    const rows = await ctx.db.query("files").order("desc").collect();
    const seen = new Map();
    for (const r of rows) {
      if (!r.session) continue;
      const s = seen.get(r.session) || { session: r.session, count: 0, last: r._creationTime };
      s.count++;
      seen.set(r.session, s);
    }
    return [...seen.values()];
  },
});
