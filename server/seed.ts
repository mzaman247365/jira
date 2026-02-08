import { db } from "./db";
import {
  projects,
  issues,
  labels,
  issueLabels,
  sprints,
  versions,
  components,
  projectMembers,
} from "@shared/schema";
import { users } from "@shared/models/auth";
import { eq } from "drizzle-orm";

const DEV_USER_ID = "local-dev-user";

export async function seedDatabase() {
  const existingProjects = await db.select().from(projects);
  if (existingProjects.length > 0) return;

  console.log("Seeding database with sample data...");

  // ── Ensure dev user exists ──────────────────────────────────────────
  const existingUser = await db.select().from(users).where(eq(users.id, DEV_USER_ID));
  if (existingUser.length === 0) {
    await db.insert(users).values({
      id: DEV_USER_ID,
      email: "dev@localhost",
      firstName: "Local",
      lastName: "Developer",
      profileImageUrl: null,
      authProvider: "local",
    });
  }

  // ── Create Projects ─────────────────────────────────────────────────
  const [proj1] = await db.insert(projects).values({
    name: "Website Redesign",
    key: "WEB",
    description: "Complete redesign of the company website with modern UI/UX patterns and improved performance.",
    leadId: DEV_USER_ID,
    avatarColor: "#4C9AFF",
  }).returning();

  const [proj2] = await db.insert(projects).values({
    name: "Mobile App",
    key: "MOB",
    description: "Native mobile application for iOS and Android with offline support.",
    leadId: DEV_USER_ID,
    avatarColor: "#36B37E",
  }).returning();

  const [proj3] = await db.insert(projects).values({
    name: "API Platform",
    key: "API",
    description: "RESTful API platform with GraphQL support and comprehensive documentation.",
    leadId: DEV_USER_ID,
    avatarColor: "#6554C0",
  }).returning();

  const allProjects = [proj1, proj2, proj3];

  // ── Create Project Members (dev user as project_admin on all) ───────
  for (const proj of allProjects) {
    await db.insert(projectMembers).values({
      projectId: proj.id,
      userId: DEV_USER_ID,
      role: "project_admin",
    });
  }

  // ── Create Labels ───────────────────────────────────────────────────
  const labelDefs: Record<string, { name: string; color: string }[]> = {
    [proj1.id]: [
      { name: "frontend", color: "#4C9AFF" },
      { name: "backend", color: "#36B37E" },
      { name: "urgent", color: "#FF5630" },
      { name: "design", color: "#6554C0" },
    ],
    [proj2.id]: [
      { name: "ios", color: "#FF8B00" },
      { name: "android", color: "#36B37E" },
      { name: "urgent", color: "#FF5630" },
      { name: "performance", color: "#00B8D9" },
    ],
    [proj3.id]: [
      { name: "backend", color: "#36B37E" },
      { name: "documentation", color: "#FFC400" },
      { name: "urgent", color: "#FF5630" },
      { name: "performance", color: "#00B8D9" },
    ],
  };

  const labelMap: Record<string, Record<string, string>> = {};
  for (const projId of Object.keys(labelDefs)) {
    labelMap[projId] = {};
    for (const def of labelDefs[projId]) {
      const [label] = await db.insert(labels).values({
        projectId: projId,
        name: def.name,
        color: def.color,
      }).returning();
      labelMap[projId][def.name] = label.id;
    }
  }

  // ── Create Sprints ──────────────────────────────────────────────────
  const now = new Date();
  const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
  const twoWeeksFromNow = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
  const fourWeeksFromNow = new Date(now.getTime() + 28 * 24 * 60 * 60 * 1000);

  // WEB sprints
  const [webSprint1] = await db.insert(sprints).values({
    projectId: proj1.id,
    name: "WEB Sprint 1",
    goal: "Complete homepage redesign and navigation overhaul",
    status: "active",
    startDate: twoWeeksAgo,
    endDate: twoWeeksFromNow,
  }).returning();

  const [webSprint2] = await db.insert(sprints).values({
    projectId: proj1.id,
    name: "WEB Sprint 2",
    goal: "Implement dark mode and search functionality",
    status: "planning",
    startDate: twoWeeksFromNow,
    endDate: fourWeeksFromNow,
  }).returning();

  // MOB sprints
  const [mobSprint1] = await db.insert(sprints).values({
    projectId: proj2.id,
    name: "MOB Sprint 1",
    goal: "Complete onboarding flow and push notifications",
    status: "active",
    startDate: twoWeeksAgo,
    endDate: twoWeeksFromNow,
  }).returning();

  const [mobSprint2] = await db.insert(sprints).values({
    projectId: proj2.id,
    name: "MOB Sprint 2",
    goal: "Offline sync and Android stability fixes",
    status: "planning",
    startDate: twoWeeksFromNow,
    endDate: fourWeeksFromNow,
  }).returning();

  // API sprints
  const [apiSprint1] = await db.insert(sprints).values({
    projectId: proj3.id,
    name: "API Sprint 1",
    goal: "Implement rate limiting and fix query timeouts",
    status: "active",
    startDate: twoWeeksAgo,
    endDate: twoWeeksFromNow,
  }).returning();

  const [apiSprint2] = await db.insert(sprints).values({
    projectId: proj3.id,
    name: "API Sprint 2",
    goal: "GraphQL endpoint and API documentation",
    status: "planning",
    startDate: twoWeeksFromNow,
    endDate: fourWeeksFromNow,
  }).returning();

  // ── Create Versions ─────────────────────────────────────────────────
  const threeMonthsAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
  const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const threeMonthsFromNow = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);

  // WEB versions
  await db.insert(versions).values({
    projectId: proj1.id,
    name: "v1.0.0",
    description: "Initial website launch with core pages",
    status: "released",
    startDate: threeMonthsAgo,
    releaseDate: oneMonthAgo,
  });

  await db.insert(versions).values({
    projectId: proj1.id,
    name: "v2.0.0",
    description: "Major redesign with dark mode and improved performance",
    status: "unreleased",
    startDate: now,
    releaseDate: threeMonthsFromNow,
  });

  // MOB versions
  await db.insert(versions).values({
    projectId: proj2.id,
    name: "v1.0.0-beta",
    description: "Beta release with basic functionality",
    status: "released",
    startDate: threeMonthsAgo,
    releaseDate: oneMonthAgo,
  });

  await db.insert(versions).values({
    projectId: proj2.id,
    name: "v1.0.0",
    description: "Production release with offline support",
    status: "unreleased",
    startDate: oneMonthAgo,
    releaseDate: threeMonthsFromNow,
  });

  // API versions
  await db.insert(versions).values({
    projectId: proj3.id,
    name: "v1.0.0",
    description: "REST API with core endpoints",
    status: "released",
    startDate: threeMonthsAgo,
    releaseDate: oneMonthAgo,
  });

  await db.insert(versions).values({
    projectId: proj3.id,
    name: "v2.0.0",
    description: "GraphQL support and rate limiting",
    status: "unreleased",
    startDate: now,
    releaseDate: threeMonthsFromNow,
  });

  // ── Create Components ───────────────────────────────────────────────
  // WEB components
  await db.insert(components).values([
    { projectId: proj1.id, name: "UI", description: "Frontend user interface components and pages", leadId: DEV_USER_ID },
    { projectId: proj1.id, name: "API Integration", description: "Backend API calls and data fetching layer", leadId: DEV_USER_ID },
    { projectId: proj1.id, name: "Build & Deploy", description: "CI/CD pipeline, bundling, and deployment configuration", leadId: DEV_USER_ID },
  ]);

  // MOB components
  await db.insert(components).values([
    { projectId: proj2.id, name: "iOS Native", description: "iOS-specific native modules and platform code", leadId: DEV_USER_ID },
    { projectId: proj2.id, name: "Android Native", description: "Android-specific native modules and platform code", leadId: DEV_USER_ID },
    { projectId: proj2.id, name: "Shared Core", description: "Cross-platform shared business logic and state management", leadId: DEV_USER_ID },
  ]);

  // API components
  await db.insert(components).values([
    { projectId: proj3.id, name: "REST API", description: "RESTful endpoint handlers and middleware", leadId: DEV_USER_ID },
    { projectId: proj3.id, name: "Database", description: "Database schema, migrations, and query optimization", leadId: DEV_USER_ID },
  ]);

  // ── Create Issues (enhanced with sprint/assignee assignments) ───────

  // WEB Issues: issues 0-5 go into the active sprint (webSprint1)
  // Active sprint issues should have in_progress / in_review / done statuses
  const webIssues = [
    { title: "Design new homepage hero section", type: "story" as const, priority: "high" as const, status: "done" as const, storyPoints: 5, sprintId: webSprint1.id, assigneeId: DEV_USER_ID },
    { title: "Implement responsive navigation bar", type: "task" as const, priority: "high" as const, status: "in_review" as const, storyPoints: 3, sprintId: webSprint1.id, assigneeId: DEV_USER_ID },
    { title: "Fix broken image loading on Safari", type: "bug" as const, priority: "highest" as const, status: "in_progress" as const, storyPoints: 2, sprintId: webSprint1.id, assigneeId: DEV_USER_ID },
    { title: "Add dark mode support", type: "story" as const, priority: "medium" as const, status: "in_progress" as const, storyPoints: 8, sprintId: webSprint1.id, assigneeId: DEV_USER_ID },
    { title: "Optimize page load performance", type: "task" as const, priority: "high" as const, status: "todo" as const, storyPoints: 5, sprintId: webSprint1.id, assigneeId: DEV_USER_ID },
    { title: "Create about us page", type: "task" as const, priority: "low" as const, status: "done" as const, storyPoints: 3, sprintId: webSprint1.id, assigneeId: DEV_USER_ID },
    // Remaining issues are in backlog (no sprint)
    { title: "Set up CI/CD pipeline", type: "task" as const, priority: "medium" as const, status: "todo" as const, storyPoints: 5 },
    { title: "User authentication flow", type: "epic" as const, priority: "highest" as const, status: "in_progress" as const, storyPoints: 13, assigneeId: DEV_USER_ID },
    { title: "Contact form validation bug", type: "bug" as const, priority: "medium" as const, status: "backlog" as const, storyPoints: 2 },
    { title: "Implement search functionality", type: "story" as const, priority: "medium" as const, status: "backlog" as const, storyPoints: 8 },
    { title: "Add analytics tracking", type: "task" as const, priority: "low" as const, status: "backlog" as const, storyPoints: 3 },
    { title: "SEO improvements", type: "task" as const, priority: "medium" as const, status: "todo" as const, storyPoints: 5 },
  ];

  const createdWebIssues: { id: string; issueNumber: number }[] = [];
  for (let i = 0; i < webIssues.length; i++) {
    const [created] = await db.insert(issues).values({
      projectId: proj1.id,
      issueNumber: i + 1,
      ...webIssues[i],
      reporterId: DEV_USER_ID,
      sortOrder: i,
    }).returning();
    createdWebIssues.push(created);
  }

  // MOB Issues: issues 0-3 go into active sprint (mobSprint1)
  const mobIssues = [
    { title: "Set up React Native project", type: "task" as const, priority: "highest" as const, status: "done" as const, storyPoints: 3, sprintId: mobSprint1.id, assigneeId: DEV_USER_ID },
    { title: "Design onboarding screens", type: "story" as const, priority: "high" as const, status: "in_review" as const, storyPoints: 5, sprintId: mobSprint1.id, assigneeId: DEV_USER_ID },
    { title: "Implement push notifications", type: "story" as const, priority: "high" as const, status: "in_progress" as const, storyPoints: 8, sprintId: mobSprint1.id, assigneeId: DEV_USER_ID },
    { title: "App crashes on Android 12", type: "bug" as const, priority: "highest" as const, status: "todo" as const, storyPoints: 3, sprintId: mobSprint1.id, assigneeId: DEV_USER_ID },
    // Backlog
    { title: "Offline data sync", type: "epic" as const, priority: "high" as const, status: "backlog" as const, storyPoints: 13 },
  ];

  const createdMobIssues: { id: string; issueNumber: number }[] = [];
  for (let i = 0; i < mobIssues.length; i++) {
    const [created] = await db.insert(issues).values({
      projectId: proj2.id,
      issueNumber: i + 1,
      ...mobIssues[i],
      reporterId: DEV_USER_ID,
      sortOrder: i,
    }).returning();
    createdMobIssues.push(created);
  }

  // API Issues: issues 0-2 go into active sprint (apiSprint1)
  const apiIssues = [
    { title: "Design REST API schema", type: "task" as const, priority: "highest" as const, status: "done" as const, storyPoints: 5, sprintId: apiSprint1.id, assigneeId: DEV_USER_ID },
    { title: "Implement rate limiting", type: "story" as const, priority: "high" as const, status: "in_progress" as const, storyPoints: 5, sprintId: apiSprint1.id, assigneeId: DEV_USER_ID },
    { title: "Fix timeout on large queries", type: "bug" as const, priority: "high" as const, status: "in_review" as const, storyPoints: 3, sprintId: apiSprint1.id, assigneeId: DEV_USER_ID },
    // Backlog
    { title: "Add GraphQL endpoint", type: "epic" as const, priority: "medium" as const, status: "todo" as const, storyPoints: 13 },
  ];

  const createdApiIssues: { id: string; issueNumber: number }[] = [];
  for (let i = 0; i < apiIssues.length; i++) {
    const [created] = await db.insert(issues).values({
      projectId: proj3.id,
      issueNumber: i + 1,
      ...apiIssues[i],
      reporterId: DEV_USER_ID,
      sortOrder: i,
    }).returning();
    createdApiIssues.push(created);
  }

  // ── Assign Labels to Issues ─────────────────────────────────────────
  const issueLabelAssignments = [
    // WEB: "Design new homepage hero section" -> frontend, design
    { issueId: createdWebIssues[0].id, labelId: labelMap[proj1.id]["frontend"] },
    { issueId: createdWebIssues[0].id, labelId: labelMap[proj1.id]["design"] },
    // WEB: "Implement responsive navigation bar" -> frontend
    { issueId: createdWebIssues[1].id, labelId: labelMap[proj1.id]["frontend"] },
    // WEB: "Fix broken image loading on Safari" -> frontend, urgent
    { issueId: createdWebIssues[2].id, labelId: labelMap[proj1.id]["frontend"] },
    { issueId: createdWebIssues[2].id, labelId: labelMap[proj1.id]["urgent"] },
    // WEB: "Add dark mode support" -> frontend, design
    { issueId: createdWebIssues[3].id, labelId: labelMap[proj1.id]["frontend"] },
    { issueId: createdWebIssues[3].id, labelId: labelMap[proj1.id]["design"] },
    // WEB: "Optimize page load performance" -> backend
    { issueId: createdWebIssues[4].id, labelId: labelMap[proj1.id]["backend"] },
    // WEB: "User authentication flow" -> backend, urgent
    { issueId: createdWebIssues[7].id, labelId: labelMap[proj1.id]["backend"] },
    { issueId: createdWebIssues[7].id, labelId: labelMap[proj1.id]["urgent"] },
    // WEB: "Contact form validation bug" -> frontend
    { issueId: createdWebIssues[8].id, labelId: labelMap[proj1.id]["frontend"] },

    // MOB: "Design onboarding screens" -> ios, android
    { issueId: createdMobIssues[1].id, labelId: labelMap[proj2.id]["ios"] },
    { issueId: createdMobIssues[1].id, labelId: labelMap[proj2.id]["android"] },
    // MOB: "Implement push notifications" -> ios, android
    { issueId: createdMobIssues[2].id, labelId: labelMap[proj2.id]["ios"] },
    { issueId: createdMobIssues[2].id, labelId: labelMap[proj2.id]["android"] },
    // MOB: "App crashes on Android 12" -> android, urgent
    { issueId: createdMobIssues[3].id, labelId: labelMap[proj2.id]["android"] },
    { issueId: createdMobIssues[3].id, labelId: labelMap[proj2.id]["urgent"] },
    // MOB: "Offline data sync" -> performance
    { issueId: createdMobIssues[4].id, labelId: labelMap[proj2.id]["performance"] },

    // API: "Implement rate limiting" -> backend, performance
    { issueId: createdApiIssues[1].id, labelId: labelMap[proj3.id]["backend"] },
    { issueId: createdApiIssues[1].id, labelId: labelMap[proj3.id]["performance"] },
    // API: "Fix timeout on large queries" -> backend, urgent
    { issueId: createdApiIssues[2].id, labelId: labelMap[proj3.id]["backend"] },
    { issueId: createdApiIssues[2].id, labelId: labelMap[proj3.id]["urgent"] },
    // API: "Add GraphQL endpoint" -> documentation
    { issueId: createdApiIssues[3].id, labelId: labelMap[proj3.id]["documentation"] },
  ];

  for (const assignment of issueLabelAssignments) {
    await db.insert(issueLabels).values(assignment);
  }

  console.log("Seeding complete!");
  console.log(`  - 3 projects`);
  console.log(`  - 3 project memberships`);
  console.log(`  - ${Object.values(labelDefs).flat().length} labels`);
  console.log(`  - 6 sprints (3 active, 3 planning)`);
  console.log(`  - 6 versions (3 released, 3 unreleased)`);
  console.log(`  - 8 components`);
  console.log(`  - ${webIssues.length + mobIssues.length + apiIssues.length} issues`);
  console.log(`  - ${issueLabelAssignments.length} issue-label associations`);
}
