import { db } from "./db";
import { projects, issues } from "@shared/schema";
import { sql } from "drizzle-orm";

export async function seedDatabase() {
  const existingProjects = await db.select().from(projects);
  if (existingProjects.length > 0) return;

  console.log("Seeding database with sample data...");

  const [proj1] = await db.insert(projects).values({
    name: "Website Redesign",
    key: "WEB",
    description: "Complete redesign of the company website with modern UI/UX patterns and improved performance.",
    avatarColor: "#4C9AFF",
  }).returning();

  const [proj2] = await db.insert(projects).values({
    name: "Mobile App",
    key: "MOB",
    description: "Native mobile application for iOS and Android with offline support.",
    avatarColor: "#36B37E",
  }).returning();

  const [proj3] = await db.insert(projects).values({
    name: "API Platform",
    key: "API",
    description: "RESTful API platform with GraphQL support and comprehensive documentation.",
    avatarColor: "#6554C0",
  }).returning();

  const webIssues = [
    { title: "Design new homepage hero section", type: "story" as const, priority: "high" as const, status: "done" as const, storyPoints: 5 },
    { title: "Implement responsive navigation bar", type: "task" as const, priority: "high" as const, status: "in_review" as const, storyPoints: 3 },
    { title: "Fix broken image loading on Safari", type: "bug" as const, priority: "highest" as const, status: "in_progress" as const, storyPoints: 2 },
    { title: "Add dark mode support", type: "story" as const, priority: "medium" as const, status: "in_progress" as const, storyPoints: 8 },
    { title: "Optimize page load performance", type: "task" as const, priority: "high" as const, status: "todo" as const, storyPoints: 5 },
    { title: "Create about us page", type: "task" as const, priority: "low" as const, status: "todo" as const, storyPoints: 3 },
    { title: "Set up CI/CD pipeline", type: "task" as const, priority: "medium" as const, status: "todo" as const, storyPoints: 5 },
    { title: "User authentication flow", type: "epic" as const, priority: "highest" as const, status: "in_progress" as const, storyPoints: 13 },
    { title: "Contact form validation bug", type: "bug" as const, priority: "medium" as const, status: "backlog" as const, storyPoints: 2 },
    { title: "Implement search functionality", type: "story" as const, priority: "medium" as const, status: "backlog" as const, storyPoints: 8 },
    { title: "Add analytics tracking", type: "task" as const, priority: "low" as const, status: "backlog" as const, storyPoints: 3 },
    { title: "SEO improvements", type: "task" as const, priority: "medium" as const, status: "todo" as const, storyPoints: 5 },
  ];

  for (let i = 0; i < webIssues.length; i++) {
    await db.insert(issues).values({
      projectId: proj1.id,
      issueNumber: i + 1,
      ...webIssues[i],
      sortOrder: i,
    });
  }

  const mobIssues = [
    { title: "Set up React Native project", type: "task" as const, priority: "highest" as const, status: "done" as const, storyPoints: 3 },
    { title: "Design onboarding screens", type: "story" as const, priority: "high" as const, status: "in_review" as const, storyPoints: 5 },
    { title: "Implement push notifications", type: "story" as const, priority: "high" as const, status: "in_progress" as const, storyPoints: 8 },
    { title: "App crashes on Android 12", type: "bug" as const, priority: "highest" as const, status: "todo" as const, storyPoints: 3 },
    { title: "Offline data sync", type: "epic" as const, priority: "high" as const, status: "backlog" as const, storyPoints: 13 },
  ];

  for (let i = 0; i < mobIssues.length; i++) {
    await db.insert(issues).values({
      projectId: proj2.id,
      issueNumber: i + 1,
      ...mobIssues[i],
      sortOrder: i,
    });
  }

  const apiIssues = [
    { title: "Design REST API schema", type: "task" as const, priority: "highest" as const, status: "done" as const, storyPoints: 5 },
    { title: "Implement rate limiting", type: "story" as const, priority: "high" as const, status: "in_progress" as const, storyPoints: 5 },
    { title: "Add GraphQL endpoint", type: "epic" as const, priority: "medium" as const, status: "todo" as const, storyPoints: 13 },
    { title: "Fix timeout on large queries", type: "bug" as const, priority: "high" as const, status: "todo" as const, storyPoints: 3 },
  ];

  for (let i = 0; i < apiIssues.length; i++) {
    await db.insert(issues).values({
      projectId: proj3.id,
      issueNumber: i + 1,
      ...apiIssues[i],
      sortOrder: i,
    });
  }

  console.log("Seeding complete!");
}
