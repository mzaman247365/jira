import { sql, relations } from "drizzle-orm";
import { pgTable, text, varchar, integer, timestamp, pgEnum, boolean, jsonb, uniqueIndex, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export * from "./models/auth";

// ── Enums ──────────────────────────────────────────────────────────────
export const issueTypeEnum = pgEnum("issue_type", ["epic", "story", "task", "bug", "sub_task"]);
export const priorityEnum = pgEnum("priority", ["highest", "high", "medium", "low", "lowest"]);
export const statusEnum = pgEnum("status", ["backlog", "todo", "in_progress", "in_review", "done"]);
export const linkTypeEnum = pgEnum("link_type", [
  "blocks", "is_blocked_by", "duplicates", "is_duplicated_by",
  "clones", "is_cloned_by", "relates_to",
]);
export const versionStatusEnum = pgEnum("version_status", ["unreleased", "released", "archived"]);
export const sprintStatusEnum = pgEnum("sprint_status", ["planning", "active", "completed"]);
export const projectRoleEnum = pgEnum("project_role", ["admin", "project_admin", "member", "viewer"]);

// ── Projects ───────────────────────────────────────────────────────────
export const projects = pgTable("projects", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  key: varchar("key", { length: 10 }).notNull().unique(),
  description: text("description"),
  leadId: varchar("lead_id"),
  avatarColor: varchar("avatar_color").default("#4C9AFF"),
  createdAt: timestamp("created_at").defaultNow(),
});

// ── Labels ─────────────────────────────────────────────────────────────
export const labels = pgTable("labels", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  projectId: varchar("project_id").notNull(),
  name: text("name").notNull(),
  color: varchar("color").default("#6B778C"),
});

export const issueLabels = pgTable("issue_labels", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  issueId: varchar("issue_id").notNull(),
  labelId: varchar("label_id").notNull(),
}, (table) => [uniqueIndex("issue_label_unique").on(table.issueId, table.labelId)]);

// ── Components ─────────────────────────────────────────────────────────
export const components = pgTable("components", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  projectId: varchar("project_id").notNull(),
  name: text("name").notNull(),
  description: text("description"),
  leadId: varchar("lead_id"),
});

export const issueComponents = pgTable("issue_components", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  issueId: varchar("issue_id").notNull(),
  componentId: varchar("component_id").notNull(),
}, (table) => [uniqueIndex("issue_component_unique").on(table.issueId, table.componentId)]);

// ── Versions ───────────────────────────────────────────────────────────
export const versions = pgTable("versions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  projectId: varchar("project_id").notNull(),
  name: text("name").notNull(),
  description: text("description"),
  status: versionStatusEnum("status").notNull().default("unreleased"),
  startDate: timestamp("start_date"),
  releaseDate: timestamp("release_date"),
  createdAt: timestamp("created_at").defaultNow(),
});

