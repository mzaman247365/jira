export const ISSUE_TYPES = {
  epic: { label: "Epic", color: "#904EE2" },
  story: { label: "Story", color: "#63BA3C" },
  task: { label: "Task", color: "#4BADE8" },
  bug: { label: "Bug", color: "#E5493A" },
  sub_task: { label: "Sub-task", color: "#8993A4" },
} as const;

export const PRIORITIES = {
  highest: { label: "Highest", color: "#CD1317" },
  high: { label: "High", color: "#E97F33" },
  medium: { label: "Medium", color: "#E2B203" },
  low: { label: "Low", color: "#2D8738" },
  lowest: { label: "Lowest", color: "#57A55A" },
} as const;

export const STATUSES = {
  backlog: { label: "Backlog", color: "#6B778C" },
  todo: { label: "To Do", color: "#4BADE8" },
  in_progress: { label: "In Progress", color: "#0052CC" },
  in_review: { label: "In Review", color: "#FF991F" },
  done: { label: "Done", color: "#36B37E" },
} as const;

export const STATUS_COLUMNS = ["todo", "in_progress", "in_review", "done"] as const;

export const PROJECT_COLORS = [
  "#4C9AFF", "#00C7E6", "#36B37E", "#FF991F",
  "#FF5630", "#6554C0", "#00875A", "#0065FF",
] as const;

export const LINK_TYPES = {
  blocks: { label: "blocks", inverse: "is blocked by" },
  is_blocked_by: { label: "is blocked by", inverse: "blocks" },
  duplicates: { label: "duplicates", inverse: "is duplicated by" },
  is_duplicated_by: { label: "is duplicated by", inverse: "duplicates" },
  clones: { label: "clones", inverse: "is cloned by" },
  is_cloned_by: { label: "is cloned by", inverse: "clones" },
  relates_to: { label: "relates to", inverse: "relates to" },
} as const;

export const SPRINT_STATUSES = {
  planning: { label: "Planning", color: "#6B778C" },
  active: { label: "Active", color: "#0052CC" },
  completed: { label: "Completed", color: "#36B37E" },
} as const;

export const VERSION_STATUSES = {
  unreleased: { label: "Unreleased", color: "#6B778C" },
  released: { label: "Released", color: "#36B37E" },
  archived: { label: "Archived", color: "#FF991F" },
} as const;

export const PROJECT_ROLES = {
  admin: { label: "Admin", description: "Full access to everything" },
  project_admin: { label: "Project Admin", description: "Manage project settings and members" },
  member: { label: "Member", description: "Create and edit issues" },
  viewer: { label: "Viewer", description: "Read-only access" },
} as const;

export const LABEL_COLORS = [
  "#6B778C", "#4C9AFF", "#00C7E6", "#36B37E", "#FF991F",
  "#FF5630", "#6554C0", "#00875A", "#0065FF", "#904EE2",
  "#E5493A", "#E97F33", "#E2B203", "#2D8738", "#57A55A",
] as const;

export type IssueType = keyof typeof ISSUE_TYPES;
export type Priority = keyof typeof PRIORITIES;
export type Status = keyof typeof STATUSES;
export type LinkType = keyof typeof LINK_TYPES;
export type SprintStatus = keyof typeof SPRINT_STATUSES;
export type VersionStatus = keyof typeof VERSION_STATUSES;
export type ProjectRole = keyof typeof PROJECT_ROLES;
