import { STATUSES, type Status } from "@/lib/constants";
import { Badge } from "@/components/ui/badge";

export function StatusBadge({ status }: { status: Status }) {
  const { label, color } = STATUSES[status];
  return (
    <Badge
      className="text-white text-xs font-medium no-default-hover-elevate no-default-active-elevate"
      style={{ backgroundColor: color }}
      data-testid={`badge-status-${status}`}
    >
      {label}
    </Badge>
  );
}
