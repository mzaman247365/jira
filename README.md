# ProjectFlow

A full-featured project management application inspired by Atlassian Jira, built with React, Express, and PostgreSQL.

## Features

### Issue Tracking
- **Issue Types**: Epic, Story, Task, Bug, Sub-task
- **Priorities**: Highest, High, Medium, Low, Lowest
- **Statuses**: Backlog, Todo, In Progress, In Review, Done
- **Sub-tasks**: Nested child issues with parent linking
- **Issue Linking**: Blocks, duplicates, clones, relates-to relationships
- **Labels & Components**: Tag and categorize issues
- **Attachments**: File uploads on issues
- **Time Tracking**: Estimates, work logs, and remaining time

### Boards & Views
- **Kanban Board**: Drag-and-drop columns by status
- **Sprint Board**: Scrum sprint planning and execution
- **Backlog**: List view with sprint sections and filtering
- **Epic Board**: Epics with child issue progress bars
- **Roadmap**: Timeline view of epics with start/due dates
- **My Work**: Personal view of assigned, reported, and watched issues

### Sprints & Releases
- **Sprint Management**: Create, start, and complete sprints
- **Version Tracking**: Unreleased, released, and archived versions
- **Release Management**: Track fix versions and affected versions per issue

### Collaboration
- **Comments**: Threaded discussions on issues
- **Activity Log**: Full audit trail of all field changes
- **Watchers**: Subscribe to issue updates
- **Notifications**: In-app notification system with polling
- **Team Management**: Project members with role-based access

### Reports & Analytics
- **Burndown Chart**: Sprint progress over time
- **Velocity Chart**: Story points per sprint (committed vs completed)
- **Cumulative Flow Diagram**: Status distribution over time
- **Sprint Report**: Completed, incomplete, and removed issues per sprint

### Advanced Features
- **Global Search**: Cmd+K command palette across issues, projects, and comments
- **Advanced Filtering**: Multi-field search with saved filters
- **Favorites**: Star projects and issues for quick access
- **Board Configuration**: Swimlanes, WIP limits, quick filters, column ordering
- **Custom Workflows**: Define allowed status transitions per project
- **Bulk Operations**: Multi-select issues for batch updates
- **Keyboard Shortcuts**: Navigate and act without leaving the keyboard
- **Customizable Dashboard**: Configurable gadget-based home screen
- **Dark Mode**: Full theme support

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, TypeScript, Vite, Tailwind CSS |
| UI Components | shadcn/ui (Radix UI primitives) |
| Routing | Wouter |
| State Management | TanStack React Query |
| Forms | React Hook Form + Zod validation |
| Charts | Recharts |
| Backend | Express 5, TypeScript |
| ORM | Drizzle ORM |
| Database | PostgreSQL |
| Auth | Local auth (passport-local) / Replit Auth (OpenID Connect) |

## Getting Started

### Prerequisites

- Node.js 20+
- PostgreSQL database

### Setup

1. Clone the repository:
   ```bash
   git clone https://github.com/mzaman247365/jira.git
   cd jira
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env` file with your database connection:
   ```
   DATABASE_URL=postgresql://user:password@localhost:5432/projectflow
   ```

4. Apply the database schema:
   ```bash
   npx drizzle-kit push
   ```

5. Start the development server:
   ```bash
   PORT=3000 npm run dev
   ```

   The app will be available at `http://localhost:3000`.

> **Note**: On macOS, port 5000 is used by ControlCenter, so use port 3000 or another free port.

### Seed Data

The app automatically seeds demo data on first run, including 3 sample projects with issues, labels, sprints, versions, and components.

## Project Structure

```
├── client/
│   └── src/
│       ├── components/     # Reusable UI components
│       │   └── ui/         # shadcn/ui base components
│       ├── hooks/          # Custom React hooks
│       ├── lib/            # Utilities, constants, query client
│       ├── pages/          # Route page components
│       └── App.tsx         # Root app with routing
├── server/
│   ├── replit_integrations/
│   │   └── auth/           # Authentication (local + Replit)
│   ├── db.ts               # Database connection
│   ├── index.ts            # Express server entry point
│   ├── routes.ts           # All API routes
│   ├── seed.ts             # Database seeding
│   └── storage.ts          # Data access layer (IStorage interface)
├── shared/
│   ├── models/
│   │   └── auth.ts         # User & session schemas
│   └── schema.ts           # All Drizzle table definitions
├── scripts/
│   ├── reset-db.ts         # Drop and recreate all tables
│   ├── migrate.ts          # Run migrations
│   └── test-api.sh         # API test suite (194 tests)
├── migrations/             # SQL migration files
└── drizzle.config.ts       # Drizzle ORM configuration
```

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server with hot reload |
| `npm run build` | Build for production |
| `npm run start` | Run production build |
| `npm run check` | TypeScript type checking |
| `npm run db:push` | Push schema changes to database |
| `bash scripts/test-api.sh` | Run API test suite (requires dev server) |

## API Overview

The API is RESTful with JSON request/response bodies. All endpoints (except auth) require authentication.

### Core Resources
- `GET/POST /api/projects` — List and create projects
- `GET/PATCH/DELETE /api/projects/:id` — Project CRUD
- `GET/POST /api/projects/:projectId/issues` — Issues per project
- `PATCH/DELETE /api/issues/:id` — Issue CRUD

### Collaboration
- `GET/POST /api/issues/:issueId/comments` — Comments
- `GET /api/issues/:id/activity` — Activity log
- `GET/POST/DELETE /api/issues/:id/watch` — Watchers
- `GET /api/notifications` — User notifications

### Sprints & Versions
- `GET/POST /api/projects/:projectId/sprints` — Sprint CRUD
- `POST /api/sprints/:id/start` — Start a sprint
- `POST /api/sprints/:id/complete` — Complete a sprint
- `GET/POST /api/projects/:projectId/versions` — Version CRUD

### Search & Filtering
- `GET /api/search?q=` — Global search
- `GET /api/issues/search?type=&status=&priority=...` — Advanced search
- `GET/POST /api/me/saved-filters` — Saved filters

### Reports
- `GET /api/sprints/:id/burndown` — Burndown data
- `GET /api/projects/:projectId/velocity` — Velocity data
- `GET /api/projects/:projectId/cfd` — Cumulative flow data
- `GET /api/sprints/:id/report` — Sprint report

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Cmd+K` | Global search |
| `C` | Create issue |
| `/` | Focus search |
| `?` | Show shortcuts help |
| `G then D` | Go to dashboard |
| `G then B` | Go to board |
| `G then L` | Go to backlog |

## Testing

Run the comprehensive API test suite against a running dev server:

```bash
PORT=3000 npm run dev    # In one terminal
bash scripts/test-api.sh # In another terminal
```

The suite covers 194 tests across all endpoints including edge cases for SQL injection, Unicode handling, and special characters.

## License

MIT
