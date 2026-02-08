import { Badge } from "@/components/ui/badge";
import { SPRINT_STATUSES } from "@/lib/constants";
import type { Sprint } from "@shared/schema";
import type { SprintStatus } from "@/lib/constants";

interface SprintBadgeProps {
  sprint: Sprint;
}

export function SprintBadge({ sprint }: SprintBadgeProps) {
  const statusInfo = SPRINT_STATUSES[sprint.status as SprintStatus];
  const color = statusInfo?.color || "#6B778C";

  return (
    <Badge variant="outline" className="gap-1.5 text-xs font-medium">
      <div
        className="h-2 w-2 rounded-full shrink-0"
        style={{ backgroundColor: color }}
      />
      {sprint.name}
    </Badge>
  );
}
