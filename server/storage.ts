import {
  type User,
  type InsertUser,
  type RecordingSubmission,
  type InsertRecordingSubmission,
  type InsertRecording,
  type KeyReview,
  type InsertKeyReview,
  recordings,
  recordingSubmissions,
  keyReviews,
  tunes,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, sql, and } from "drizzle-orm";
import { randomUUID } from "crypto";

export interface DataHealthCounts {
  total: number;
  placeholderKeys: number;
  missingDescriptions: number;
  missingAudio: number;
  pendingKeyReviews: number;
}

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  createRecordingSubmission(data: InsertRecordingSubmission): Promise<RecordingSubmission>;
  getRecordingSubmissions(status?: string): Promise<RecordingSubmission[]>;
  updateRecordingSubmissionStatus(id: number, status: string, adminNotes?: string): Promise<RecordingSubmission>;
  createRecording(data: InsertRecording): Promise<typeof recordings.$inferSelect>;
  createKeyReview(data: InsertKeyReview): Promise<KeyReview>;
  deleteKeyReviewsByStatus(status: string): Promise<void>;
  getKeyReviews(status?: string): Promise<(KeyReview & { tuneTitle: string })[]>;
  getKeyReview(id: number): Promise<KeyReview | undefined>;
  applyKeyReview(id: number, key: string): Promise<KeyReview>;
  setKeyReviewStatus(id: number, status: string): Promise<KeyReview>;
  bulkApplyHighConfidence(threshold: number): Promise<{ applied: number }>;
  getDataHealth(placeholderKey: string): Promise<DataHealthCounts>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;

  constructor() {
    this.users = new Map();
  }

  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  async createRecordingSubmission(_data: InsertRecordingSubmission): Promise<RecordingSubmission> {
    throw new Error("Not implemented in MemStorage");
  }

  async getRecordingSubmissions(_status?: string): Promise<RecordingSubmission[]> {
    return [];
  }

  async updateRecordingSubmissionStatus(_id: number, _status: string, _adminNotes?: string): Promise<RecordingSubmission> {
    throw new Error("Not implemented in MemStorage");
  }

  async createRecording(_data: InsertRecording): Promise<typeof recordings.$inferSelect> {
    throw new Error("Not implemented in MemStorage");
  }

  async createKeyReview(_data: InsertKeyReview): Promise<KeyReview> {
    throw new Error("Not implemented in MemStorage");
  }
  async deleteKeyReviewsByStatus(_status: string): Promise<void> {
    throw new Error("Not implemented in MemStorage");
  }
  async getKeyReviews(_status?: string): Promise<(KeyReview & { tuneTitle: string })[]> {
    return [];
  }
  async getKeyReview(_id: number): Promise<KeyReview | undefined> {
    return undefined;
  }
  async applyKeyReview(_id: number, _key: string): Promise<KeyReview> {
    throw new Error("Not implemented in MemStorage");
  }
  async setKeyReviewStatus(_id: number, _status: string): Promise<KeyReview> {
    throw new Error("Not implemented in MemStorage");
  }
  async bulkApplyHighConfidence(_threshold: number): Promise<{ applied: number }> {
    return { applied: 0 };
  }
  async getDataHealth(_placeholderKey: string): Promise<DataHealthCounts> {
    return { total: 0, placeholderKeys: 0, missingDescriptions: 0, missingAudio: 0, pendingKeyReviews: 0 };
  }
}

export class DatabaseStorage implements IStorage {
  private users: Map<string, User>;

  constructor() {
    this.users = new Map();
  }

  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  async createRecordingSubmission(data: InsertRecordingSubmission): Promise<RecordingSubmission> {
    const [row] = await db.insert(recordingSubmissions).values(data).returning();
    return row;
  }

  async getRecordingSubmissions(status?: string): Promise<RecordingSubmission[]> {
    if (status) {
      return db.select().from(recordingSubmissions).where(eq(recordingSubmissions.status, status)).orderBy(recordingSubmissions.createdAt);
    }
    return db.select().from(recordingSubmissions).orderBy(recordingSubmissions.createdAt);
  }

