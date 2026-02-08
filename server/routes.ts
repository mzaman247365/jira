import type { Express } from "express";
import { createServer, type Server } from "http";
import crypto from "crypto";
import { storage } from "./storage";
import { setupAuth, registerAuthRoutes, isAuthenticated } from "./replit_integrations/auth";
import { authStorage } from "./replit_integrations/auth";
import {
  insertProjectSchema,
  insertIssueSchema,
  insertCommentSchema,
  insertLabelSchema,
  insertComponentSchema,
  insertVersionSchema,
  insertSprintSchema,
  insertIssueLinkSchema,
  insertWorkLogSchema,
  insertAttachmentSchema,
  insertSavedFilterSchema,
  insertFavoriteSchema,
  insertProjectMemberSchema,
} from "@shared/schema";

// ── Param helper (Express 5 params can be string | string[]) ────────────
function p(param: string | string[] | undefined): string {
  return Array.isArray(param) ? param[0] : param || "";
}

// ── Password helpers ────────────────────────────────────────────────────
function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(":");
  const result = crypto.scryptSync(password, salt, 64).toString("hex");
  return hash === result;
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  await setupAuth(app);
  registerAuthRoutes(app);

  // ════════════════════════════════════════════════════════════════════════
  //  AUTH  (Phase 2.1)
  // ════════════════════════════════════════════════════════════════════════

  app.post("/api/auth/register", async (req: any, res) => {
    try {
      const { email, password, firstName, lastName } = req.body;
      if (!email || !password) {
        return res.status(400).json({ message: "Email and password are required" });
      }

      // Check if user already exists
      const existing = await storage.getUserByEmail(email);
      if (existing) {
        return res.status(409).json({ message: "User with this email already exists" });
      }

      const hashed = hashPassword(password);
      const user = await authStorage.upsertUser({
        id: crypto.randomUUID(),
        email,
        firstName: firstName || null,
        lastName: lastName || null,
        profileImageUrl: null,
      });

      // Store hashed password
      await storage.setUserPassword(user.id, hashed);

      // Create session
      req.user = { claims: { sub: user.id } };
      (req as any).session.userId = user.id;

      res.status(201).json(user);
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Registration failed" });
    }
  });

  app.post("/api/auth/login", async (req: any, res) => {
    try {
      const { email, password } = req.body;
      if (!email || !password) {
        return res.status(400).json({ message: "Email and password are required" });
      }

      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      const storedPassword = await storage.getUserPassword(user.id);
      if (!storedPassword || !verifyPassword(password, storedPassword)) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      req.user = { claims: { sub: user.id } };
      (req as any).session.userId = user.id;

      res.json(user);
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Login failed" });
    }
  });

  app.post("/api/auth/logout", (req: any, res) => {
    req.session.destroy((err: any) => {
      if (err) return res.status(500).json({ message: "Logout failed" });
      res.json({ message: "Logged out" });
    });
  });

  app.patch("/api/auth/profile", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      const { firstName, lastName, email } = req.body;
      const user = await authStorage.upsertUser({
        id: userId,
        firstName: firstName ?? null,
        lastName: lastName ?? null,
        email: email ?? null,
        profileImageUrl: null,
      });
      res.json(user);
    } catch (error: any) {
      res.status(400).json({ message: error.message || "Failed to update profile" });
    }
  });

  app.patch("/api/auth/password", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      const { oldPassword, newPassword } = req.body;
      if (!oldPassword || !newPassword) {
        return res.status(400).json({ message: "Old and new passwords are required" });
      }

      const storedPassword = await storage.getUserPassword(userId);
      if (!storedPassword || !verifyPassword(oldPassword, storedPassword)) {
        return res.status(401).json({ message: "Current password is incorrect" });
      }

      await storage.setUserPassword(userId, hashPassword(newPassword));
      res.json({ message: "Password updated" });
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Failed to update password" });
    }
  });

  // ════════════════════════════════════════════════════════════════════════
  //  USERS
  // ════════════════════════════════════════════════════════════════════════

  app.get("/api/users", isAuthenticated, async (_req, res) => {
    try {
      const users = await storage.getAllUsers();
      res.json(users);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  app.get("/api/users/search", isAuthenticated, async (req, res) => {
    try {
      const q = ((req.query.q as string) || "").trim().toLowerCase();
      if (!q) return res.json([]);
      const allUsers = await storage.getAllUsers();
      const matched = allUsers.filter(
        (u: any) =>
          (u.firstName && u.firstName.toLowerCase().includes(q)) ||
          (u.lastName && u.lastName.toLowerCase().includes(q)) ||
          (u.email && u.email.toLowerCase().includes(q)) ||
          (u.username && u.username.toLowerCase().includes(q)),
      );
      res.json(matched);
    } catch (error) {
      res.status(500).json({ message: "Failed to search users" });
    }
  });

  // ════════════════════════════════════════════════════════════════════════
  //  NOTIFICATIONS  (Phase 3.3) — placed before param routes
  // ════════════════════════════════════════════════════════════════════════

  app.get("/api/notifications", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      const notifications = await storage.getNotificationsForUser(userId);
      res.json(notifications);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch notifications" });
    }
  });

  app.get("/api/notifications/unread-count", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      const count = await storage.getUnreadNotificationCount(userId);
      res.json({ count });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch unread count" });
    }
  });

  app.post("/api/notifications/mark-all-read", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      await storage.markAllNotificationsRead(userId);
      res.json({ message: "All notifications marked as read" });
    } catch (error) {
      res.status(500).json({ message: "Failed to mark notifications as read" });
    }
  });

  app.patch("/api/notifications/:id/read", isAuthenticated, async (req, res) => {
    try {
      await storage.markNotificationRead(p(req.params.id));
      res.json({ message: "Notification marked as read" });
    } catch (error) {
      res.status(500).json({ message: "Failed to mark notification as read" });
    }
  });

  // ════════════════════════════════════════════════════════════════════════
  //  GLOBAL SEARCH  (Phase 4.2) — BEFORE any :id param routes
  // ════════════════════════════════════════════════════════════════════════

  app.get("/api/search", isAuthenticated, async (req: any, res) => {
    try {
      const q = (req.query.q as string) || "";
      if (!q.trim()) return res.json({ issues: [], projects: [] });

      const [issueSearchResult, allProjects] = await Promise.all([
        storage.searchIssues({ text: q as string, limit: 20 }),
        storage.getProjects(),
      ]);
      const matchedProjects = allProjects.filter(proj => proj.name.toLowerCase().includes((q as string).toLowerCase()));
      res.json({ issues: issueSearchResult.issues, projects: matchedProjects });
    } catch (error) {
      res.status(500).json({ message: "Search failed" });
    }
  });

  // ════════════════════════════════════════════════════════════════════════
  //  SAVED FILTERS  (Phase 4.1) — placed before param routes
  // ════════════════════════════════════════════════════════════════════════

  app.get("/api/saved-filters", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      const projectId = req.query.projectId as string | undefined;
      const filters = await storage.getSavedFilters(userId, projectId);
      res.json(filters);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch saved filters" });
    }
  });

  app.post("/api/saved-filters", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      const parsed = insertSavedFilterSchema.parse({
        ...req.body,
        userId,
      });
      const filter = await storage.createSavedFilter(parsed);
      res.status(201).json(filter);
    } catch (error: any) {
      res.status(400).json({ message: error.message || "Invalid filter data" });
    }
  });

  app.delete("/api/saved-filters/:id", isAuthenticated, async (req, res) => {
    try {
      await storage.deleteSavedFilter(p(req.params.id));
      res.json({ message: "Filter deleted" });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete filter" });
    }
  });

  // ════════════════════════════════════════════════════════════════════════
  //  MY WORK  (Phase 4.3)
  // ════════════════════════════════════════════════════════════════════════

  app.get("/api/me/assigned", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      const result = await storage.searchIssues({ assigneeId: userId, limit: 100 });
      res.json(result.issues);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch assigned issues" });
    }
  });

  app.get("/api/me/reported", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      const allIssuesResult = await storage.searchIssues({ limit: 1000 });
      const reportedIssues = allIssuesResult.issues.filter(i => i.reporterId === userId);
      res.json(reportedIssues);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch reported issues" });
    }
  });

  app.get("/api/me/watching", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      const issueList = await storage.getWatchedIssues(userId);
      res.json(issueList);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch watched issues" });
    }
  });

  // ════════════════════════════════════════════════════════════════════════
  //  FAVORITES  (Phase 4.4)
  // ════════════════════════════════════════════════════════════════════════

  app.get("/api/me/favorites", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      const favs = await storage.getFavorites(userId);
      res.json(favs);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch favorites" });
    }
  });

  app.get("/api/me/dashboard", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      const gadgets = await storage.getDashboardGadgets(userId);
      res.json(gadgets);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch dashboard" });
    }
  });

  app.put("/api/me/dashboard", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      const { gadgets } = req.body;
      const existing = await storage.getDashboardGadgets(userId);
      for (const g of existing) { await storage.deleteDashboardGadget(g.id); }
      for (const g of gadgets) { await storage.createDashboardGadget({ ...g, userId }); }
      const updated = await storage.getDashboardGadgets(userId);
      res.json(updated);
    } catch (error: any) {
      res.status(400).json({ message: error.message || "Failed to update dashboard" });
    }
  });

  app.post("/api/me/dashboard/gadgets", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      const gadget = await storage.createDashboardGadget({ ...req.body, userId });
      res.status(201).json(gadget);
    } catch (error: any) {
      res.status(400).json({ message: error.message || "Failed to create gadget" });
    }
  });

  app.delete("/api/me/dashboard/gadgets/:id", isAuthenticated, async (req, res) => {
    try {
      await storage.deleteDashboardGadget(p(req.params.id));
      res.json({ message: "Gadget deleted" });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete gadget" });
    }
  });

  app.post("/api/favorites", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      const parsed = insertFavoriteSchema.parse({
        ...req.body,
        userId,
      });
      const fav = await storage.addFavorite(parsed);
      res.status(201).json(fav);
    } catch (error: any) {
      res.status(400).json({ message: error.message || "Failed to add favorite" });
    }
  });

  app.delete("/api/favorites/:id", isAuthenticated, async (req, res) => {
    try {
      await storage.removeFavorite(p(req.params.id));
      res.json({ message: "Favorite removed" });
    } catch (error) {
      res.status(500).json({ message: "Failed to remove favorite" });
    }
  });

  // ════════════════════════════════════════════════════════════════════════
  //  PROJECTS
  // ════════════════════════════════════════════════════════════════════════

  app.get("/api/projects", isAuthenticated, async (_req, res) => {
    try {
      const projects = await storage.getProjects();
      res.json(projects);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch projects" });
    }
  });

  app.get("/api/projects/:id", isAuthenticated, async (req, res) => {
    try {
      const project = await storage.getProject(p(req.params.id));
      if (!project) return res.status(404).json({ message: "Project not found" });
      res.json(project);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch project" });
    }
  });

  app.post("/api/projects", isAuthenticated, async (req: any, res) => {
    try {
      const parsed = insertProjectSchema.parse({
        ...req.body,
        leadId: req.user?.claims?.sub,
      });
      const project = await storage.createProject(parsed);
      res.status(201).json(project);
    } catch (error: any) {
      res.status(400).json({ message: error.message || "Invalid project data" });
    }
  });

  app.patch("/api/projects/:id", isAuthenticated, async (req, res) => {
    try {
      const project = await storage.updateProject(p(req.params.id), req.body);
      if (!project) return res.status(404).json({ message: "Project not found" });
      res.json(project);
    } catch (error: any) {
      res.status(400).json({ message: error.message || "Failed to update project" });
    }
  });

  app.delete("/api/projects/:id", isAuthenticated, async (req, res) => {
    try {
      await storage.deleteProject(p(req.params.id));
      res.json({ message: "Project deleted" });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete project" });
    }
  });

  // ── Project Labels (Phase 1.1) ──────────────────────────────────────
  app.get("/api/projects/:projectId/labels", isAuthenticated, async (req, res) => {
    try {
      const labelList = await storage.getLabelsByProject(p(req.params.projectId));
      res.json(labelList);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch labels" });
    }
  });

  app.post("/api/projects/:projectId/labels", isAuthenticated, async (req, res) => {
    try {
      const parsed = insertLabelSchema.parse({
        ...req.body,
        projectId: p(req.params.projectId),
      });
      const label = await storage.createLabel(parsed);
      res.status(201).json(label);
    } catch (error: any) {
      res.status(400).json({ message: error.message || "Invalid label data" });
    }
  });

  // ── Project Components (Phase 1.2) ──────────────────────────────────
  app.get("/api/projects/:projectId/components", isAuthenticated, async (req, res) => {
    try {
      const componentList = await storage.getComponentsByProject(p(req.params.projectId));
      res.json(componentList);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch components" });
    }
  });

  app.post("/api/projects/:projectId/components", isAuthenticated, async (req, res) => {
    try {
      const parsed = insertComponentSchema.parse({
        ...req.body,
        projectId: p(req.params.projectId),
      });
      const component = await storage.createComponent(parsed);
      res.status(201).json(component);
    } catch (error: any) {
      res.status(400).json({ message: error.message || "Invalid component data" });
    }
  });

  // ── Project Versions (Phase 1.5) ───────────────────────────────────
  app.get("/api/projects/:projectId/versions", isAuthenticated, async (req, res) => {
    try {
      const versionList = await storage.getVersionsByProject(p(req.params.projectId));
      res.json(versionList);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch versions" });
    }
  });

  app.post("/api/projects/:projectId/versions", isAuthenticated, async (req, res) => {
    try {
      const parsed = insertVersionSchema.parse({
        ...req.body,
        projectId: p(req.params.projectId),
      });
      const version = await storage.createVersion(parsed);
      res.status(201).json(version);
    } catch (error: any) {
      res.status(400).json({ message: error.message || "Invalid version data" });
    }
  });

  // ── Project Sprints (Phase 1.6) ────────────────────────────────────
  app.get("/api/projects/:projectId/sprints", isAuthenticated, async (req, res) => {
    try {
      const sprintList = await storage.getSprintsByProject(p(req.params.projectId));
      res.json(sprintList);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch sprints" });
    }
  });

  app.post("/api/projects/:projectId/sprints", isAuthenticated, async (req, res) => {
    try {
      const parsed = insertSprintSchema.parse({
        ...req.body,
        projectId: p(req.params.projectId),
      });
      const sprint = await storage.createSprint(parsed);
      res.status(201).json(sprint);
    } catch (error: any) {
      res.status(400).json({ message: error.message || "Invalid sprint data" });
    }
  });

  // ── Project Issues ──────────────────────────────────────────────────
  app.get("/api/projects/:projectId/issues", isAuthenticated, async (req, res) => {
    try {
      const issueList = await storage.getIssuesByProject(p(req.params.projectId));
      res.json(issueList);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch issues" });
    }
  });

  app.post("/api/projects/:projectId/issues", isAuthenticated, async (req: any, res) => {
    try {
      const projectId = p(req.params.projectId);
      const issueNumber = await storage.getNextIssueNumber(projectId);
      const parsed = insertIssueSchema.parse({
        ...req.body,
        projectId,
        issueNumber,
        reporterId: req.user?.claims?.sub,
      });
      const issue = await storage.createIssue(parsed);
      res.status(201).json(issue);
    } catch (error: any) {
      res.status(400).json({ message: error.message || "Invalid issue data" });
    }
  });

  // ── Project Members (Phase 2.2) ────────────────────────────────────
  app.get("/api/projects/:projectId/members", isAuthenticated, async (req, res) => {
    try {
      const members = await storage.getProjectMembers(p(req.params.projectId));
      res.json(members);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch project members" });
    }
  });

  app.post("/api/projects/:projectId/members", isAuthenticated, async (req, res) => {
    try {
      const parsed = insertProjectMemberSchema.parse({
        ...req.body,
        projectId: p(req.params.projectId),
      });
      const member = await storage.addProjectMember(parsed);
      res.status(201).json(member);
    } catch (error: any) {
      res.status(400).json({ message: error.message || "Failed to add project member" });
    }
  });

  app.patch("/api/projects/:projectId/members/:memberId", isAuthenticated, async (req, res) => {
    try {
      const member = await storage.updateProjectMemberRole(p(req.params.memberId), req.body.role);
      if (!member) return res.status(404).json({ message: "Project member not found" });
      res.json(member);
    } catch (error: any) {
      res.status(400).json({ message: error.message || "Failed to update member role" });
    }
  });

  app.delete("/api/projects/:projectId/members/:memberId", isAuthenticated, async (req, res) => {
    try {
      await storage.removeProjectMember(p(req.params.memberId));
      res.json({ message: "Project member removed" });
    } catch (error) {
      res.status(500).json({ message: "Failed to remove project member" });
    }
  });

  // ── Project Activity (Phase 3.1) ───────────────────────────────────
  app.get("/api/projects/:projectId/activity", isAuthenticated, async (req, res) => {
    try {
      const activity = await storage.getActivityForProject(p(req.params.projectId));
      res.json(activity);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch project activity" });
    }
  });

  // ── Project Epics / Roadmap (Phase 4.5) ────────────────────────────
  app.get("/api/projects/:projectId/epics", isAuthenticated, async (req, res) => {
    try {
      const allIssues = await storage.getIssuesByProject(p(req.params.projectId));
      const epics = allIssues.filter(i => i.type === "epic").map(epic => {
        const children = allIssues.filter(i => i.parentId === epic.id);
        const doneChildren = children.filter(i => i.status === "done");
        return { ...epic, childCount: children.length, doneChildCount: doneChildren.length };
      });
      res.json(epics);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch epics" });
    }
  });

  // ── Project Board Config (Phase 6.1) ───────────────────────────────
  app.get("/api/projects/:projectId/board-config", isAuthenticated, async (req, res) => {
    try {
      const config = await storage.getBoardConfig(p(req.params.projectId));
      res.json(config || {});
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch board config" });
    }
  });

  app.patch("/api/projects/:projectId/board-config", isAuthenticated, async (req, res) => {
    try {
      const config = await storage.upsertBoardConfig(p(req.params.projectId), req.body);
      res.json(config);
    } catch (error: any) {
      res.status(400).json({ message: error.message || "Failed to update board config" });
    }
  });

  // ── Project Workflow (Phase 6.2) ───────────────────────────────────
  app.get("/api/projects/:projectId/workflow", isAuthenticated, async (req, res) => {
    try {
      const workflow = await storage.getWorkflow(p(req.params.projectId));
      res.json(workflow || {});
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch workflow" });
    }
  });

  app.put("/api/projects/:projectId/workflow", isAuthenticated, async (req, res) => {
    try {
      const { name, statuses, transitions } = req.body;
      const workflow = await storage.upsertWorkflow(p(req.params.projectId), { name, statuses });
      if (transitions && Array.isArray(transitions)) {
        await storage.setWorkflowTransitions(workflow.id, transitions);
      }
      const full = await storage.getWorkflow(p(req.params.projectId));
      res.json(full);
    } catch (error: any) {
      res.status(400).json({ message: error.message || "Failed to update workflow" });
    }
  });

  app.get("/api/projects/:projectId/workflow/transitions/:fromStatus", isAuthenticated, async (req, res) => {
    try {
      const projectId = p(req.params.projectId);
      const fromStatus = p(req.params.fromStatus);
      const workflow = await storage.getWorkflow(projectId);
      if (workflow) {
        const allTransitions = await storage.getWorkflowTransitions(workflow.id);
        const filtered = allTransitions.filter(t => t.fromStatus === fromStatus);
        res.json(filtered);
      } else {
        res.json([]);
      }
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch transitions" });
    }
  });

  // ── Project Velocity (Phase 5) ─────────────────────────────────────
  app.get("/api/projects/:projectId/velocity", isAuthenticated, async (req, res) => {
    try {
      const projectId = p(req.params.projectId);
      const projectSprints = await storage.getSprintsByProject(projectId);
      const completedSprints = projectSprints.filter(s => s.status === "completed");
      const velocity = await Promise.all(completedSprints.map(async (sprint) => {
        const sprintIssues = await storage.getIssuesBySprint(sprint.id);
        const committed = sprintIssues.reduce((acc, i) => acc + (i.storyPoints || 0), 0);
        const completed = sprintIssues.filter(i => i.status === "done").reduce((acc, i) => acc + (i.storyPoints || 0), 0);
        return { sprintName: sprint.name, committed, completed };
      }));
      res.json(velocity);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch velocity data" });
    }
  });

  // ── Project CFD (Phase 5) ──────────────────────────────────────────
  app.get("/api/projects/:projectId/cfd", isAuthenticated, async (req, res) => {
    try {
      const projectId = p(req.params.projectId);
      const days = parseInt(req.query.days as string) || 30;
      const endDate = new Date();
      const startDate = new Date(endDate.getTime() - days * 24 * 60 * 60 * 1000);
      const snapshots = await storage.getStatusSnapshots(projectId, startDate, endDate);
      res.json(snapshots);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch CFD data" });
    }
  });

  // ════════════════════════════════════════════════════════════════════════
  //  LABELS  (Phase 1.1) — standalone routes
  // ════════════════════════════════════════════════════════════════════════

  app.patch("/api/labels/:id", isAuthenticated, async (req, res) => {
    try {
      const label = await storage.updateLabel(p(req.params.id), req.body);
      if (!label) return res.status(404).json({ message: "Label not found" });
      res.json(label);
    } catch (error: any) {
      res.status(400).json({ message: error.message || "Failed to update label" });
    }
  });

  app.delete("/api/labels/:id", isAuthenticated, async (req, res) => {
    try {
      await storage.deleteLabel(p(req.params.id));
      res.json({ message: "Label deleted" });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete label" });
    }
  });

  // ════════════════════════════════════════════════════════════════════════
  //  COMPONENTS  (Phase 1.2) — standalone routes
  // ════════════════════════════════════════════════════════════════════════

  app.patch("/api/components/:id", isAuthenticated, async (req, res) => {
    try {
      const component = await storage.updateComponent(p(req.params.id), req.body);
      if (!component) return res.status(404).json({ message: "Component not found" });
      res.json(component);
    } catch (error: any) {
      res.status(400).json({ message: error.message || "Failed to update component" });
    }
  });

  app.delete("/api/components/:id", isAuthenticated, async (req, res) => {
    try {
      await storage.deleteComponent(p(req.params.id));
      res.json({ message: "Component deleted" });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete component" });
    }
  });

  // ════════════════════════════════════════════════════════════════════════
  //  VERSIONS  (Phase 1.5) — standalone routes
  // ════════════════════════════════════════════════════════════════════════

  app.patch("/api/versions/:id", isAuthenticated, async (req, res) => {
    try {
      const version = await storage.updateVersion(p(req.params.id), req.body);
      if (!version) return res.status(404).json({ message: "Version not found" });
      res.json(version);
    } catch (error: any) {
      res.status(400).json({ message: error.message || "Failed to update version" });
    }
  });

  app.delete("/api/versions/:id", isAuthenticated, async (req, res) => {
    try {
      await storage.deleteVersion(p(req.params.id));
      res.json({ message: "Version deleted" });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete version" });
    }
  });

  app.post("/api/versions/:id/release", isAuthenticated, async (req, res) => {
    try {
      const version = await storage.updateVersion(p(req.params.id), {
        status: "released",
        releaseDate: new Date(),
      });
      if (!version) return res.status(404).json({ message: "Version not found" });
      res.json(version);
    } catch (error: any) {
      res.status(400).json({ message: error.message || "Failed to release version" });
    }
  });

  // ════════════════════════════════════════════════════════════════════════
  //  SPRINTS  (Phase 1.6) — standalone routes
  // ════════════════════════════════════════════════════════════════════════

  app.patch("/api/sprints/:id", isAuthenticated, async (req, res) => {
    try {
      const sprint = await storage.updateSprint(p(req.params.id), req.body);
      if (!sprint) return res.status(404).json({ message: "Sprint not found" });
      res.json(sprint);
    } catch (error: any) {
      res.status(400).json({ message: error.message || "Failed to update sprint" });
    }
  });

  app.delete("/api/sprints/:id", isAuthenticated, async (req, res) => {
    try {
      await storage.deleteSprint(p(req.params.id));
      res.json({ message: "Sprint deleted" });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete sprint" });
    }
  });

  app.post("/api/sprints/:id/start", isAuthenticated, async (req, res) => {
    try {
      // Look up the sprint to find its project
      const sprintId = p(req.params.id);
      const existing = await storage.getSprint(sprintId);
      if (!existing) return res.status(404).json({ message: "Sprint not found" });

      // Validate only one active sprint per project
      const activeSprints = await storage.getActiveSprintForProject(existing.projectId);
      if (activeSprints && activeSprints.id !== sprintId) {
        return res.status(409).json({ message: "Another sprint is already active in this project" });
      }

      const sprint = await storage.updateSprint(sprintId, {
        status: "active",
        startDate: new Date(),
      });
      res.json(sprint);
    } catch (error: any) {
      res.status(400).json({ message: error.message || "Failed to start sprint" });
    }
  });

  app.post("/api/sprints/:id/complete", isAuthenticated, async (req, res) => {
    try {
      const completeSprintId = p(req.params.id);
      const existing = await storage.getSprint(completeSprintId);
      if (!existing) return res.status(404).json({ message: "Sprint not found" });

      const sprint = await storage.updateSprint(completeSprintId, {
        status: "completed",
        completedAt: new Date(),
      });

      // Move incomplete issues to backlog (clear sprintId)
      await storage.moveIncompleteIssuesToBacklog(completeSprintId);

      res.json(sprint);
    } catch (error: any) {
      res.status(400).json({ message: error.message || "Failed to complete sprint" });
    }
  });

  app.get("/api/sprints/:id/issues", isAuthenticated, async (req, res) => {
    try {
      const issueList = await storage.getIssuesBySprint(p(req.params.id));
      res.json(issueList);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch sprint issues" });
    }
  });

  // ── Sprint Burndown (Phase 5) ──────────────────────────────────────
  app.get("/api/sprints/:id/burndown", isAuthenticated, async (req, res) => {
    try {
      const snapshots = await storage.getSprintSnapshots(p(req.params.id));
      res.json(snapshots);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch burndown data" });
    }
  });

  // ── Sprint Report (Phase 5) ────────────────────────────────────────
  app.get("/api/sprints/:id/report", isAuthenticated, async (req, res) => {
    try {
      const reportSprintId = p(req.params.id);
      const sprint = await storage.getSprint(reportSprintId);
      if (!sprint) return res.status(404).json({ message: "Sprint not found" });

      const allIssues = await storage.getIssuesBySprint(reportSprintId);
      const completed = allIssues.filter((i) => i.status === "done");
      const incomplete = allIssues.filter((i) => i.status !== "done");

      const totalPoints = allIssues.reduce((sum, i) => sum + (i.storyPoints || 0), 0);
      const completedPoints = completed.reduce((sum, i) => sum + (i.storyPoints || 0), 0);

      res.json({
        sprint,
        completed,
        incomplete,
        stats: {
          totalIssues: allIssues.length,
          completedIssues: completed.length,
          incompleteIssues: incomplete.length,
          totalPoints,
          completedPoints,
          incompletePoints: totalPoints - completedPoints,
        },
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch sprint report" });
    }
  });

  // ════════════════════════════════════════════════════════════════════════
  //  PROJECT MEMBERS  (Phase 2.2) — standalone routes
  // ════════════════════════════════════════════════════════════════════════

  app.patch("/api/project-members/:id", isAuthenticated, async (req, res) => {
    try {
      const member = await storage.updateProjectMemberRole(p(req.params.id), req.body.role);
      if (!member) return res.status(404).json({ message: "Project member not found" });
      res.json(member);
    } catch (error: any) {
      res.status(400).json({ message: error.message || "Failed to update member role" });
    }
  });

  app.delete("/api/project-members/:id", isAuthenticated, async (req, res) => {
    try {
      await storage.removeProjectMember(p(req.params.id));
      res.json({ message: "Project member removed" });
    } catch (error) {
      res.status(500).json({ message: "Failed to remove project member" });
    }
  });

  // ════════════════════════════════════════════════════════════════════════
  //  ISSUE LINKS  (Phase 1.4) — standalone delete
  // ════════════════════════════════════════════════════════════════════════

  app.delete("/api/issue-links/:id", isAuthenticated, async (req, res) => {
    try {
      await storage.deleteIssueLink(p(req.params.id));
      res.json({ message: "Issue link deleted" });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete issue link" });
    }
  });

  // ════════════════════════════════════════════════════════════════════════
  //  WORK LOGS  (Phase 3.4) — standalone delete
  // ════════════════════════════════════════════════════════════════════════

  app.delete("/api/worklogs/:id", isAuthenticated, async (req, res) => {
    try {
      await storage.deleteWorkLog(p(req.params.id));
      res.json({ message: "Work log deleted" });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete work log" });
    }
  });

  // ════════════════════════════════════════════════════════════════════════
  //  ATTACHMENTS  (Phase 3.5) — standalone routes
  // ════════════════════════════════════════════════════════════════════════

  app.get("/api/attachments/:id", isAuthenticated, async (req, res) => {
    try {
      const attachment = await storage.getAttachment(p(req.params.id));
      if (!attachment) return res.status(404).json({ message: "Attachment not found" });
      res.json(attachment);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch attachment" });
    }
  });

  app.delete("/api/attachments/:id", isAuthenticated, async (req, res) => {
    try {
      await storage.deleteAttachment(p(req.params.id));
      res.json({ message: "Attachment deleted" });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete attachment" });
    }
  });

  // ════════════════════════════════════════════════════════════════════════
  //  ISSUES — search & bulk MUST come BEFORE /api/issues/:id
  // ════════════════════════════════════════════════════════════════════════

  app.get("/api/issues/search", isAuthenticated, async (req: any, res) => {
    try {
      const filters = {
        type: req.query.type as string | undefined,
        status: req.query.status as string | undefined,
        priority: req.query.priority as string | undefined,
        assignee: req.query.assignee as string | undefined,
        label: req.query.label as string | undefined,
        sprint: req.query.sprint as string | undefined,
        text: req.query.text as string | undefined,
        sortBy: req.query.sortBy as string | undefined,
        page: req.query.page ? parseInt(req.query.page as string) : undefined,
        projectId: req.query.projectId as string | undefined,
      };
      const result = await storage.searchIssues(filters);
      res.json(result);
    } catch (error) {
      res.status(500).json({ message: "Failed to search issues" });
    }
  });

  app.post("/api/issues/bulk", isAuthenticated, async (req, res) => {
    try {
      const { issueIds, updates } = req.body;
      if (!issueIds || !Array.isArray(issueIds)) {
        return res.status(400).json({ message: "issueIds array is required" });
      }
      const result = await storage.bulkUpdateIssues(issueIds, updates);
      res.json(result);
    } catch (error: any) {
      res.status(400).json({ message: error.message || "Bulk update failed" });
    }
  });

  app.get("/api/issues/recent", isAuthenticated, async (_req, res) => {
    try {
      const issueList = await storage.getRecentIssues(10);
      res.json(issueList);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch recent issues" });
    }
  });

  // ── Single Issue CRUD ───────────────────────────────────────────────
  app.get("/api/issues/:id", isAuthenticated, async (req, res) => {
    try {
      const issue = await storage.getIssue(p(req.params.id));
      if (!issue) return res.status(404).json({ message: "Issue not found" });
      res.json(issue);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch issue" });
    }
  });

  app.patch("/api/issues/:id", isAuthenticated, async (req, res) => {
    try {
      const issue = await storage.updateIssue(p(req.params.id), req.body);
      if (!issue) return res.status(404).json({ message: "Issue not found" });
      res.json(issue);
    } catch (error: any) {
      res.status(400).json({ message: error.message || "Failed to update issue" });
    }
  });

  app.delete("/api/issues/:id", isAuthenticated, async (req, res) => {
    try {
      await storage.deleteIssue(p(req.params.id));
      res.json({ message: "Issue deleted" });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete issue" });
    }
  });

  // ── Issue Comments ──────────────────────────────────────────────────
  app.get("/api/issues/:issueId/comments", isAuthenticated, async (req, res) => {
    try {
      const commentList = await storage.getCommentsByIssue(p(req.params.issueId));
      res.json(commentList);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch comments" });
    }
  });

  app.post("/api/issues/:issueId/comments", isAuthenticated, async (req: any, res) => {
    try {
      const content = req.body.content;
      if (!content || (typeof content === "string" && !content.trim())) {
        return res.status(400).json({ message: "Comment content is required" });
      }
      const parsed = insertCommentSchema.parse({
        issueId: p(req.params.issueId),
        authorId: req.user?.claims?.sub,
        content,
      });
      const comment = await storage.createComment(parsed);
      res.status(201).json(comment);
    } catch (error: any) {
      res.status(400).json({ message: error.message || "Invalid comment data" });
    }
  });

  // ── Issue Labels (Phase 1.1) ────────────────────────────────────────
  app.get("/api/issues/:id/labels", isAuthenticated, async (req, res) => {
    try {
      const labelList = await storage.getLabelsForIssue(p(req.params.id));
      res.json(labelList);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch issue labels" });
    }
  });

  app.post("/api/issues/:id/labels", isAuthenticated, async (req, res) => {
    try {
      const result = await storage.addLabelToIssue(p(req.params.id), req.body.labelId);
      res.status(201).json(result);
    } catch (error: any) {
      res.status(400).json({ message: error.message || "Failed to add label to issue" });
    }
  });

  app.delete("/api/issues/:issueId/labels/:labelId", isAuthenticated, async (req, res) => {
    try {
      await storage.removeLabelFromIssue(p(req.params.issueId), p(req.params.labelId));
      res.json({ message: "Label removed from issue" });
    } catch (error) {
      res.status(500).json({ message: "Failed to remove label from issue" });
    }
  });

  // ── Issue Components (Phase 1.2) ───────────────────────────────────
  app.get("/api/issues/:id/components", isAuthenticated, async (req, res) => {
    try {
      const componentList = await storage.getComponentsForIssue(p(req.params.id));
      res.json(componentList);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch issue components" });
    }
  });

  app.post("/api/issues/:id/components", isAuthenticated, async (req, res) => {
    try {
      const result = await storage.addComponentToIssue(p(req.params.id), req.body.componentId);
      res.status(201).json(result);
    } catch (error: any) {
      res.status(400).json({ message: error.message || "Failed to add component to issue" });
    }
  });

  app.delete("/api/issues/:issueId/components/:componentId", isAuthenticated, async (req, res) => {
    try {
      await storage.removeComponentFromIssue(p(req.params.issueId), p(req.params.componentId));
      res.json({ message: "Component removed from issue" });
    } catch (error) {
      res.status(500).json({ message: "Failed to remove component from issue" });
    }
  });

  // ── Sub-tasks (Phase 1.3) ──────────────────────────────────────────
  app.get("/api/issues/:id/children", isAuthenticated, async (req, res) => {
    try {
      const children = await storage.getChildIssues(p(req.params.id));
      res.json(children);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch child issues" });
    }
  });

  // ── Issue Links (Phase 1.4) ────────────────────────────────────────
  app.get("/api/issues/:id/links", isAuthenticated, async (req, res) => {
    try {
      const links = await storage.getLinksForIssue(p(req.params.id));
      res.json(links);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch issue links" });
    }
  });

  app.post("/api/issues/:id/links", isAuthenticated, async (req, res) => {
    try {
      const parsed = insertIssueLinkSchema.parse({
        sourceIssueId: p(req.params.id),
        targetIssueId: req.body.targetIssueId,
        linkType: req.body.linkType,
      });
      const link = await storage.createIssueLink(parsed);
      res.status(201).json(link);
    } catch (error: any) {
      res.status(400).json({ message: error.message || "Failed to create issue link" });
    }
  });

  // ── Issue Activity (Phase 3.1) ─────────────────────────────────────
  app.get("/api/issues/:id/activity", isAuthenticated, async (req, res) => {
    try {
      const activity = await storage.getActivityForIssue(p(req.params.id));
      res.json(activity);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch issue activity" });
    }
  });

  // ── Issue Watchers (Phase 3.2) ─────────────────────────────────────
  app.get("/api/issues/:id/watchers", isAuthenticated, async (req, res) => {
    try {
      const watcherList = await storage.getWatchersForIssue(p(req.params.id));
      res.json(watcherList);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch watchers" });
    }
  });

  app.post("/api/issues/:id/watch", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      const watcher = await storage.addWatcher({ issueId: p(req.params.id), userId });
      res.status(201).json(watcher);
    } catch (error: any) {
      res.status(400).json({ message: error.message || "Failed to add watcher" });
    }
  });

  app.delete("/api/issues/:id/watch", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      await storage.removeWatcher(p(req.params.id), userId);
      res.json({ message: "Stopped watching issue" });
    } catch (error) {
      res.status(500).json({ message: "Failed to remove watcher" });
    }
  });

  // ── Issue Work Logs (Phase 3.4) ────────────────────────────────────
  app.get("/api/issues/:id/worklogs", isAuthenticated, async (req, res) => {
    try {
      const logs = await storage.getWorkLogsForIssue(p(req.params.id));
      res.json(logs);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch work logs" });
    }
  });

  app.post("/api/issues/:id/worklogs", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      const parsed = insertWorkLogSchema.parse({
        ...req.body,
        issueId: p(req.params.id),
        userId,
      });
      const log = await storage.createWorkLog(parsed);

      // Update the issue's timeSpent
      const issue = await storage.getIssue(p(req.params.id));
      if (issue) {
        const newTimeSpent = (issue.timeSpent || 0) + parsed.timeSpent;
        await storage.updateIssue(p(req.params.id), { timeSpent: newTimeSpent });
      }

      res.status(201).json(log);
    } catch (error: any) {
      res.status(400).json({ message: error.message || "Failed to create work log" });
    }
  });

  // ── Issue Attachments (Phase 3.5) ──────────────────────────────────
  app.get("/api/issues/:id/attachments", isAuthenticated, async (req, res) => {
    try {
      const attachmentList = await storage.getAttachmentsForIssue(p(req.params.id));
      res.json(attachmentList);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch attachments" });
    }
  });

  app.post("/api/issues/:id/attachments", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      const parsed = insertAttachmentSchema.parse({
        issueId: p(req.params.id),
        userId,
        filename: req.body.filename,
        mimeType: req.body.mimeType,
        size: req.body.size,
        data: req.body.data,
      });
      const attachment = await storage.createAttachment(parsed);
      res.status(201).json(attachment);
    } catch (error: any) {
      res.status(400).json({ message: error.message || "Failed to create attachment" });
    }
  });

  return httpServer;
}
