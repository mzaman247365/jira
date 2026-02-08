import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRoute } from "wouter";
import { Map, Calendar } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/status-badge";
import { STATUSES, type Status } from "@/lib/constants";
import type { Issue, Project } from "@shared/schema";

export default function Roadmap() {
  const [, params] = useRoute("/project/:projectId/roadmap");
  const projectId = params?.projectId || "";

  const { data: project, isLoading: projectLoading } = useQuery<Project>({
    queryKey: ["/api/projects", projectId],
    enabled: !!projectId,
  });

  const { data: issues = [], isLoading: issuesLoading } = useQuery<Issue[]>({
    queryKey: ["/api/projects", projectId, "issues"],
    enabled: !!projectId,
  });

  const epics = issues.filter((i) => i.type === "epic");

  // Timeline: 3 months around current date
  const timelineRange = useMemo(() => {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 2, 0);
    return { start, end, totalDays: Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) };
  }, []);

  // Build month labels
  const months = useMemo(() => {
    const result: { label: string; widthPct: number }[] = [];
    const { start, end, totalDays } = timelineRange;
    let cursor = new Date(start);

    while (cursor < end) {
      const monthStart = new Date(cursor);
      const monthEnd = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0);
      const effectiveEnd = monthEnd > end ? end : monthEnd;
      const effectiveStart = monthStart < start ? start : monthStart;
      const days = Math.ceil((effectiveEnd.getTime() - effectiveStart.getTime()) / (1000 * 60 * 60 * 24)) + 1;
      const widthPct = (days / totalDays) * 100;

      result.push({
        label: cursor.toLocaleDateString("en-US", { month: "short", year: "numeric" }),
        widthPct,
      });

      cursor = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1);
    }

    return result;
  }, [timelineRange]);

  const getBarPosition = (startDate: string | Date | null | undefined, dueDate: string | Date | null | undefined) => {
    const { start: rangeStart, totalDays } = timelineRange;

    if (!startDate && !dueDate) {
      return null; // unscheduled
    }

    const effectiveStart = startDate ? new Date(startDate) : new Date();
    const effectiveEnd = dueDate ? new Date(dueDate) : new Date(effectiveStart.getTime() + 14 * 24 * 60 * 60 * 1000);

    const startOffset = Math.max(0, (effectiveStart.getTime() - rangeStart.getTime()) / (1000 * 60 * 60 * 24));
    const endOffset = Math.min(totalDays, (effectiveEnd.getTime() - rangeStart.getTime()) / (1000 * 60 * 60 * 24));

    const leftPct = (startOffset / totalDays) * 100;
    const widthPct = Math.max(2, ((endOffset - startOffset) / totalDays) * 100);

    return { leftPct, widthPct };
  };

  const getEpicChildProgress = (epicId: string) => {
    const children = issues.filter((i) => i.parentId === epicId);
    if (children.length === 0) return { done: 0, total: 0 };
    const done = children.filter((i) => i.status === "done").length;
    return { done, total: children.length };
  };

  const getStatusColor = (status: string) => {
    const s = STATUSES[status as Status];
    return s?.color || "#6B778C";
  };

  if (projectLoading || issuesLoading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-12 w-full" />
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    );
  }

  if (!project) return null;

  // Today marker position
  const todayPct = (() => {
    const { start, totalDays } = timelineRange;
    const now = new Date();
    const offset = (now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24);
    return (offset / totalDays) * 100;
  })();

  return (
    <div className="flex flex-col h-full">
      <div className="px-6 py-4 border-b">
        <h1 className="text-xl font-semibold">{project.name} Roadmap</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          {epics.length} epic{epics.length !== 1 ? "s" : ""} on the timeline
        </p>
      </div>

      <div className="flex-1 overflow-auto">
        {epics.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-4 text-center">
            <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center">
              <Map className="h-8 w-8 text-muted-foreground" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">No epics yet</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Create epics to see them on the roadmap timeline.
              </p>
            </div>
          </div>
        ) : (
          <div className="min-w-[800px]">
            {/* Month Headers */}
            <div className="flex border-b sticky top-0 z-10 bg-background">
              <div className="w-72 flex-shrink-0 px-4 py-2 border-r font-medium text-sm text-muted-foreground">
                Epic
              </div>
              <div className="flex-1 flex">
                {months.map((month, i) => (
                  <div
                    key={i}
                    className="text-xs font-medium text-muted-foreground px-2 py-2 border-r"
                    style={{ width: `${month.widthPct}%` }}
                  >
                    {month.label}
                  </div>
                ))}
              </div>
            </div>

            {/* Epic Rows */}
            {epics.map((epic) => {
              const bar = getBarPosition(epic.startDate, epic.dueDate);
              const { done, total } = getEpicChildProgress(epic.id);
              const statusColor = getStatusColor(epic.status);

              return (
                <div key={epic.id} className="flex border-b hover:bg-muted/30 transition-colors">
                  {/* Left Column */}
                  <div className="w-72 flex-shrink-0 px-4 py-3 border-r space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium truncate">{epic.title}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <StatusBadge status={epic.status as Status} />
                      {total > 0 && (
                        <span className="text-xs text-muted-foreground">
                          {done}/{total} done
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Timeline Column */}
                  <div className="flex-1 relative py-3 px-2">
                    {/* Today marker */}
                    {todayPct >= 0 && todayPct <= 100 && (
                      <div
                        className="absolute top-0 bottom-0 w-px bg-red-400 z-10"
                        style={{ left: `${todayPct}%` }}
                      />
                    )}

                    {bar ? (
                      <div className="relative h-8">
                        <div
                          className="absolute top-0 h-full rounded-md flex items-center px-2"
                          style={{
                            left: `${bar.leftPct}%`,
                            width: `${bar.widthPct}%`,
                            backgroundColor: statusColor,
                            opacity: 0.85,
                          }}
                        >
                          {bar.widthPct > 10 && (
                            <span className="text-xs text-white font-medium truncate">
                              {epic.title}
                            </span>
                          )}
                        </div>
                        {total > 0 && (
                          <div
                            className="absolute bottom-[-4px] h-1 rounded-full bg-green-500/60"
                            style={{
                              left: `${bar.leftPct}%`,
                              width: `${bar.widthPct * (done / total)}%`,
                            }}
                          />
                        )}
                      </div>
                    ) : (
                      <div className="relative h-8">
                        <div className="absolute top-0 left-0 right-0 h-full rounded-md bg-muted/50 flex items-center px-2">
                          <span className="text-xs text-muted-foreground italic flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            Unscheduled
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