  async updateRecordingSubmissionStatus(id: number, status: string, adminNotes?: string): Promise<RecordingSubmission> {
    const updateData: Partial<RecordingSubmission> = { status };
    if (adminNotes !== undefined) updateData.adminNotes = adminNotes;
    const [row] = await db
      .update(recordingSubmissions)
      .set(updateData)
      .where(eq(recordingSubmissions.id, id))
      .returning();
    return row;
  }

  async createRecording(data: InsertRecording): Promise<typeof recordings.$inferSelect> {
    const [row] = await db.insert(recordings).values(data).returning();
    return row;
  }

  async createKeyReview(data: InsertKeyReview): Promise<KeyReview> {
    const [row] = await db.insert(keyReviews).values(data).returning();
    return row;
  }

  async deleteKeyReviewsByStatus(status: string): Promise<void> {
    await db.delete(keyReviews).where(eq(keyReviews.status, status));
  }

  async getKeyReviews(status?: string): Promise<(KeyReview & { tuneTitle: string })[]> {
    const rows = await db
      .select({ review: keyReviews, tuneTitle: tunes.title })
      .from(keyReviews)
      .leftJoin(tunes, eq(keyReviews.tuneId, tunes.id))
      .where(status ? eq(keyReviews.status, status) : undefined as any)
      .orderBy(desc(keyReviews.confidence));
    return rows.map((r) => ({ ...r.review, tuneTitle: r.tuneTitle ?? `Tune #${r.review.tuneId}` }));
  }

  async getKeyReview(id: number): Promise<KeyReview | undefined> {
    const [row] = await db.select().from(keyReviews).where(eq(keyReviews.id, id)).limit(1);
    return row;
  }

  async applyKeyReview(id: number, key: string): Promise<KeyReview> {
    const review = await this.getKeyReview(id);
    if (!review) throw new Error("Key review not found");
    await db.update(tunes).set({ key }).where(eq(tunes.id, review.tuneId));
    const [updated] = await db
      .update(keyReviews)
      .set({ status: "applied", reviewedKey: key })
      .where(eq(keyReviews.id, id))
      .returning();
    return updated;
  }

  async setKeyReviewStatus(id: number, status: string): Promise<KeyReview> {
    const [updated] = await db
      .update(keyReviews)
      .set({ status })
      .where(eq(keyReviews.id, id))
      .returning();
    return updated;
  }

  async bulkApplyHighConfidence(threshold: number): Promise<{ applied: number }> {
    const pending = await db
      .select()
      .from(keyReviews)
      .where(and(eq(keyReviews.status, "pending"), sql`confidence >= ${threshold}`));
    let applied = 0;
    for (const r of pending) {
      const key = r.reviewedKey ?? r.detectedKey;
      if (!key) continue;
      await db.update(tunes).set({ key }).where(eq(tunes.id, r.tuneId));
      await db.update(keyReviews).set({ status: "applied", reviewedKey: key }).where(eq(keyReviews.id, r.id));
      applied++;
    }
    return { applied };
  }

  async getDataHealth(placeholderKey: string): Promise<DataHealthCounts> {
    const [counts] = await db
      .select({
        total: sql<number>`count(*)`,
        placeholderKeys: sql<number>`count(*) filter (where key = ${placeholderKey})`,
        missingDescriptions: sql<number>`count(*) filter (where description is null or description = '')`,
        missingAudio: sql<number>`count(*) filter (where audio_url is null and loc_item_id is null)`,
      })
      .from(tunes);
    const [pending] = await db
      .select({ c: sql<number>`count(*)` })
      .from(keyReviews)
      .where(eq(keyReviews.status, "pending"));
    return {
      total: Number(counts?.total ?? 0),
      placeholderKeys: Number(counts?.placeholderKeys ?? 0),
      missingDescriptions: Number(counts?.missingDescriptions ?? 0),
      missingAudio: Number(counts?.missingAudio ?? 0),
      pendingKeyReviews: Number(pending?.c ?? 0),
    };
  }
}

export const storage = new DatabaseStorage();
