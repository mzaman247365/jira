# ProjectFlow - Jira Clone

## Overview
A full-featured project management application inspired by Atlassian Jira. Supports Kanban board, backlog view, issue tracking with types/priorities/statuses, comments, and team collaboration. Authentication via Replit Auth (supports Google, Apple, Microsoft, GitHub, email).

## Architecture
- **Frontend**: React + TypeScript + Vite + Tailwind CSS + shadcn/ui + wouter routing
- **Backend**: Express.js + Drizzle ORM + PostgreSQL
- **Auth**: Replit Auth (OpenID Connect) via `server/replit_integrations/auth/`

## Key Files
- `shared/schema.ts` - All Drizzle schemas (projects, issues, comments) + re-exports auth models
- `shared/models/auth.ts` - Auth-related schemas (users, sessions)
- `server/routes.ts` - All API endpoints with auth middleware
- `server/storage.ts` - DatabaseStorage class for all CRUD operations
- `server/seed.ts` - Seed data for 3 demo projects with issues
- `server/db.ts` - Database connection setup
- `client/src/App.tsx` - Main app with auth-aware routing (Landing vs AuthenticatedApp)
- `client/src/components/app-sidebar.tsx` - Sidebar navigation with projects list
- `client/src/pages/board.tsx` - Kanban board with drag-and-drop
- `client/src/pages/backlog.tsx` - Table/list view of all issues
- `client/src/pages/dashboard.tsx` - Overview of projects and recent issues
- `client/src/pages/project-settings.tsx` - Project configuration
- `client/src/components/issue-detail-sheet.tsx` - Issue detail panel with comments

## API Endpoints
- `GET/POST /api/projects` - List/create projects
- `GET/PATCH/DELETE /api/projects/:id` - Single project CRUD
- `GET/POST /api/projects/:projectId/issues` - List/create issues for a project
- `PATCH/DELETE /api/issues/:id` - Update/delete an issue
- `GET /api/issues/recent` - Recent issues across all projects
- `GET/POST /api/issues/:issueId/comments` - List/create comments
- `GET /api/users` - List all users
- `GET /api/auth/user` - Current authenticated user

## Data Models
- **Project**: id, name, key (unique), description, leadId, avatarColor
- **Issue**: id, projectId, issueNumber, title, description, type (epic/story/task/bug), priority, status (backlog/todo/in_progress/in_review/done), assigneeId, reporterId, storyPoints, sortOrder
- **Comment**: id, issueId, authorId, content

## User Preferences
- Dark mode support with theme toggle
- Font: Open Sans
