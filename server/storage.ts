import {
  projects, issues, comments,
  labels, issueLabels,
  components, issueComponents,
  versions, sprints,
  issueLinks, activityLog,
  watchers, notifications,
  workLogs, attachments,
  savedFilters, favorites,
  projectMembers, sprintSnapshots,
  statusSnapshots, boardConfigs,
  workflows, workflowTransitions,
  dashboardGadgets,
  type Project, type InsertProject,
  type Issue, type InsertIssue,
  type Comment, type InsertComment,
  type Label, type InsertLabel,
  type Component, type InsertComponent,
  type IssueLabel, type IssueComponent,
  type Version, type InsertVersion,
  type Sprint, type InsertSprint,
  type IssueLink, type InsertIssueLink,
  type ActivityLog, type InsertActivityLog,
  type Watcher, type InsertWatcher,
  type Notification, type InsertNotification,
  type WorkLog, type InsertWorkLog,
  type Attachment, type InsertAttachment,
  type SavedFilter, type InsertSavedFilter,
  type Favorite, type InsertFavorite,
  type ProjectMember, type InsertProjectMember,
  type SprintSnapshot, type InsertSprintSnapshot,
  type StatusSnapshot, type InsertStatusSnapshot,
  type BoardConfig, type InsertBoardConfig,
  type Workflow, type InsertWorkflow,
  type WorkflowTransition, type InsertWorkflowTransition,
  type DashboardGadget, type InsertDashboardGadget,
} from "@shared/schema";
import { users, type User } from "@shared/models/auth";
import { db } from "./db";
import { eq, desc, and, ne, sql, count, or, ilike, inArray, isNull } from "drizzle-orm";

export interface IStorage {
  // ── Projects ────────────────────────────────────────────────────────
  getProjects(): Promise<Project[]>;
  getProject(id: string): Promise<Project | undefined>;
  createProject(data: InsertProject): Promise<Project>;
  updateProject(id: string, data: Partial<InsertProject>): Promise<Project | undefined>;
  deleteProject(id: string): Promise<void>;

  // ── Issues ──────────────────────────────────────────────────────────
  getIssuesByProject(projectId: string): Promise<Issue[]>;
  getIssue(id: string): Promise<Issue | undefined>;
  createIssue(data: InsertIssue): Promise<Issue>;
  updateIssue(id: string, data: Partial<InsertIssue>): Promise<Issue | undefined>;
  deleteIssue(id: string): Promise<void>;
  getRecentIssues(limit?: number): Promise<(Issue & { projectKey?: string })[]>;
  getNextIssueNumber(projectId: string): Promise<number>;

  // ── Comments ────────────────────────────────────────────────────────
  getCommentsByIssue(issueId: string): Promise<Comment[]>;
  createComment(data: InsertComment): Promise<Comment>;

  // ── Users ───────────────────────────────────────────────────────────
  getAllUsers(): Promise<any[]>;
  getUserByEmail(email: string): Promise<User | undefined>;
  setUserPassword(userId: string, hashedPassword: string): Promise<void>;
  getUserPassword(userId: string): Promise<string | null>;

  // ── Sub-tasks ─────────────────────────────────────────────────────
  getChildIssues(parentId: string): Promise<Issue[]>;

  // ── Labels ──────────────────────────────────────────────────────────
  getLabelsByProject(projectId: string): Promise<Label[]>;
  getLabel(id: string): Promise<Label | undefined>;
  createLabel(data: InsertLabel): Promise<Label>;
  updateLabel(id: string, data: Partial<InsertLabel>): Promise<Label | undefined>;
  deleteLabel(id: string): Promise<void>;
  getLabelsForIssue(issueId: string): Promise<Label[]>;
  addLabelToIssue(issueId: string, labelId: string): Promise<IssueLabel>;
  removeLabelFromIssue(issueId: string, labelId: string): Promise<void>;

  // ── Components ──────────────────────────────────────────────────────
  getComponentsByProject(projectId: string): Promise<Component[]>;
  getComponent(id: string): Promise<Component | undefined>;
  createComponent(data: InsertComponent): Promise<Component>;
  updateComponent(id: string, data: Partial<InsertComponent>): Promise<Component | undefined>;
  deleteComponent(id: string): Promise<void>;
  getComponentsForIssue(issueId: string): Promise<Component[]>;
  addComponentToIssue(issueId: string, componentId: string): Promise<IssueComponent>;
  removeComponentFromIssue(issueId: string, componentId: string): Promise<void>;

  // ── Versions ────────────────────────────────────────────────────────
  getVersionsByProject(projectId: string): Promise<Version[]>;
  getVersion(id: string): Promise<Version | undefined>;
  createVersion(data: InsertVersion): Promise<Version>;
  updateVersion(id: string, data: Partial<InsertVersion>): Promise<Version | undefined>;
  deleteVersion(id: string): Promise<void>;

