import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRoute, useLocation } from "wouter";
import { Plus, Layers } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { PriorityIcon } from "@/components/priority-icon";
import { UserAvatar } from "@/components/user-avatar";
import { StatusBadge } from "@/components/status-badge";
import { CreateIssueDialog } from "@/components/create-issue-dialog";
import { IssueDetailSheet } from "@/components/issue-detail-sheet";
import type { Issue, Project } from "@shared/schema";
import type { User } from "@shared/models/auth";
import type { Priority, Status } from "@/lib/constants";

export default function EpicBoard() {
  const [, params] = useRoute("/project/:projectId/epics");
  const projectId = params?.projectId || "";
  const [, setLocation] = useLocation();

  const [createOpen, setCreateOpen] = useState(false);
  const [selectedIssue, setSelectedIssue] = useState<Issue | null>(null);

  const { data: project, isLoading: projectLoading } = useQuery<Project>({
    queryKey: ["/api/projects", projectId],
    enabled: !!projectId,
  });

  const { data: issues = [], isLoading: issuesLoading } = useQuery<Issue[]>({
    queryKey: ["/api/projects", projectId, "issues"],
    enabled: !!projectId,
  });

  const { data: users = [] } = useQuery<User[]>({
    queryKey: ["/api/users"],
  });

  const epics = issues.filter((i) => i.type === "epic");

  const getChildProgress = (epicId: string) => {
    const children = issues.filter((i) => i.parentId === epicId);
    if (children.length === 0) return { done: 0, total: 0, pct: 0 };
    const done = children.filter((i) => i.status === "done").length;
    return { done, total: children.length, pct: Math.round((done / children.length) * 100) };
  };

  if (projectLoading || issuesLoading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-8 w-48" />
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-36" />
          ))}
        </div>
      </div>
    );
  }

  if (!project) return null;

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between gap-4 px-6 py-4 border-b flex-wrap">
        <div>
          <h1 className="text-xl font-semibold">{project.name} Epics</h1>
          <p className="text-sm text-muted-foreground">
            {epics.length} epic{epics.length !== 1 ? "s" : ""}
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)} className="gap-1.5">
          <Plus className="h-4 w-4" /> Create Epic
        </Button>
      </div>

      <div className="flex-1 overflow-auto p-6">
        {epics.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-4 text-center">
            <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center">
              <Layers className="h-8 w-8 text-muted-foreground" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">No epics yet</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Create an epic to organize your work into large features.
              </p>
            </div>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {epics.map((epic) => {
              const assignee = users.find((u) => u.id === epic.assigneeId);
              const { done, total, pct } = getChildProgress(epic.id);

              return (
                <Card
                  key={epic.id}
                  className="p-4 space-y-3 cursor-pointer hover-elevate active-elevate-2"
                  onClick={() => setSelectedIssue(epic)}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1 space-y-1">
                      <p className="text-sm font-semibold leading-snug line-clamp-2">
                        {epic.title}
                      </p>
                      <span className="text-xs text-muted-foreground font-medium">
                        {project.key}-{epic.issueNumber}
                      </span>
                    </div>
                    {assignee && (
                      <UserAvatar
                        firstName={assignee.firstName}
                        lastName={assignee.lastName}
                        imageUrl={assignee.profileImageUrl}
                        size="sm"
                      />
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <StatusBadge status={epic.status as Status} />
                    <PriorityIcon priority={epic.priority as Priority} className="h-3.5 w-3.5" />
                  </div>

                  {total > 0 ? (
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>Progress</span>
                        <span>
                          {done}/{total} done ({pct}%)
                        </span>
                      </div>
                      <Progress value={pct} className="h-2" />
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground">No child issues</p>
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </div>

      <CreateIssueDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        projectId={projectId}
        defaultStatus="todo"
      />

      <IssueDetailSheet
        issue={selectedIssue}
        project={project}
        users={users}
        onClose={() => setSelectedIssue(null)}
      />
    </div>
  );
}
