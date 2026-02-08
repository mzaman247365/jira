import { Button } from "@/components/ui/button";
import { formatDuration } from "@/lib/time-utils";
import { Clock, Timer } from "lucide-react";
import type { Issue } from "@shared/schema";

interface TimeTrackingSectionProps {
  issue: Issue;
  onLogWork: () => void;
}

export function TimeTrackingSection({ issue, onLogWork }: TimeTrackingSectionProps) {
  const estimate = issue.originalEstimate ?? 0;
  const spent = issue.timeSpent ?? 0;
  const remaining = issue.timeRemaining ?? Math.max(0, estimate - spent);

  const total = estimate > 0 ? estimate : spent;
  const spentPercent = total > 0 ? Math.min((spent / total) * 100, 100) : 0;
  const remainingPercent =
    estimate > 0 ? Math.min((remaining / total) * 100, 100 - spentPercent) : 0;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">Time Tracking</span>
        </div>
        <Button variant="outline" size="sm" onClick={onLogWork} className="gap-1.5">
          <Timer className="h-3.5 w-3.5" />
          Log Work
        </Button>
      </div>

      {/* Progress bar */}
      <div className="space-y-1.5">
        <div className="h-2 w-full rounded-full bg-muted overflow-hidden flex">
          {spentPercent > 0 && (
            <div
              className="h-full bg-blue-500 transition-all duration-300"
              style={{ width: `${spentPercent}%` }}
            />
          )}
          {remainingPercent > 0 && (
            <div
              className="h-full bg-green-500 transition-all duration-300"
              style={{ width: `${remainingPercent}%` }}
            />
          )}
        </div>

        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <span className="inline-block h-2 w-2 rounded-full bg-blue-500" />
              Logged: {formatDuration(spent)}
            </span>
            {estimate > 0 && (
              <span className="flex items-center gap-1">
                <span className="inline-block h-2 w-2 rounded-full bg-green-500" />
                Remaining: {formatDuration(remaining)}
              </span>
            )}
          </div>
        </div>

        {estimate > 0 && (
          <p className="text-xs text-muted-foreground">
            Original Estimate: {formatDuration(estimate)}
          </p>
        )}
        {estimate === 0 && spent > 0 && (
          <p className="text-xs text-muted-foreground">
            No estimate set
          </p>
        )}
      </div>
    </div>
  );
}
