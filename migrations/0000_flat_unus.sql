CREATE TYPE "public"."issue_type" AS ENUM('epic', 'story', 'task', 'bug', 'sub_task');--> statement-breakpoint
CREATE TYPE "public"."link_type" AS ENUM('blocks', 'is_blocked_by', 'duplicates', 'is_duplicated_by', 'clones', 'is_cloned_by', 'relates_to');--> statement-breakpoint
CREATE TYPE "public"."priority" AS ENUM('highest', 'high', 'medium', 'low', 'lowest');--> statement-breakpoint
CREATE TYPE "public"."project_role" AS ENUM('admin', 'project_admin', 'member', 'viewer');--> statement-breakpoint
CREATE TYPE "public"."sprint_status" AS ENUM('planning', 'active', 'completed');--> statement-breakpoint
CREATE TYPE "public"."status" AS ENUM('backlog', 'todo', 'in_progress', 'in_review', 'done');--> statement-breakpoint
CREATE TYPE "public"."version_status" AS ENUM('unreleased', 'released', 'archived');--> statement-breakpoint
CREATE TABLE "activity_log" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"issue_id" varchar NOT NULL,
	"user_id" varchar NOT NULL,
	"action" text NOT NULL,
	"field" text,
	"old_value" text,
	"new_value" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "attachments" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"issue_id" varchar NOT NULL,
	"user_id" varchar NOT NULL,
	"filename" text NOT NULL,
	"mime_type" text,
	"size" integer,
	"data" text NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "board_configs" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" varchar NOT NULL,
	"swimlane_by" varchar DEFAULT 'none',
	"wip_limits" jsonb,
	"quick_filters" jsonb,
	"column_order" jsonb,
	CONSTRAINT "board_configs_project_id_unique" UNIQUE("project_id")
);
--> statement-breakpoint
CREATE TABLE "comments" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"issue_id" varchar NOT NULL,
	"author_id" varchar NOT NULL,
	"content" text NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "components" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" varchar NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"lead_id" varchar
);
--> statement-breakpoint
CREATE TABLE "dashboard_gadgets" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"type" text NOT NULL,
	"position" integer DEFAULT 0,
	"config" jsonb
);
--> statement-breakpoint
CREATE TABLE "favorites" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"project_id" varchar,
	"issue_id" varchar,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "issue_components" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"issue_id" varchar NOT NULL,
	"component_id" varchar NOT NULL
);
--> statement-breakpoint
CREATE TABLE "issue_labels" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"issue_id" varchar NOT NULL,
	"label_id" varchar NOT NULL
);
--> statement-breakpoint
CREATE TABLE "issue_links" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"source_issue_id" varchar NOT NULL,
	"target_issue_id" varchar NOT NULL,
	"link_type" "link_type" NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "issues" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" varchar NOT NULL,
	"issue_number" integer NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"type" "issue_type" DEFAULT 'task' NOT NULL,
	"priority" "priority" DEFAULT 'medium' NOT NULL,
	"status" "status" DEFAULT 'todo' NOT NULL,
	"assignee_id" varchar,
	"reporter_id" varchar,
	"parent_id" varchar,
	"story_points" integer,
	"sort_order" integer DEFAULT 0,
	"sprint_id" varchar,
	"fix_version_id" varchar,
	"affects_version_id" varchar,
	"original_estimate" integer,
	"time_spent" integer,
	"time_remaining" integer,
	"start_date" timestamp,
	"due_date" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "labels" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" varchar NOT NULL,
	"name" text NOT NULL,
	"color" varchar DEFAULT '#6B778C'
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"issue_id" varchar,
	"type" text NOT NULL,
	"title" text NOT NULL,
	"message" text,
	"is_read" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "project_members" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" varchar NOT NULL,
	"user_id" varchar NOT NULL,
	"role" "project_role" DEFAULT 'member' NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "projects" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"key" varchar(10) NOT NULL,
	"description" text,
	"lead_id" varchar,
	"avatar_color" varchar DEFAULT '#4C9AFF',
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "projects_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE "saved_filters" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"project_id" varchar,
	"name" text NOT NULL,
	"filter_json" jsonb NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "sprint_snapshots" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"sprint_id" varchar NOT NULL,
	"date" timestamp NOT NULL,
	"total_points" integer DEFAULT 0,
	"remaining_points" integer DEFAULT 0,
	"completed_points" integer DEFAULT 0,
	"issue_count" integer DEFAULT 0,
	"completed_issue_count" integer DEFAULT 0
);
--> statement-breakpoint
CREATE TABLE "sprints" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" varchar NOT NULL,
	"name" text NOT NULL,
	"goal" text,
	"status" "sprint_status" DEFAULT 'planning' NOT NULL,
	"start_date" timestamp,
	"end_date" timestamp,
	"completed_at" timestamp,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "status_snapshots" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" varchar NOT NULL,
	"date" timestamp NOT NULL,
	"status_counts" jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "versions" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" varchar NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"status" "version_status" DEFAULT 'unreleased' NOT NULL,
	"start_date" timestamp,
	"release_date" timestamp,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "watchers" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"issue_id" varchar NOT NULL,
	"user_id" varchar NOT NULL
);
--> statement-breakpoint
CREATE TABLE "work_logs" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"issue_id" varchar NOT NULL,
	"user_id" varchar NOT NULL,
	"time_spent" integer NOT NULL,
	"description" text,
	"started_at" timestamp DEFAULT now(),
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "workflow_transitions" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workflow_id" varchar NOT NULL,
	"from_status" varchar NOT NULL,
	"to_status" varchar NOT NULL,
	"name" text
);
--> statement-breakpoint
CREATE TABLE "workflows" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" varchar NOT NULL,
	"name" text DEFAULT 'Default Workflow' NOT NULL,
	"statuses" jsonb,
	CONSTRAINT "workflows_project_id_unique" UNIQUE("project_id")
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"sid" varchar PRIMARY KEY NOT NULL,
	"sess" jsonb NOT NULL,
	"expire" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar,
	"first_name" varchar,
	"last_name" varchar,
	"profile_image_url" varchar,
	"username" varchar,
	"password_hash" varchar,
	"auth_provider" varchar DEFAULT 'local',
	"is_admin" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "users_email_unique" UNIQUE("email"),
	CONSTRAINT "users_username_unique" UNIQUE("username")
);
--> statement-breakpoint
CREATE UNIQUE INDEX "issue_component_unique" ON "issue_components" USING btree ("issue_id","component_id");--> statement-breakpoint
CREATE UNIQUE INDEX "issue_label_unique" ON "issue_labels" USING btree ("issue_id","label_id");--> statement-breakpoint
CREATE UNIQUE INDEX "project_member_unique" ON "project_members" USING btree ("project_id","user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "watcher_unique" ON "watchers" USING btree ("issue_id","user_id");--> statement-breakpoint
CREATE INDEX "IDX_session_expire" ON "sessions" USING btree ("expire");