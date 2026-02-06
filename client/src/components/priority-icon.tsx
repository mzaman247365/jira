import { ArrowUp, ArrowDown, Minus, ChevronUp, ChevronDown } from "lucide-react";
import { PRIORITIES, type Priority } from "@/lib/constants";

const iconMap = {
  highest: ArrowUp,
  high: ChevronUp,
  medium: Minus,
  low: ChevronDown,
  lowest: ArrowDown,
};

export function PriorityIcon({ priority, className = "h-4 w-4" }: { priority: Priority; className?: string }) {
  const Icon = iconMap[priority];
  const color = PRIORITIES[priority].color;
  return <Icon className={className} style={{ color }} />;
}