  // ── Sprints ─────────────────────────────────────────────────────────
  getSprintsByProject(projectId: string): Promise<Sprint[]>;
  getSprint(id: string): Promise<Sprint | undefined>;
  createSprint(data: InsertSprint): Promise<Sprint>;
  updateSprint(id: string, data: Partial<InsertSprint>): Promise<Sprint | undefined>;
  deleteSprint(id: string): Promise<void>;
  getActiveSprintForProject(projectId: string): Promise<Sprint | undefined>;
  getIssuesBySprint(sprintId: string): Promise<Issue[]>;
  moveIncompleteIssuesToBacklog(sprintId: string): Promise<void>;

  // ── Issue Links ─────────────────────────────────────────────────────
  getLinksForIssue(issueId: string): Promise<IssueLink[]>;
  createIssueLink(data: InsertIssueLink): Promise<IssueLink>;
  deleteIssueLink(id: string): Promise<void>;

  // ── Activity Log ────────────────────────────────────────────────────
  getActivityForIssue(issueId: string): Promise<ActivityLog[]>;
  getActivityForProject(projectId: string): Promise<ActivityLog[]>;
  createActivityLog(data: InsertActivityLog): Promise<ActivityLog>;

  // ── Watchers ────────────────────────────────────────────────────────
  getWatchersForIssue(issueId: string): Promise<Watcher[]>;
  addWatcher(data: InsertWatcher): Promise<Watcher>;
  removeWatcher(issueId: string, userId: string): Promise<void>;
  isWatching(issueId: string, userId: string): Promise<boolean>;
  getWatchedIssues(userId: string): Promise<Issue[]>;

  // ── Notifications ───────────────────────────────────────────────────
  getNotificationsForUser(userId: string): Promise<Notification[]>;
  getUnreadNotificationCount(userId: string): Promise<number>;
  createNotification(data: InsertNotification): Promise<Notification>;
  markNotificationRead(id: string): Promise<void>;
  markAllNotificationsRead(userId: string): Promise<void>;

  // ── Work Logs ───────────────────────────────────────────────────────
  getWorkLogsForIssue(issueId: string): Promise<WorkLog[]>;
  createWorkLog(data: InsertWorkLog): Promise<WorkLog>;
  deleteWorkLog(id: string): Promise<void>;

  // ── Attachments ─────────────────────────────────────────────────────
  getAttachmentsForIssue(issueId: string): Promise<Attachment[]>;
  getAttachment(id: string): Promise<Attachment | undefined>;
  createAttachment(data: InsertAttachment): Promise<Attachment>;
  deleteAttachment(id: string): Promise<void>;

  // ── Saved Filters ───────────────────────────────────────────────────
  getSavedFilters(userId: string, projectId?: string): Promise<SavedFilter[]>;
  createSavedFilter(data: InsertSavedFilter): Promise<SavedFilter>;
  deleteSavedFilter(id: string): Promise<void>;

  // ── Favorites ───────────────────────────────────────────────────────
  getFavorites(userId: string): Promise<Favorite[]>;
  addFavorite(data: InsertFavorite): Promise<Favorite>;
  removeFavorite(id: string): Promise<void>;
  isFavorite(userId: string, projectId?: string, issueId?: string): Promise<boolean>;

  // ── Project Members ─────────────────────────────────────────────────
  getProjectMembers(projectId: string): Promise<ProjectMember[]>;
  addProjectMember(data: InsertProjectMember): Promise<ProjectMember>;
  updateProjectMemberRole(id: string, role: string): Promise<ProjectMember | undefined>;
  removeProjectMember(id: string): Promise<void>;

  // ── Sprint Snapshots ────────────────────────────────────────────────
  getSprintSnapshots(sprintId: string): Promise<SprintSnapshot[]>;
  createSprintSnapshot(data: InsertSprintSnapshot): Promise<SprintSnapshot>;

  // ── Status Snapshots ────────────────────────────────────────────────
  getStatusSnapshots(projectId: string, startDate: Date, endDate: Date): Promise<StatusSnapshot[]>;
  createStatusSnapshot(data: InsertStatusSnapshot): Promise<StatusSnapshot>;

  // ── Board Config ────────────────────────────────────────────────────
  getBoardConfig(projectId: string): Promise<BoardConfig | undefined>;
  upsertBoardConfig(projectId: string, data: Partial<InsertBoardConfig>): Promise<BoardConfig>;

