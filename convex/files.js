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
