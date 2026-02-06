export const ISSUE_TYPES = {
  epic: { label: "Epic", color: "#904EE2" },
  story: { label: "Story", color: "#63BA3C" },
  task: { label: "Task", color: "#4BADE8" },
  bug: { label: "Bug", color: "#E5493A" },
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

export type IssueType = keyof typeof ISSUE_TYPES;
export type Priority = keyof typeof PRIORITIES;
export type Status = keyof typeof STATUSES;
