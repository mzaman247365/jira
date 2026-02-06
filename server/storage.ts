import {
  projects, issues, comments,
  type Project, type InsertProject,
  type Issue, type InsertIssue,
  type Comment, type InsertComment,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, sql, count } from "drizzle-orm";

export interface IStorage {
  getProjects(): Promise<Project[]>;
  getProject(id: string): Promise<Project | undefined>;
  createProject(data: InsertProject): Promise<Project>;
  updateProject(id: string, data: Partial<InsertProject>): Promise<Project | undefined>;
  deleteProject(id: string): Promise<void>;

  getIssuesByProject(projectId: string): Promise<Issue[]>;
  getIssue(id: string): Promise<Issue | undefined>;
  createIssue(data: InsertIssue): Promise<Issue>;
  updateIssue(id: string, data: Partial<InsertIssue>): Promise<Issue | undefined>;
  deleteIssue(id: string): Promise<void>;
  getRecentIssues(limit?: number): Promise<(Issue & { projectKey?: string })[]>;
  getNextIssueNumber(projectId: string): Promise<number>;

  getCommentsByIssue(issueId: string): Promise<Comment[]>;
  createComment(data: InsertComment): Promise<Comment>;

  getAllUsers(): Promise<any[]>;
}

export class DatabaseStorage implements IStorage {
  async getProjects(): Promise<Project[]> {
    return db.select().from(projects).orderBy(desc(projects.createdAt));
  }

  async getProject(id: string): Promise<Project | undefined> {
    const [project] = await db.select().from(projects).where(eq(projects.id, id));
    return project;
  }

  async createProject(data: InsertProject): Promise<Project> {
    const [project] = await db.insert(projects).values(data).returning();
    return project;
  }

  async updateProject(id: string, data: Partial<InsertProject>): Promise<Project | undefined> {
    const [project] = await db.update(projects).set(data).where(eq(projects.id, id)).returning();
    return project;
  }

  async deleteProject(id: string): Promise<void> {
    await db.delete(comments).where(
      sql`${comments.issueId} IN (SELECT id FROM issues WHERE project_id = ${id})`
    );
    await db.delete(issues).where(eq(issues.projectId, id));
    await db.delete(projects).where(eq(projects.id, id));
  }

  async getIssuesByProject(projectId: string): Promise<Issue[]> {
    return db.select().from(issues).where(eq(issues.projectId, projectId)).orderBy(desc(issues.createdAt));
  }

  async getIssue(id: string): Promise<Issue | undefined> {
    const [issue] = await db.select().from(issues).where(eq(issues.id, id));
    return issue;
  }

  async createIssue(data: InsertIssue): Promise<Issue> {
    const [issue] = await db.insert(issues).values(data).returning();
    return issue;
  }

  async updateIssue(id: string, data: Partial<InsertIssue>): Promise<Issue | undefined> {
    const [issue] = await db
      .update(issues)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(issues.id, id))
      .returning();
    return issue;
  }

  async deleteIssue(id: string): Promise<void> {
    await db.delete(comments).where(eq(comments.issueId, id));
    await db.delete(issues).where(eq(issues.id, id));
  }

  async getRecentIssues(limit = 10): Promise<(Issue & { projectKey?: string })[]> {
    const rows = await db
      .select({
        issue: issues,
        projectKey: projects.key,
      })
      .from(issues)
      .leftJoin(projects, eq(issues.projectId, projects.id))
      .orderBy(desc(issues.updatedAt))
      .limit(limit);
    return rows.map((r) => ({ ...r.issue, projectKey: r.projectKey || "" }));
  }

  async getNextIssueNumber(projectId: string): Promise<number> {
    const [result] = await db
      .select({ maxNum: sql<number>`COALESCE(MAX(${issues.issueNumber}), 0)` })
      .from(issues)
      .where(eq(issues.projectId, projectId));
    return (result?.maxNum || 0) + 1;
  }

  async getCommentsByIssue(issueId: string): Promise<Comment[]> {
    return db.select().from(comments).where(eq(comments.issueId, issueId)).orderBy(comments.createdAt);
  }

  async createComment(data: InsertComment): Promise<Comment> {
    const [comment] = await db.insert(comments).values(data).returning();
    return comment;
  }

  async getAllUsers(): Promise<any[]> {
    const { users } = await import("@shared/schema");
    return db.select().from(users);
  }
}

export const storage = new DatabaseStorage();
