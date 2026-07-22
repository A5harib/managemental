import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  files: defineTable({
    storageId: v.id("_storage"),
    name: v.string(),
    mime: v.string(),
    size: v.number(),
    session: v.string(), // group key, e.g. "playwright-run-42"; "" = ungrouped
    agent: v.string(), // who uploaded, e.g. "claude" or ""
    note: v.string(), // optional free text
  })
    .index("by_session", ["session"]),
});