  // ── Workflows ───────────────────────────────────────────────────────
  getWorkflow(projectId: string): Promise<Workflow | undefined>;
  upsertWorkflow(projectId: string, data: Partial<InsertWorkflow>): Promise<Workflow>;
  getWorkflowTransitions(workflowId: string): Promise<WorkflowTransition[]>;
  setWorkflowTransitions(workflowId: string, transitions: InsertWorkflowTransition[]): Promise<void>;

  // ── Dashboard Gadgets ───────────────────────────────────────────────
  getDashboardGadgets(userId: string): Promise<DashboardGadget[]>;
  createDashboardGadget(data: InsertDashboardGadget): Promise<DashboardGadget>;
  updateDashboardGadget(id: string, data: Partial<InsertDashboardGadget>): Promise<DashboardGadget | undefined>;
  deleteDashboardGadget(id: string): Promise<void>;

  // ── Search ──────────────────────────────────────────────────────────
  searchIssues(params: {
    projectId?: string;
    type?: string;
    status?: string;
    priority?: string;
    assigneeId?: string;
    labelId?: string;
    sprintId?: string;
    text?: string;
    sortBy?: string;
    page?: number;
    limit?: number;
  }): Promise<{ issues: Issue[]; total: number }>;

  // ── Bulk ────────────────────────────────────────────────────────────
  bulkUpdateIssues(issueIds: string[], data: Partial<InsertIssue>): Promise<Issue[]>;
}

export class DatabaseStorage implements IStorage {
  // ────────────────────────────────────────────────────────────────────
  // Projects
  // ────────────────────────────────────────────────────────────────────
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
    // Get all issue IDs for this project
    const projectIssues = await db.select({ id: issues.id }).from(issues).where(eq(issues.projectId, id));
    const issueIds = projectIssues.map((i) => i.id);

    if (issueIds.length > 0) {
      // Delete issue-related junction and child data
      await db.delete(issueLabels).where(inArray(issueLabels.issueId, issueIds));
      await db.delete(issueComponents).where(inArray(issueComponents.issueId, issueIds));
      await db.delete(issueLinks).where(
        or(
          inArray(issueLinks.sourceIssueId, issueIds),
          inArray(issueLinks.targetIssueId, issueIds),
        ),
      );
      await db.delete(activityLog).where(inArray(activityLog.issueId, issueIds));
      await db.delete(watchers).where(inArray(watchers.issueId, issueIds));
      await db.delete(workLogs).where(inArray(workLogs.issueId, issueIds));
      await db.delete(attachments).where(inArray(attachments.issueId, issueIds));
      await db.delete(notifications).where(inArray(notifications.issueId, issueIds));
      await db.delete(comments).where(inArray(comments.issueId, issueIds));
    }

    // Delete project-level entities
    await db.delete(labels).where(eq(labels.projectId, id));
    await db.delete(components).where(eq(components.projectId, id));

    // Delete sprint snapshots for project sprints
    const projectSprints = await db.select({ id: sprints.id }).from(sprints).where(eq(sprints.projectId, id));
    const sprintIds = projectSprints.map((s) => s.id);
    if (sprintIds.length > 0) {
      await db.delete(sprintSnapshots).where(inArray(sprintSnapshots.sprintId, sprintIds));
    }

    await db.delete(sprints).where(eq(sprints.projectId, id));
    await db.delete(versions).where(eq(versions.projectId, id));
    await db.delete(statusSnapshots).where(eq(statusSnapshots.projectId, id));
    await db.delete(boardConfigs).where(eq(boardConfigs.projectId, id));
    await db.delete(projectMembers).where(eq(projectMembers.projectId, id));
    await db.delete(savedFilters).where(eq(savedFilters.projectId, id));

    // Delete workflow transitions for project workflow
    const projectWorkflow = await db.select({ id: workflows.id }).from(workflows).where(eq(workflows.projectId, id));
    if (projectWorkflow.length > 0) {
      await db.delete(workflowTransitions).where(eq(workflowTransitions.workflowId, projectWorkflow[0].id));
    }
    await db.delete(workflows).where(eq(workflows.projectId, id));