// ── Sprints ────────────────────────────────────────────────────────────
export const sprints = pgTable("sprints", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  projectId: varchar("project_id").notNull(),
  name: text("name").notNull(),
  goal: text("goal"),
  status: sprintStatusEnum("status").notNull().default("planning"),
  startDate: timestamp("start_date"),
  endDate: timestamp("end_date"),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

// ── Issues ─────────────────────────────────────────────────────────────
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
  // Sprint & Version references
  sprintId: varchar("sprint_id"),
  fixVersionId: varchar("fix_version_id"),
  affectsVersionId: varchar("affects_version_id"),
  // Time tracking
  originalEstimate: integer("original_estimate"), // minutes
  timeSpent: integer("time_spent"), // minutes
  timeRemaining: integer("time_remaining"), // minutes
  // Dates
  startDate: timestamp("start_date"),
  dueDate: timestamp("due_date"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// ── Issue Links ────────────────────────────────────────────────────────
export const issueLinks = pgTable("issue_links", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sourceIssueId: varchar("source_issue_id").notNull(),
  targetIssueId: varchar("target_issue_id").notNull(),
  linkType: linkTypeEnum("link_type").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// ── Comments ───────────────────────────────────────────────────────────
export const comments = pgTable("comments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  issueId: varchar("issue_id").notNull(),
  authorId: varchar("author_id").notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// ── Activity Log ───────────────────────────────────────────────────────
export const activityLog = pgTable("activity_log", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  issueId: varchar("issue_id").notNull(),
  userId: varchar("user_id").notNull(),
  action: text("action").notNull(), // "created", "updated", "commented"
  field: text("field"), // which field changed
  oldValue: text("old_value"),
  newValue: text("new_value"),
  createdAt: timestamp("created_at").defaultNow(),
});

// ── Watchers ───────────────────────────────────────────────────────────
export const watchers = pgTable("watchers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  issueId: varchar("issue_id").notNull(),
  userId: varchar("user_id").notNull(),
}, (table) => [uniqueIndex("watcher_unique").on(table.issueId, table.userId)]);

// ── Notifications ──────────────────────────────────────────────────────
export const notifications = pgTable("notifications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  issueId: varchar("issue_id"),
  type: text("type").notNull(), // "assigned", "mentioned", "status_changed", "commented"
  title: text("title").notNull(),
  message: text("message"),
  isRead: boolean("is_read").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

// ── Work Logs ──────────────────────────────────────────────────────────
export const workLogs = pgTable("work_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  issueId: varchar("issue_id").notNull(),
  userId: varchar("user_id").notNull(),
  timeSpent: integer("time_spent").notNull(), // minutes
  description: text("description"),
  startedAt: timestamp("started_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
});

// ── Attachments ────────────────────────────────────────────────────────
export const attachments = pgTable("attachments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  issueId: varchar("issue_id").notNull(),
  userId: varchar("user_id").notNull(),
  filename: text("filename").notNull(),
  mimeType: text("mime_type"),
  size: integer("size"),
  data: text("data").notNull(), // base64
  createdAt: timestamp("created_at").defaultNow(),
});

// ── Saved Filters ──────────────────────────────────────────────────────
export const savedFilters = pgTable("saved_filters", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  projectId: varchar("project_id"),
  name: text("name").notNull(),
  filterJson: jsonb("filter_json").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// ── Favorites ──────────────────────────────────────────────────────────
export const favorites = pgTable("favorites", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  projectId: varchar("project_id"),
  issueId: varchar("issue_id"),
  createdAt: timestamp("created_at").defaultNow(),
});

// ── Project Members ────────────────────────────────────────────────────
export const projectMembers = pgTable("project_members", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  projectId: varchar("project_id").notNull(),
  userId: varchar("user_id").notNull(),
  role: projectRoleEnum("role").notNull().default("member"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [uniqueIndex("project_member_unique").on(table.projectId, table.userId)]);

// ── Sprint Snapshots (for burndown) ────────────────────────────────────
export const sprintSnapshots = pgTable("sprint_snapshots", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sprintId: varchar("sprint_id").notNull(),
  date: timestamp("date").notNull(),
  totalPoints: integer("total_points").default(0),
  remainingPoints: integer("remaining_points").default(0),
  completedPoints: integer("completed_points").default(0),
  issueCount: integer("issue_count").default(0),
  completedIssueCount: integer("completed_issue_count").default(0),
});

// ── Status Snapshots (for CFD) ─────────────────────────────────────────
export const statusSnapshots = pgTable("status_snapshots", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  projectId: varchar("project_id").notNull(),
  date: timestamp("date").notNull(),
  statusCounts: jsonb("status_counts").notNull(), // { backlog: 5, todo: 3, ... }
});

// ── Board Configs ──────────────────────────────────────────────────────
export const boardConfigs = pgTable("board_configs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  projectId: varchar("project_id").notNull().unique(),
  swimlaneBy: varchar("swimlane_by").default("none"), // "none", "assignee", "priority", "type"
  wipLimits: jsonb("wip_limits"), // { todo: 5, in_progress: 3 }
  quickFilters: jsonb("quick_filters"), // [{ name: "My Issues", field: "assignee", value: "me" }]
  columnOrder: jsonb("column_order"), // ["todo", "in_progress", "in_review", "done"]
});

// ── Workflows ──────────────────────────────────────────────────────────
export const workflows = pgTable("workflows", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  projectId: varchar("project_id").notNull().unique(),
  name: text("name").notNull().default("Default Workflow"),
  statuses: jsonb("statuses"), // custom status list
});

export const workflowTransitions = pgTable("workflow_transitions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  workflowId: varchar("workflow_id").notNull(),
  fromStatus: varchar("from_status").notNull(),
  toStatus: varchar("to_status").notNull(),
  name: text("name"),
});

// ── Dashboard Gadgets ──────────────────────────────────────────────────
export const dashboardGadgets = pgTable("dashboard_gadgets", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  type: text("type").notNull(), // "assigned-to-me", "activity-stream", "sprint-burndown", "status-distribution"
  position: integer("position").default(0),
  config: jsonb("config"), // gadget-specific config
});

