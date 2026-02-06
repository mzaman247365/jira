import { sql, relations } from "drizzle-orm";
import { pgTable, text, varchar, integer, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export * from "./models/auth";

export const issueTypeEnum = pgEnum("issue_type", ["epic", "story", "task", "bug"]);
export const priorityEnum = pgEnum("priority", ["highest", "high", "medium", "low", "lowest"]);
export const statusEnum = pgEnum("status", ["backlog", "todo", "in_progress", "in_review", "done"]);

export const projects = pgTable("projects", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  key: varchar("key", { length: 10 }).notNull().unique(),
  description: text("description"),
  leadId: varchar("lead_id"),
  avatarColor: varchar("avatar_color").default("#4C9AFF"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const issues = pgTable("issues", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  projectId: varchar("project_id").notNull(),
  issueNumber: integer("issue_number").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  type: issueTypeEnum("type").notNull().default("task"),
  priority: priorityEnum("priority").notNull().default("medium"),
  status: statusEnum("status").notNull().default("todo"),
  assigneeId: varchar("assignee_id"),
  reporterId: varchar("reporter_id"),
  parentId: varchar("parent_id"),
  storyPoints: integer("story_points"),
  sortOrder: integer("sort_order").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const comments = pgTable("comments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  issueId: varchar("issue_id").notNull(),
  authorId: varchar("author_id").notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const projectsRelations = relations(projects, ({ many }) => ({
  issues: many(issues),
}));

export const issuesRelations = relations(issues, ({ one, many }) => ({
  project: one(projects, { fields: [issues.projectId], references: [projects.id] }),
  comments: many(comments),
}));

export const commentsRelations = relations(comments, ({ one }) => ({
  issue: one(issues, { fields: [comments.issueId], references: [issues.id] }),
}));

export const insertProjectSchema = createInsertSchema(projects).omit({ id: true, createdAt: true });
export const insertIssueSchema = createInsertSchema(issues).omit({ id: true, createdAt: true, updatedAt: true });
export const insertCommentSchema = createInsertSchema(comments).omit({ id: true, createdAt: true });

export type InsertProject = z.infer<typeof insertProjectSchema>;
export type Project = typeof projects.$inferSelect;
export type InsertIssue = z.infer<typeof insertIssueSchema>;
export type Issue = typeof issues.$inferSelect;
export type InsertComment = z.infer<typeof insertCommentSchema>;
export type Comment = typeof comments.$inferSelect;
