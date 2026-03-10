import {
  type User,
  type InsertUser,
  type RecordingSubmission,
  type InsertRecordingSubmission,
  type InsertRecording,
  recordings,
  recordingSubmissions,
} from "@shared/schema";
import { db } from "./db";
import { eq } from "drizzle-orm";
import { randomUUID } from "crypto";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  createRecordingSubmission(data: InsertRecordingSubmission): Promise<RecordingSubmission>;
  getRecordingSubmissions(status?: string): Promise<RecordingSubmission[]>;
  updateRecordingSubmissionStatus(id: number, status: string, adminNotes?: string): Promise<RecordingSubmission>;
  createRecording(data: InsertRecording): Promise<typeof recordings.$inferSelect>;
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
}

export const storage = new DatabaseStorage();