// ── Relations ──────────────────────────────────────────────────────────
export const projectsRelations = relations(projects, ({ many }) => ({
  issues: many(issues),
  labels: many(labels),
  components: many(components),
  versions: many(versions),
  sprints: many(sprints),
  members: many(projectMembers),
}));

export const issuesRelations = relations(issues, ({ one, many }) => ({
  project: one(projects, { fields: [issues.projectId], references: [projects.id] }),
  sprint: one(sprints, { fields: [issues.sprintId], references: [sprints.id] }),
  fixVersion: one(versions, { fields: [issues.fixVersionId], references: [versions.id] }),
  comments: many(comments),
  activityLogs: many(activityLog),
  watchers: many(watchers),
  workLogs: many(workLogs),
  attachments: many(attachments),
  issueLabels: many(issueLabels),
  issueComponents: many(issueComponents),
}));

export const commentsRelations = relations(comments, ({ one }) => ({
  issue: one(issues, { fields: [comments.issueId], references: [issues.id] }),
}));

export const labelsRelations = relations(labels, ({ one, many }) => ({
  project: one(projects, { fields: [labels.projectId], references: [projects.id] }),
  issueLabels: many(issueLabels),
}));

export const issueLabelsRelations = relations(issueLabels, ({ one }) => ({
  issue: one(issues, { fields: [issueLabels.issueId], references: [issues.id] }),
  label: one(labels, { fields: [issueLabels.labelId], references: [labels.id] }),
}));

export const componentsRelations = relations(components, ({ one, many }) => ({
  project: one(projects, { fields: [components.projectId], references: [projects.id] }),
  issueComponents: many(issueComponents),
}));

export const issueComponentsRelations = relations(issueComponents, ({ one }) => ({
  issue: one(issues, { fields: [issueComponents.issueId], references: [issues.id] }),
  component: one(components, { fields: [issueComponents.componentId], references: [components.id] }),
}));

export const sprintsRelations = relations(sprints, ({ one, many }) => ({
  project: one(projects, { fields: [sprints.projectId], references: [projects.id] }),
  issues: many(issues),
  snapshots: many(sprintSnapshots),
}));

export const versionsRelations = relations(versions, ({ one }) => ({
  project: one(projects, { fields: [versions.projectId], references: [projects.id] }),
}));

export const activityLogRelations = relations(activityLog, ({ one }) => ({
  issue: one(issues, { fields: [activityLog.issueId], references: [issues.id] }),
}));

export const watchersRelations = relations(watchers, ({ one }) => ({
  issue: one(issues, { fields: [watchers.issueId], references: [issues.id] }),
}));

export const workLogsRelations = relations(workLogs, ({ one }) => ({
  issue: one(issues, { fields: [workLogs.issueId], references: [issues.id] }),
}));

export const attachmentsRelations = relations(attachments, ({ one }) => ({
  issue: one(issues, { fields: [attachments.issueId], references: [issues.id] }),
}));

export const projectMembersRelations = relations(projectMembers, ({ one }) => ({
  project: one(projects, { fields: [projectMembers.projectId], references: [projects.id] }),
}));

export const sprintSnapshotsRelations = relations(sprintSnapshots, ({ one }) => ({
  sprint: one(sprints, { fields: [sprintSnapshots.sprintId], references: [sprints.id] }),
}));

export const workflowTransitionsRelations = relations(workflowTransitions, ({ one }) => ({
  workflow: one(workflows, { fields: [workflowTransitions.workflowId], references: [workflows.id] }),
}));

