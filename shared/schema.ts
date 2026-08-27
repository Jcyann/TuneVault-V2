import { sql } from "drizzle-orm";
import { pgTable, text, varchar, serial, integer, timestamp, boolean, real } from "drizzle-orm/pg-core";
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
  isEmbeddable: boolean("is_embeddable"),
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
  email: text("email"),
  message: text("message").notNull(),
  tuneId: integer("tune_id"),
  tuneTitle: text("tune_title"),
  correctionType: text("correction_type").default("general"),
  suggestedValue: text("suggested_value"),
  status: text("status").default("pending"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertSuggestionSchema = createInsertSchema(suggestions).omit({ id: true, createdAt: true, status: true });
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

export const keyReviews = pgTable("key_reviews", {
  id: serial("id").primaryKey(),
  tuneId: integer("tune_id").notNull(),
  currentKey: text("current_key"),
  detectedKey: text("detected_key"),
  detectedTonic: text("detected_tonic"),
  detectedScale: text("detected_scale"),
  confidence: real("confidence"),
  audioUrl: text("audio_url"),
  reviewedKey: text("reviewed_key"),
  status: text("status").notNull().default("pending"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertKeyReviewSchema = createInsertSchema(keyReviews).omit({ id: true, createdAt: true });
export type InsertKeyReview = z.infer<typeof insertKeyReviewSchema>;
export type KeyReview = typeof keyReviews.$inferSelect;

export const audioIngestionRuns = pgTable("audio_ingestion_runs", {
  id: serial("id").primaryKey(),
  source: text("source").notNull(),
  adapterVersion: text("adapter_version").notNull(),
  status: text("status").notNull().default("running"),
  cursorId: integer("cursor_id").notNull().default(0),
  requestedLimit: integer("requested_limit"),
  processedCount: integer("processed_count").notNull().default(0),
  addedCount: integer("added_count").notNull().default(0),
  candidateCount: integer("candidate_count").notNull().default(0),
  failureCount: integer("failure_count").notNull().default(0),
  pauseReason: text("pause_reason"),
  startedAt: timestamp("started_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  finishedAt: timestamp("finished_at"),
});

export type AudioIngestionRun = typeof audioIngestionRuns.$inferSelect;

export const audioIngestionAttempts = pgTable("audio_ingestion_attempts", {
  id: serial("id").primaryKey(),
  source: text("source").notNull(),
  adapterVersion: text("adapter_version").notNull(),
  tuneId: integer("tune_id").notNull(),
  status: text("status").notNull(),
  attempts: integer("attempts").notNull().default(1),
  candidateUrl: text("candidate_url"),
  candidateSource: text("candidate_source"),
  candidateAttribution: text("candidate_attribution"),
  details: text("details"),
  failureReason: text("failure_reason"),
  nextRetryAt: timestamp("next_retry_at"),
  firstAttemptAt: timestamp("first_attempt_at").defaultNow().notNull(),
  lastAttemptAt: timestamp("last_attempt_at").defaultNow().notNull(),
});

export type AudioIngestionAttempt = typeof audioIngestionAttempts.$inferSelect;

export const blogPosts = pgTable("blog_posts", {
  id: serial("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  title: text("title").notNull(),
  excerpt: text("excerpt"),
  content: text("content").notNull().default(""),
  coverImageUrl: text("cover_image_url"),
  author: text("author").notNull().default("Jason Chinchen"),
  published: boolean("published").notNull().default(false),
  publishedAt: timestamp("published_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertBlogPostSchema = createInsertSchema(blogPosts).omit({ id: true, createdAt: true });
export type InsertBlogPost = z.infer<typeof insertBlogPostSchema>;
export type BlogPost = typeof blogPosts.$inferSelect;
