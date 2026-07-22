import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  files: defineTable({
    storageId: v.id("_storage"),
    name: v.string(), // also the URL slug (/v/:name) — unique across the table
    mime: v.string(),
    size: v.number(),
    session: v.string(), // group key, e.g. "playwright-run-42"; "" = ungrouped
    agent: v.string(), // who uploaded, e.g. "claude" or ""
    note: v.string(), // optional free text — also the text embedded for the vector map
    embedding: v.optional(v.array(v.float64())), // 384-dim, from note text; absent if note was empty or HF failed
  })
    .index("by_session", ["session"])
    .index("by_name", ["name"]),
});
