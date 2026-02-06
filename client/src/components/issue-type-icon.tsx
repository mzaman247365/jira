import { Bug, BookOpen, CheckSquare, Zap } from "lucide-react";
import { ISSUE_TYPES, type IssueType } from "@/lib/constants";

const iconMap = {
  epic: Zap,
  story: BookOpen,
  task: CheckSquare,
  bug: Bug,
};

export function IssueTypeIcon({ type, className = "h-4 w-4" }: { type: IssueType; className?: string }) {
  const Icon = iconMap[type];
  const color = ISSUE_TYPES[type].color;
  return <Icon className={className} style={{ color }} />;
}