    // Delete issues and project itself
    await db.delete(issues).where(eq(issues.projectId, id));
    await db.delete(projects).where(eq(projects.id, id));
  }

  // ────────────────────────────────────────────────────────────────────
  // Issues
  // ────────────────────────────────────────────────────────────────────
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
    await db.delete(issueLabels).where(eq(issueLabels.issueId, id));
    await db.delete(issueComponents).where(eq(issueComponents.issueId, id));
    await db.delete(issueLinks).where(
      or(
        eq(issueLinks.sourceIssueId, id),
        eq(issueLinks.targetIssueId, id),
      ),
    );
    await db.delete(activityLog).where(eq(activityLog.issueId, id));
    await db.delete(watchers).where(eq(watchers.issueId, id));
    await db.delete(workLogs).where(eq(workLogs.issueId, id));
    await db.delete(attachments).where(eq(attachments.issueId, id));
    await db.delete(notifications).where(eq(notifications.issueId, id));
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

  // ────────────────────────────────────────────────────────────────────
  // Comments
  // ────────────────────────────────────────────────────────────────────
  async getCommentsByIssue(issueId: string): Promise<Comment[]> {
    return db.select().from(comments).where(eq(comments.issueId, issueId)).orderBy(comments.createdAt);
  }

  async createComment(data: InsertComment): Promise<Comment> {
    const [comment] = await db.insert(comments).values(data).returning();
    return comment;
  }

  // ────────────────────────────────────────────────────────────────────
  // Users
  // ────────────────────────────────────────────────────────────────────
  async getAllUsers(): Promise<any[]> {
    return db.select().from(users);
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async setUserPassword(userId: string, hashedPassword: string): Promise<void> {
    await db.update(users).set({ passwordHash: hashedPassword }).where(eq(users.id, userId));
  }

  async getUserPassword(userId: string): Promise<string | null> {
    const [user] = await db.select({ passwordHash: users.passwordHash }).from(users).where(eq(users.id, userId));
    return user?.passwordHash ?? null;
  }

  // ────────────────────────────────────────────────────────────────────
  // Sub-tasks
  // ────────────────────────────────────────────────────────────────────
  async getChildIssues(parentId: string): Promise<Issue[]> {
    return db.select().from(issues).where(eq(issues.parentId, parentId)).orderBy(issues.sortOrder);
  }

  // ────────────────────────────────────────────────────────────────────
  // Labels
  // ────────────────────────────────────────────────────────────────────
  async getLabelsByProject(projectId: string): Promise<Label[]> {
    return db.select().from(labels).where(eq(labels.projectId, projectId));
  }

  async getLabel(id: string): Promise<Label | undefined> {
    const [label] = await db.select().from(labels).where(eq(labels.id, id));
    return label;
  }

  async createLabel(data: InsertLabel): Promise<Label> {
    const [label] = await db.insert(labels).values(data).returning();
    return label;
  }

  async updateLabel(id: string, data: Partial<InsertLabel>): Promise<Label | undefined> {
    const [label] = await db.update(labels).set(data).where(eq(labels.id, id)).returning();
    return label;
  }

  async deleteLabel(id: string): Promise<void> {
    await db.delete(issueLabels).where(eq(issueLabels.labelId, id));
    await db.delete(labels).where(eq(labels.id, id));
  }

  async getLabelsForIssue(issueId: string): Promise<Label[]> {
    const rows = await db
      .select({ label: labels })
      .from(issueLabels)
      .innerJoin(labels, eq(issueLabels.labelId, labels.id))
      .where(eq(issueLabels.issueId, issueId));
    return rows.map((r) => r.label);
  }

  async addLabelToIssue(issueId: string, labelId: string): Promise<IssueLabel> {
    const [il] = await db.insert(issueLabels).values({ issueId, labelId }).returning();
    return il;
  }

  async removeLabelFromIssue(issueId: string, labelId: string): Promise<void> {
    await db
      .delete(issueLabels)
      .where(and(eq(issueLabels.issueId, issueId), eq(issueLabels.labelId, labelId)));
  }

  // ────────────────────────────────────────────────────────────────────
  // Components
  // ────────────────────────────────────────────────────────────────────
  async getComponentsByProject(projectId: string): Promise<Component[]> {
    return db.select().from(components).where(eq(components.projectId, projectId));
  }

  async getComponent(id: string): Promise<Component | undefined> {
    const [component] = await db.select().from(components).where(eq(components.id, id));
    return component;
  }

  async createComponent(data: InsertComponent): Promise<Component> {
    const [component] = await db.insert(components).values(data).returning();
    return component;
  }

  async updateComponent(id: string, data: Partial<InsertComponent>): Promise<Component | undefined> {
    const [component] = await db.update(components).set(data).where(eq(components.id, id)).returning();
    return component;
  }

  async deleteComponent(id: string): Promise<void> {
    await db.delete(issueComponents).where(eq(issueComponents.componentId, id));
    await db.delete(components).where(eq(components.id, id));
  }

  async getComponentsForIssue(issueId: string): Promise<Component[]> {
    const rows = await db
      .select({ component: components })
      .from(issueComponents)
      .innerJoin(components, eq(issueComponents.componentId, components.id))
      .where(eq(issueComponents.issueId, issueId));
    return rows.map((r) => r.component);
  }

  async addComponentToIssue(issueId: string, componentId: string): Promise<IssueComponent> {
    const [ic] = await db.insert(issueComponents).values({ issueId, componentId }).returning();
    return ic;
  }

  async removeComponentFromIssue(issueId: string, componentId: string): Promise<void> {
    await db
      .delete(issueComponents)
      .where(and(eq(issueComponents.issueId, issueId), eq(issueComponents.componentId, componentId)));
  }

  // ────────────────────────────────────────────────────────────────────
  // Versions
  // ────────────────────────────────────────────────────────────────────
  async getVersionsByProject(projectId: string): Promise<Version[]> {
    return db.select().from(versions).where(eq(versions.projectId, projectId)).orderBy(desc(versions.createdAt));
  }

  async getVersion(id: string): Promise<Version | undefined> {
    const [version] = await db.select().from(versions).where(eq(versions.id, id));
    return version;
  }

  async createVersion(data: InsertVersion): Promise<Version> {
    const [version] = await db.insert(versions).values(data).returning();
    return version;
  }

  async updateVersion(id: string, data: Partial<InsertVersion>): Promise<Version | undefined> {
    const [version] = await db.update(versions).set(data).where(eq(versions.id, id)).returning();
    return version;
  }

  async deleteVersion(id: string): Promise<void> {
    await db.delete(versions).where(eq(versions.id, id));
  }

  // ────────────────────────────────────────────────────────────────────
  // Sprints
  // ────────────────────────────────────────────────────────────────────
  async getSprintsByProject(projectId: string): Promise<Sprint[]> {
    return db.select().from(sprints).where(eq(sprints.projectId, projectId)).orderBy(desc(sprints.createdAt));
  }

  async getSprint(id: string): Promise<Sprint | undefined> {
    const [sprint] = await db.select().from(sprints).where(eq(sprints.id, id));
    return sprint;
  }

  async createSprint(data: InsertSprint): Promise<Sprint> {
    const [sprint] = await db.insert(sprints).values(data).returning();
    return sprint;
  }

  async updateSprint(id: string, data: Partial<InsertSprint>): Promise<Sprint | undefined> {
    const [sprint] = await db.update(sprints).set(data).where(eq(sprints.id, id)).returning();
    return sprint;
  }

  async deleteSprint(id: string): Promise<void> {
    await db.delete(sprintSnapshots).where(eq(sprintSnapshots.sprintId, id));
    await db.delete(sprints).where(eq(sprints.id, id));
  }

  async getActiveSprintForProject(projectId: string): Promise<Sprint | undefined> {
    const [sprint] = await db
      .select()
      .from(sprints)
      .where(and(eq(sprints.projectId, projectId), eq(sprints.status, "active")));
    return sprint;
  }

  async getIssuesBySprint(sprintId: string): Promise<Issue[]> {
    return db.select().from(issues).where(eq(issues.sprintId, sprintId)).orderBy(issues.sortOrder);
  }

  async moveIncompleteIssuesToBacklog(sprintId: string): Promise<void> {
    await db
      .update(issues)
      .set({ sprintId: null, updatedAt: new Date() })
      .where(and(eq(issues.sprintId, sprintId), ne(issues.status, "done")));
  }

  // ────────────────────────────────────────────────────────────────────
  // Issue Links
  // ────────────────────────────────────────────────────────────────────
  async getLinksForIssue(issueId: string): Promise<IssueLink[]> {
    return db
      .select()
      .from(issueLinks)
      .where(or(eq(issueLinks.sourceIssueId, issueId), eq(issueLinks.targetIssueId, issueId)));
  }

  async createIssueLink(data: InsertIssueLink): Promise<IssueLink> {
    const [link] = await db.insert(issueLinks).values(data).returning();
    return link;
  }

  async deleteIssueLink(id: string): Promise<void> {
    await db.delete(issueLinks).where(eq(issueLinks.id, id));
  }

  // ────────────────────────────────────────────────────────────────────
  // Activity Log
  // ────────────────────────────────────────────────────────────────────
  async getActivityForIssue(issueId: string): Promise<ActivityLog[]> {
    return db
      .select()
      .from(activityLog)
      .where(eq(activityLog.issueId, issueId))
      .orderBy(desc(activityLog.createdAt));
  }

  async getActivityForProject(projectId: string): Promise<ActivityLog[]> {
    return db
      .select({ activity: activityLog })
      .from(activityLog)
      .innerJoin(issues, eq(activityLog.issueId, issues.id))
      .where(eq(issues.projectId, projectId))
      .orderBy(desc(activityLog.createdAt))
      .then((rows) => rows.map((r) => r.activity));
  }

  async createActivityLog(data: InsertActivityLog): Promise<ActivityLog> {
    const [entry] = await db.insert(activityLog).values(data).returning();
    return entry;
  }

  // ────────────────────────────────────────────────────────────────────
  // Watchers
  // ────────────────────────────────────────────────────────────────────
  async getWatchersForIssue(issueId: string): Promise<Watcher[]> {
    return db.select().from(watchers).where(eq(watchers.issueId, issueId));
  }

  async addWatcher(data: InsertWatcher): Promise<Watcher> {
    const [watcher] = await db.insert(watchers).values(data).returning();
    return watcher;
  }

  async removeWatcher(issueId: string, userId: string): Promise<void> {
    await db
      .delete(watchers)
      .where(and(eq(watchers.issueId, issueId), eq(watchers.userId, userId)));
  }

  async isWatching(issueId: string, userId: string): Promise<boolean> {
    const [result] = await db
      .select({ cnt: count() })
      .from(watchers)
      .where(and(eq(watchers.issueId, issueId), eq(watchers.userId, userId)));
    return (result?.cnt ?? 0) > 0;
  }

  async getWatchedIssues(userId: string): Promise<Issue[]> {
    const rows = await db
      .select({ issue: issues })
      .from(watchers)
      .innerJoin(issues, eq(watchers.issueId, issues.id))
      .where(eq(watchers.userId, userId))
      .orderBy(desc(issues.updatedAt));
    return rows.map((r) => r.issue);
  }

  // ────────────────────────────────────────────────────────────────────
  // Notifications
  // ────────────────────────────────────────────────────────────────────
  async getNotificationsForUser(userId: string): Promise<Notification[]> {
    return db
      .select()
      .from(notifications)
      .where(eq(notifications.userId, userId))
      .orderBy(desc(notifications.createdAt));
  }

  async getUnreadNotificationCount(userId: string): Promise<number> {
    const [result] = await db
      .select({ cnt: count() })
      .from(notifications)
      .where(and(eq(notifications.userId, userId), eq(notifications.isRead, false)));
    return result?.cnt ?? 0;
  }

  async createNotification(data: InsertNotification): Promise<Notification> {
    const [notification] = await db.insert(notifications).values(data).returning();
    return notification;
  }

  async markNotificationRead(id: string): Promise<void> {
    await db.update(notifications).set({ isRead: true }).where(eq(notifications.id, id));
  }

  async markAllNotificationsRead(userId: string): Promise<void> {
    await db
      .update(notifications)
      .set({ isRead: true })
      .where(and(eq(notifications.userId, userId), eq(notifications.isRead, false)));
  }

  // ────────────────────────────────────────────────────────────────────
  // Work Logs
  // ────────────────────────────────────────────────────────────────────
  async getWorkLogsForIssue(issueId: string): Promise<WorkLog[]> {
    return db
      .select()
      .from(workLogs)
      .where(eq(workLogs.issueId, issueId))
      .orderBy(desc(workLogs.startedAt));
  }

  async createWorkLog(data: InsertWorkLog): Promise<WorkLog> {
    const [workLog] = await db.insert(workLogs).values(data).returning();
    return workLog;
  }

  async deleteWorkLog(id: string): Promise<void> {
    await db.delete(workLogs).where(eq(workLogs.id, id));
  }

  // ────────────────────────────────────────────────────────────────────
  // Attachments
  // ────────────────────────────────────────────────────────────────────
  async getAttachmentsForIssue(issueId: string): Promise<Attachment[]> {
    return db
      .select()
      .from(attachments)
      .where(eq(attachments.issueId, issueId))
      .orderBy(desc(attachments.createdAt));
  }

  async getAttachment(id: string): Promise<Attachment | undefined> {
    const [attachment] = await db.select().from(attachments).where(eq(attachments.id, id));
    return attachment;
  }

  async createAttachment(data: InsertAttachment): Promise<Attachment> {
    const [attachment] = await db.insert(attachments).values(data).returning();
    return attachment;
  }

  async deleteAttachment(id: string): Promise<void> {
    await db.delete(attachments).where(eq(attachments.id, id));
  }

  // ────────────────────────────────────────────────────────────────────
  // Saved Filters
  // ────────────────────────────────────────────────────────────────────
  async getSavedFilters(userId: string, projectId?: string): Promise<SavedFilter[]> {
    if (projectId) {
      return db
        .select()
        .from(savedFilters)
        .where(and(eq(savedFilters.userId, userId), eq(savedFilters.projectId, projectId)))
        .orderBy(desc(savedFilters.createdAt));
    }
    return db
      .select()
      .from(savedFilters)
      .where(eq(savedFilters.userId, userId))
      .orderBy(desc(savedFilters.createdAt));
  }

  async createSavedFilter(data: InsertSavedFilter): Promise<SavedFilter> {
    const [filter] = await db.insert(savedFilters).values(data).returning();
    return filter;
  }

  async deleteSavedFilter(id: string): Promise<void> {
    await db.delete(savedFilters).where(eq(savedFilters.id, id));
  }

  // ────────────────────────────────────────────────────────────────────
  // Favorites
  // ────────────────────────────────────────────────────────────────────
  async getFavorites(userId: string): Promise<Favorite[]> {
    return db
      .select()
      .from(favorites)
      .where(eq(favorites.userId, userId))
      .orderBy(desc(favorites.createdAt));
  }

  async addFavorite(data: InsertFavorite): Promise<Favorite> {
    const [fav] = await db.insert(favorites).values(data).returning();
    return fav;
  }

  async removeFavorite(id: string): Promise<void> {
    await db.delete(favorites).where(eq(favorites.id, id));
  }

  async isFavorite(userId: string, projectId?: string, issueId?: string): Promise<boolean> {
    const conditions = [eq(favorites.userId, userId)];
    if (projectId) conditions.push(eq(favorites.projectId, projectId));
    if (issueId) conditions.push(eq(favorites.issueId, issueId));

    const [result] = await db
      .select({ cnt: count() })
      .from(favorites)
      .where(and(...conditions));
    return (result?.cnt ?? 0) > 0;
  }

  // ────────────────────────────────────────────────────────────────────
  // Project Members
  // ────────────────────────────────────────────────────────────────────
  async getProjectMembers(projectId: string): Promise<ProjectMember[]> {
    return db.select().from(projectMembers).where(eq(projectMembers.projectId, projectId));
  }

  async addProjectMember(data: InsertProjectMember): Promise<ProjectMember> {
    const [member] = await db.insert(projectMembers).values(data).returning();
    return member;
  }

  async updateProjectMemberRole(id: string, role: string): Promise<ProjectMember | undefined> {
    const [member] = await db
      .update(projectMembers)
      .set({ role: role as any })
      .where(eq(projectMembers.id, id))
      .returning();
    return member;
  }

  async removeProjectMember(id: string): Promise<void> {
    await db.delete(projectMembers).where(eq(projectMembers.id, id));
  }

  // ────────────────────────────────────────────────────────────────────
  // Sprint Snapshots
  // ────────────────────────────────────────────────────────────────────
  async getSprintSnapshots(sprintId: string): Promise<SprintSnapshot[]> {
    return db
      .select()
      .from(sprintSnapshots)
      .where(eq(sprintSnapshots.sprintId, sprintId))
      .orderBy(sprintSnapshots.date);
  }

  async createSprintSnapshot(data: InsertSprintSnapshot): Promise<SprintSnapshot> {
    const [snapshot] = await db.insert(sprintSnapshots).values(data).returning();
    return snapshot;
  }

  // ────────────────────────────────────────────────────────────────────
  // Status Snapshots
  // ────────────────────────────────────────────────────────────────────
  async getStatusSnapshots(projectId: string, startDate: Date, endDate: Date): Promise<StatusSnapshot[]> {
    return db
      .select()
      .from(statusSnapshots)
      .where(
        and(
          eq(statusSnapshots.projectId, projectId),
          sql`${statusSnapshots.date} >= ${startDate}`,
          sql`${statusSnapshots.date} <= ${endDate}`,
        ),
      )
      .orderBy(statusSnapshots.date);
  }

  async createStatusSnapshot(data: InsertStatusSnapshot): Promise<StatusSnapshot> {
    const [snapshot] = await db.insert(statusSnapshots).values(data).returning();
    return snapshot;
  }

  // ────────────────────────────────────────────────────────────────────
  // Board Config
  // ────────────────────────────────────────────────────────────────────
  async getBoardConfig(projectId: string): Promise<BoardConfig | undefined> {
    const [config] = await db
      .select()
      .from(boardConfigs)
      .where(eq(boardConfigs.projectId, projectId));
    return config;
  }

  async upsertBoardConfig(projectId: string, data: Partial<InsertBoardConfig>): Promise<BoardConfig> {
    const existing = await this.getBoardConfig(projectId);
    if (existing) {
      const [updated] = await db
        .update(boardConfigs)
        .set(data)
        .where(eq(boardConfigs.projectId, projectId))
        .returning();
      return updated;
    }
    const [created] = await db
      .insert(boardConfigs)
      .values({ ...data, projectId })
      .returning();
    return created;
  }

  // ────────────────────────────────────────────────────────────────────
  // Workflows
  // ────────────────────────────────────────────────────────────────────
  async getWorkflow(projectId: string): Promise<Workflow | undefined> {
    const [workflow] = await db
      .select()
      .from(workflows)
      .where(eq(workflows.projectId, projectId));
    return workflow;
  }

  async upsertWorkflow(projectId: string, data: Partial<InsertWorkflow>): Promise<Workflow> {
    const existing = await this.getWorkflow(projectId);
    if (existing) {
      const [updated] = await db
        .update(workflows)
        .set(data)
        .where(eq(workflows.projectId, projectId))
        .returning();
      return updated;
    }
    const [created] = await db
      .insert(workflows)
      .values({ ...data, projectId })
      .returning();
    return created;
  }

  async getWorkflowTransitions(workflowId: string): Promise<WorkflowTransition[]> {
    return db
      .select()
      .from(workflowTransitions)
      .where(eq(workflowTransitions.workflowId, workflowId));
  }

  async setWorkflowTransitions(workflowId: string, transitions: InsertWorkflowTransition[]): Promise<void> {
    await db.delete(workflowTransitions).where(eq(workflowTransitions.workflowId, workflowId));
    if (transitions.length > 0) {
      await db.insert(workflowTransitions).values(
        transitions.map((t) => ({ ...t, workflowId })),
      );
    }
  }

  // ────────────────────────────────────────────────────────────────────
  // Dashboard Gadgets
  // ────────────────────────────────────────────────────────────────────
  async getDashboardGadgets(userId: string): Promise<DashboardGadget[]> {
    return db
      .select()
      .from(dashboardGadgets)
      .where(eq(dashboardGadgets.userId, userId))
      .orderBy(dashboardGadgets.position);
  }

  async createDashboardGadget(data: InsertDashboardGadget): Promise<DashboardGadget> {
    const [gadget] = await db.insert(dashboardGadgets).values(data).returning();
    return gadget;
  }

  async updateDashboardGadget(id: string, data: Partial<InsertDashboardGadget>): Promise<DashboardGadget | undefined> {
    const [gadget] = await db
      .update(dashboardGadgets)
      .set(data)
      .where(eq(dashboardGadgets.id, id))
      .returning();
    return gadget;
  }

  async deleteDashboardGadget(id: string): Promise<void> {
    await db.delete(dashboardGadgets).where(eq(dashboardGadgets.id, id));
  }

  // ────────────────────────────────────────────────────────────────────
  // Search
  // ────────────────────────────────────────────────────────────────────
  async searchIssues(params: {
    projectId?: string;
    type?: string;
    status?: string;
    priority?: string;
    assigneeId?: string;
    labelId?: string;
    sprintId?: string;
    text?: string;
    sortBy?: string;
    page?: number;
    limit?: number;
  }): Promise<{ issues: Issue[]; total: number }> {
    const conditions: ReturnType<typeof eq>[] = [];

    if (params.projectId) conditions.push(eq(issues.projectId, params.projectId));
    if (params.type) conditions.push(eq(issues.type, params.type as any));
    if (params.status) conditions.push(eq(issues.status, params.status as any));
    if (params.priority) conditions.push(eq(issues.priority, params.priority as any));
    if (params.assigneeId) conditions.push(eq(issues.assigneeId, params.assigneeId));
    if (params.sprintId) conditions.push(eq(issues.sprintId, params.sprintId));

    if (params.text) {
      conditions.push(
        or(
          ilike(issues.title, `%${params.text}%`),
          ilike(issues.description, `%${params.text}%`),
        )!,
      );
    }

    // If filtering by label, we need a subquery
    if (params.labelId) {
      conditions.push(
        sql`${issues.id} IN (SELECT issue_id FROM issue_labels WHERE label_id = ${params.labelId})`,
      );
    }

    const where = conditions.length > 0 ? and(...conditions) : undefined;

    // Count total
    const [totalResult] = await db
      .select({ cnt: count() })
      .from(issues)
      .where(where);
    const total = totalResult?.cnt ?? 0;

    // Determine sort
    let orderBy;
    switch (params.sortBy) {
      case "priority":
        orderBy = issues.priority;
        break;
      case "status":
        orderBy = issues.status;
        break;
      case "created":
        orderBy = desc(issues.createdAt);
        break;
      case "issueNumber":
        orderBy = desc(issues.issueNumber);
        break;
      default:
        orderBy = desc(issues.updatedAt);
    }

    const page = params.page ?? 1;
    const limit = params.limit ?? 50;
    const offset = (page - 1) * limit;

    const result = await db
      .select()
      .from(issues)
      .where(where)
      .orderBy(orderBy)
      .limit(limit)
      .offset(offset);

    return { issues: result, total };
  }

  // ────────────────────────────────────────────────────────────────────
  // Bulk
  // ────────────────────────────────────────────────────────────────────
  async bulkUpdateIssues(issueIds: string[], data: Partial<InsertIssue>): Promise<Issue[]> {
    if (issueIds.length === 0) return [];
    const result = await db
      .update(issues)
      .set({ ...data, updatedAt: new Date() })
      .where(inArray(issues.id, issueIds))
      .returning();
    return result;
  }
}

export const storage = new DatabaseStorage();
