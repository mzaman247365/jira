import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, registerAuthRoutes, isAuthenticated } from "./replit_integrations/auth";
import { insertProjectSchema, insertIssueSchema, insertCommentSchema } from "@shared/schema";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  await setupAuth(app);
  registerAuthRoutes(app);

  app.get("/api/users", isAuthenticated, async (_req, res) => {
    try {
      const users = await storage.getAllUsers();
      res.json(users);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

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
      const project = await storage.getProject(req.params.id);
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
      const project = await storage.updateProject(req.params.id, req.body);
      if (!project) return res.status(404).json({ message: "Project not found" });
      res.json(project);
    } catch (error: any) {
      res.status(400).json({ message: error.message || "Failed to update project" });
    }
  });

  app.delete("/api/projects/:id", isAuthenticated, async (req, res) => {
    try {
      await storage.deleteProject(req.params.id);
      res.json({ message: "Project deleted" });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete project" });
    }
  });

  app.get("/api/projects/:projectId/issues", isAuthenticated, async (req, res) => {
    try {
      const issues = await storage.getIssuesByProject(req.params.projectId);
      res.json(issues);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch issues" });
    }
  });

  app.post("/api/projects/:projectId/issues", isAuthenticated, async (req: any, res) => {
    try {
      const projectId = req.params.projectId;
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

  app.get("/api/issues/recent", isAuthenticated, async (_req, res) => {
    try {
      const issues = await storage.getRecentIssues(10);
      res.json(issues);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch recent issues" });
    }
  });

  app.patch("/api/issues/:id", isAuthenticated, async (req, res) => {
    try {
      const issue = await storage.updateIssue(req.params.id, req.body);
      if (!issue) return res.status(404).json({ message: "Issue not found" });
      res.json(issue);
    } catch (error: any) {
      res.status(400).json({ message: error.message || "Failed to update issue" });
    }
  });

  app.delete("/api/issues/:id", isAuthenticated, async (req, res) => {
    try {
      await storage.deleteIssue(req.params.id);
      res.json({ message: "Issue deleted" });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete issue" });
    }
  });

  app.get("/api/issues/:issueId/comments", isAuthenticated, async (req, res) => {
    try {
      const comments = await storage.getCommentsByIssue(req.params.issueId);
      res.json(comments);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch comments" });
    }
  });

  app.post("/api/issues/:issueId/comments", isAuthenticated, async (req: any, res) => {
    try {
      const parsed = insertCommentSchema.parse({
        issueId: req.params.issueId,
        authorId: req.user?.claims?.sub,
        content: req.body.content,
      });
      const comment = await storage.createComment(parsed);
      res.status(201).json(comment);
    } catch (error: any) {
      res.status(400).json({ message: error.message || "Invalid comment data" });
    }
  });

  return httpServer;
}
