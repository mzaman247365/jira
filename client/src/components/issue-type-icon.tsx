import { Bug, BookOpen, CheckSquare, Zap, ListTree } from "lucide-react";
import { ISSUE_TYPES, type IssueType } from "@/lib/constants";

const iconMap: Record<IssueType, any> = {
  epic: Zap,
  story: BookOpen,
  task: CheckSquare,
  bug: Bug,
  sub_task: ListTree,
};

export function IssueTypeIcon({ type, className = "h-4 w-4" }: { type: IssueType; className?: string }) {
  const Icon = iconMap[type] || CheckSquare;
  const color = ISSUE_TYPES[type]?.color || "#4BADE8";
  return <Icon className={className} style={{ color }} />;
}
