import { Card } from "@/components/ui/card";
import { IssueTypeIcon } from "@/components/issue-type-icon";
import { PriorityIcon } from "@/components/priority-icon";
import { UserAvatar } from "@/components/user-avatar";
import type { Issue, Project } from "@shared/schema";
import type { User } from "@shared/models/auth";
import type { IssueType, Priority } from "@/lib/constants";

interface IssueCardProps {
  issue: Issue;
  project: Project;
  users?: User[];
  onClick?: () => void;
}

export function IssueCard({ issue, project, users = [], onClick }: IssueCardProps) {
  const assignee = users.find((u) => u.id === issue.assigneeId);
  const issueKey = `${project.key}-${issue.issueNumber}`;

  return (
    <Card
      className="p-3 cursor-pointer hover-elevate active-elevate-2 space-y-2.5"
      onClick={onClick}
      data-testid={`card-issue-${issue.id}`}
    >
      <p className="text-sm font-medium leading-snug line-clamp-2" data-testid={`text-issue-title-${issue.id}`}>
        {issue.title}
      </p>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <IssueTypeIcon type={issue.type as IssueType} className="h-3.5 w-3.5" />
          <span className="text-xs text-muted-foreground font-medium" data-testid={`text-issue-key-${issue.id}`}>
            {issueKey}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <PriorityIcon priority={issue.priority as Priority} className="h-3.5 w-3.5" />
          {issue.storyPoints != null && (
            <span className="text-[10px] bg-muted text-muted-foreground rounded-full h-5 w-5 flex items-center justify-center font-medium">
              {issue.storyPoints}
            </span>
          )}
          {assignee && (
            <UserAvatar
              firstName={assignee.firstName}
              lastName={assignee.lastName}
              imageUrl={assignee.profileImageUrl}
              size="sm"
            />
          )}
        </div>
      </div>
    </Card>
  );
}
