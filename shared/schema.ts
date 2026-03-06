import { sql } from "drizzle-orm";
import { pgTable, text, varchar, serial, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export const tunes = pgTable("tunes", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  alternativeTitles: text("alternative_titles"),
  key: text("key").notNull(),
  tuneType: text("tune_type"),
  region: text("region").notNull(),
  difficulty: text("difficulty"),
  description: text("description"),
  sourceFiddler: text("source_fiddler"),
  era: text("era"),
  youtubeUrl: text("youtube_url"),
  youtubeVideoId: text("youtube_video_id"),
  audioUrl: text("audio_url"),
  abcNotation: text("abc_notation"),
  transcriptUrl: text("transcript_url"),
  locUrl: text("loc_url"),
  locItemId: text("loc_item_id"),
  folkwaysUrl: text("folkways_url"),
  taterJoeUrl: text("tater_joe_url"),
  theSessionId: text("the_session_id"),
  popularity: integer("popularity").default(5),
  tags: text("tags"),
  notes: text("notes"),
  audioSource: text("audio_source"),
  audioAttribution: text("audio_attribution"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertTuneSchema = createInsertSchema(tunes).omit({ id: true, createdAt: true });
export type InsertTune = z.infer<typeof insertTuneSchema>;
export type Tune = typeof tunes.$inferSelect;