// ── Insert Schemas ─────────────────────────────────────────────────────
export const insertProjectSchema = createInsertSchema(projects).omit({ id: true, createdAt: true });
export const insertIssueSchema = createInsertSchema(issues).omit({ id: true, createdAt: true, updatedAt: true });
export const insertCommentSchema = createInsertSchema(comments).omit({ id: true, createdAt: true });
export const insertLabelSchema = createInsertSchema(labels).omit({ id: true });
export const insertComponentSchema = createInsertSchema(components).omit({ id: true });
export const insertVersionSchema = createInsertSchema(versions).omit({ id: true, createdAt: true });
export const insertSprintSchema = createInsertSchema(sprints).omit({ id: true, createdAt: true });
export const insertIssueLinkSchema = createInsertSchema(issueLinks).omit({ id: true, createdAt: true });
export const insertActivityLogSchema = createInsertSchema(activityLog).omit({ id: true, createdAt: true });
export const insertWatcherSchema = createInsertSchema(watchers).omit({ id: true });
export const insertNotificationSchema = createInsertSchema(notifications).omit({ id: true, createdAt: true, isRead: true });
export const insertWorkLogSchema = createInsertSchema(workLogs).omit({ id: true, createdAt: true });
export const insertAttachmentSchema = createInsertSchema(attachments).omit({ id: true, createdAt: true });
export const insertSavedFilterSchema = createInsertSchema(savedFilters).omit({ id: true, createdAt: true });
export const insertFavoriteSchema = createInsertSchema(favorites).omit({ id: true, createdAt: true });
export const insertProjectMemberSchema = createInsertSchema(projectMembers).omit({ id: true, createdAt: true });
export const insertBoardConfigSchema = createInsertSchema(boardConfigs).omit({ id: true });
export const insertWorkflowSchema = createInsertSchema(workflows).omit({ id: true });
export const insertWorkflowTransitionSchema = createInsertSchema(workflowTransitions).omit({ id: true });
export const insertDashboardGadgetSchema = createInsertSchema(dashboardGadgets).omit({ id: true });
export const insertSprintSnapshotSchema = createInsertSchema(sprintSnapshots).omit({ id: true });
export const insertStatusSnapshotSchema = createInsertSchema(statusSnapshots).omit({ id: true });

// ── Types ──────────────────────────────────────────────────────────────
export type InsertProject = z.infer<typeof insertProjectSchema>;
export type Project = typeof projects.$inferSelect;
export type InsertIssue = z.infer<typeof insertIssueSchema>;
export type Issue = typeof issues.$inferSelect;
export type InsertComment = z.infer<typeof insertCommentSchema>;
export type Comment = typeof comments.$inferSelect;
export type InsertLabel = z.infer<typeof insertLabelSchema>;
export type Label = typeof labels.$inferSelect;
export type InsertComponent = z.infer<typeof insertComponentSchema>;
export type Component = typeof components.$inferSelect;
export type IssueLabel = typeof issueLabels.$inferSelect;
export type IssueComponent = typeof issueComponents.$inferSelect;
export type InsertVersion = z.infer<typeof insertVersionSchema>;
export type Version = typeof versions.$inferSelect;
export type InsertSprint = z.infer<typeof insertSprintSchema>;
export type Sprint = typeof sprints.$inferSelect;
export type InsertIssueLink = z.infer<typeof insertIssueLinkSchema>;
export type IssueLink = typeof issueLinks.$inferSelect;
export type InsertActivityLog = z.infer<typeof insertActivityLogSchema>;
export type ActivityLog = typeof activityLog.$inferSelect;
export type InsertWatcher = z.infer<typeof insertWatcherSchema>;
export type Watcher = typeof watchers.$inferSelect;
export type InsertNotification = z.infer<typeof insertNotificationSchema>;
export type Notification = typeof notifications.$inferSelect;
export type InsertWorkLog = z.infer<typeof insertWorkLogSchema>;
export type WorkLog = typeof workLogs.$inferSelect;
export type InsertAttachment = z.infer<typeof insertAttachmentSchema>;
export type Attachment = typeof attachments.$inferSelect;
export type InsertSavedFilter = z.infer<typeof insertSavedFilterSchema>;
export type SavedFilter = typeof savedFilters.$inferSelect;
export type InsertFavorite = z.infer<typeof insertFavoriteSchema>;
export type Favorite = typeof favorites.$inferSelect;
export type InsertProjectMember = z.infer<typeof insertProjectMemberSchema>;
export type ProjectMember = typeof projectMembers.$inferSelect;
export type InsertBoardConfig = z.infer<typeof insertBoardConfigSchema>;
export type BoardConfig = typeof boardConfigs.$inferSelect;
export type InsertWorkflow = z.infer<typeof insertWorkflowSchema>;
export type Workflow = typeof workflows.$inferSelect;
export type InsertWorkflowTransition = z.infer<typeof insertWorkflowTransitionSchema>;
export type WorkflowTransition = typeof workflowTransitions.$inferSelect;
export type InsertDashboardGadget = z.infer<typeof insertDashboardGadgetSchema>;
export type DashboardGadget = typeof dashboardGadgets.$inferSelect;
export type InsertSprintSnapshot = z.infer<typeof insertSprintSnapshotSchema>;
export type SprintSnapshot = typeof sprintSnapshots.$inferSelect;
export type InsertStatusSnapshot = z.infer<typeof insertStatusSnapshotSchema>;
export type StatusSnapshot = typeof statusSnapshots.$inferSelect;
