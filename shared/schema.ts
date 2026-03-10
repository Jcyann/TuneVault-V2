import { sql } from "drizzle-orm";
import { pgTable, text, varchar, serial, integer, timestamp, boolean } from "drizzle-orm/pg-core";
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

export const suggestions = pgTable("suggestions", {
  id: serial("id").primaryKey(),
  name: text("name"),
  message: text("message").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertSuggestionSchema = createInsertSchema(suggestions).omit({ id: true, createdAt: true });
export type InsertSuggestion = z.infer<typeof insertSuggestionSchema>;
export type Suggestion = typeof suggestions.$inferSelect;

export const lessonInquiries = pgTable("lesson_inquiries", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  instrument: text("instrument").notNull(),
  experienceLevel: text("experience_level").notNull(),
  yearsPlaying: text("years_playing"),
  currentGoals: text("current_goals"),
  specificTunes: text("specific_tunes"),
  availability: text("availability"),
  timezone: text("timezone"),
  additionalNotes: text("additional_notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertLessonInquirySchema = createInsertSchema(lessonInquiries).omit({ id: true, createdAt: true });
export type InsertLessonInquiry = z.infer<typeof insertLessonInquirySchema>;
export type LessonInquiry = typeof lessonInquiries.$inferSelect;

export const recordings = pgTable("recordings", {
  id: serial("id").primaryKey(),
  tuneId: integer("tune_id").notNull(),
  audioUrl: text("audio_url"),
  locItemId: text("loc_item_id"),
  youtubeVideoId: text("youtube_video_id"),
  audioSource: text("audio_source"),
  audioAttribution: text("audio_attribution"),
  sourceFiddler: text("source_fiddler"),
  collection: text("collection"),
  era: text("era"),
  key: text("key"),
  tuning: text("tuning"),
  notes: text("notes"),
  slipperyHillSlug: text("slippery_hill_slug"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertRecordingSchema = createInsertSchema(recordings).omit({ id: true, createdAt: true });
export type InsertRecording = z.infer<typeof insertRecordingSchema>;
export type Recording = typeof recordings.$inferSelect;

export const recordingSubmissions = pgTable("recording_submissions", {
  id: serial("id").primaryKey(),
  tuneId: integer("tune_id").notNull(),
  submitterName: text("submitter_name").notNull(),
  submitterEmail: text("submitter_email").notNull(),
  instrument: text("instrument").notNull(),
  youtubeUrl: text("youtube_url"),
  audioUrl: text("audio_url"),
  attributionName: text("attribution_name"),
  releaseGranted: boolean("release_granted").notNull().default(false),
  status: text("status").notNull().default("pending"),
  adminNotes: text("admin_notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertRecordingSubmissionSchema = createInsertSchema(recordingSubmissions).omit({
  id: true,
  createdAt: true,
  status: true,
  adminNotes: true,
});
export type InsertRecordingSubmission = z.infer<typeof insertRecordingSubmissionSchema>;
export type RecordingSubmission = typeof recordingSubmissions.$inferSelect;
