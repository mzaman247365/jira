import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { UserAvatar } from "@/components/user-avatar";
import { STATUSES, PRIORITIES, ISSUE_TYPES } from "@/lib/constants";
import type { Comment, ActivityLog } from "@shared/schema";
import type { User } from "@shared/models/auth";

interface ActivityFeedProps {
  issueId: string;
  comments: Comment[];
  users: User[];
}

type TimelineEntry =
  | { kind: "activity"; data: ActivityLog }
  | { kind: "comment"; data: Comment };

function formatFieldValue(field: string | null, value: string | null | undefined): string {
  if (!value) return "none";
  if (field === "status") {
    return STATUSES[value as keyof typeof STATUSES]?.label ?? value;
  }
  if (field === "priority") {
    return PRIORITIES[value as keyof typeof PRIORITIES]?.label ?? value;
  }
  if (field === "type") {
    return ISSUE_TYPES[value as keyof typeof ISSUE_TYPES]?.label ?? value;
  }
  return value;
}

function timeAgo(date: string | Date | null | undefined): string {
  if (!date) return "";
  const now = Date.now();
  const then = new Date(date).getTime();
  const seconds = Math.floor((now - then) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(date).toLocaleDateString();
}

export function ActivityFeed({ issueId, comments, users }: ActivityFeedProps) {
  const { data: activity = [] } = useQuery<ActivityLog[]>({
    queryKey: ["/api/issues", issueId, "activity"],
    enabled: !!issueId,
  });

  const timeline = useMemo<TimelineEntry[]>(() => {
    const entries: TimelineEntry[] = [
      ...activity.map((a) => ({ kind: "activity" as const, data: a })),
      ...comments.map((c) => ({ kind: "comment" as const, data: c })),
    ];
    entries.sort((a, b) => {
      const aDate = new Date(a.data.createdAt ?? 0).getTime();
      const bDate = new Date(b.data.createdAt ?? 0).getTime();
      return aDate - bDate;
    });
    return entries;
  }, [activity, comments]);

  const findUser = (userId: string | null | undefined): User | undefined =>
    users.find((u) => u.id === userId);

  if (timeline.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-4">No activity yet.</p>
    );
  }

  return (
    <div className="relative">
      {/* Vertical timeline line */}
      <div className="absolute left-[13px] top-2 bottom-2 w-px bg-border" />

      <div className="space-y-4">
        {timeline.map((entry) => {
          if (entry.kind === "activity") {
            const act = entry.data;
            const author = findUser(act.userId);
            return (
              <div key={`activity-${act.id}`} className="flex gap-3 relative">
                <div className="relative z-10 flex-shrink-0 mt-1">
                  <div className="h-[10px] w-[10px] rounded-full bg-muted-foreground/40 ring-2 ring-background ml-[8px]" />
                </div>
                <div className="flex-1 min-w-0 pt-0">
                  <p className="text-sm">
                    <span className="font-medium">
                      {author ? `${author.firstName} ${author.lastName}` : "Someone"}
                    </span>{" "}
                    changed{" "}
                    <span className="font-medium">{act.field}</span>{" "}
                    from{" "}
                    <span className="text-muted-foreground line-through">
                      {formatFieldValue(act.field, act.oldValue)}
                    </span>{" "}
                    to{" "}
                    <span className="font-medium">
                      {formatFieldValue(act.field, act.newValue)}
                    </span>
                  </p>
                  <span className="text-xs text-muted-foreground">
                    {timeAgo(act.createdAt)}
                  </span>
                </div>
              </div>
            );
          }

          const comment = entry.data;
          const author = findUser(comment.authorId);
          return (
            <div key={`comment-${comment.id}`} className="flex gap-3 relative">
              <div className="relative z-10 flex-shrink-0">
                <UserAvatar
                  firstName={author?.firstName}
                  lastName={author?.lastName}
                  imageUrl={author?.profileImageUrl}
                  size="sm"
                />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-medium">
                    {author ? `${author.firstName} ${author.lastName}` : "Unknown"}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {timeAgo(comment.createdAt)}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground mt-0.5 whitespace-pre-wrap">
                  {comment.content}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
