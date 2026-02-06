import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useRoute } from "wouter";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { IssueCard } from "@/components/issue-card";
import { CreateIssueDialog } from "@/components/create-issue-dialog";
import { IssueDetailSheet } from "@/components/issue-detail-sheet";
import { STATUSES, STATUS_COLUMNS, type Status } from "@/lib/constants";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Issue, Project } from "@shared/schema";
import type { User } from "@shared/models/auth";

export default function Board() {
  const [, params] = useRoute("/project/:projectId/board");
  const projectId = params?.projectId || "";

  const [createOpen, setCreateOpen] = useState(false);
  const [createStatus, setCreateStatus] = useState<Status>("todo");
  const [selectedIssue, setSelectedIssue] = useState<Issue | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);
  const [draggedIssueId, setDraggedIssueId] = useState<string | null>(null);

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

  const updateMutation = useMutation({
    mutationFn: async ({ issueId, status }: { issueId: string; status: string }) => {
      await apiRequest("PATCH", `/api/issues/${issueId}`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId, "issues"] });
    },
  });

  const handleDragStart = (e: React.DragEvent, issueId: string) => {
    e.dataTransfer.setData("issueId", issueId);
    setDraggedIssueId(issueId);
  };

  const handleDragOver = (e: React.DragEvent, column: string) => {
    e.preventDefault();
    setDragOverColumn(column);
  };

  const handleDragLeave = () => {
    setDragOverColumn(null);
  };

  const handleDrop = (e: React.DragEvent, status: string) => {
    e.preventDefault();
    const issueId = e.dataTransfer.getData("issueId");
    if (issueId) {
      updateMutation.mutate({ issueId, status });
    }
    setDragOverColumn(null);
    setDraggedIssueId(null);
  };

  const openCreateForStatus = (status: Status) => {
    setCreateStatus(status);
    setCreateOpen(true);
  };

  if (projectLoading || issuesLoading) {
    return (
      <div className="flex h-full gap-4 p-6">
        {STATUS_COLUMNS.map((col) => (
          <div key={col} className="flex-1 min-w-[260px] space-y-3">
            <Skeleton className="h-6 w-24" />
            <Skeleton className="h-28 w-full" />
            <Skeleton className="h-28 w-full" />
          </div>
        ))}
      </div>
    );
  }

  if (!project) return null;

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between gap-4 px-6 py-4 border-b flex-wrap">
        <div>
          <h1 className="text-xl font-semibold" data-testid="text-board-title">{project.name} Board</h1>
          <p className="text-sm text-muted-foreground">{issues.length} issue{issues.length !== 1 ? "s" : ""}</p>
        </div>
        <Button onClick={() => openCreateForStatus("todo")} className="gap-1.5" data-testid="button-create-issue">
          <Plus className="h-4 w-4" /> Create Issue
        </Button>
      </div>

      <ScrollArea className="flex-1">
        <div className="flex gap-4 p-6 min-h-0 items-start">
          {STATUS_COLUMNS.map((statusKey) => {
            const columnIssues = issues.filter((i) => i.status === statusKey);
            const { label, color } = STATUSES[statusKey];
            const isDragOver = dragOverColumn === statusKey;

            return (
              <div
                key={statusKey}
                className={`flex-1 min-w-[260px] max-w-[340px] rounded-md transition-colors ${
                  isDragOver ? "bg-primary/5" : "bg-card/50"
                }`}
                onDragOver={(e) => handleDragOver(e, statusKey)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, statusKey)}
                data-testid={`column-${statusKey}`}
              >
                <div className="flex items-center justify-between gap-2 p-3 sticky top-0">
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
                    <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      {label}
                    </span>
                    <span className="text-xs bg-muted text-muted-foreground rounded-full h-5 min-w-[20px] flex items-center justify-center px-1.5 font-medium">
                      {columnIssues.length}
                    </span>
                  </div>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => openCreateForStatus(statusKey)}
                    data-testid={`button-add-${statusKey}`}
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </Button>
                </div>
                <div className="space-y-2 p-2 pt-0 min-h-[100px]">
                  {columnIssues.map((issue) => (
                    <div
                      key={issue.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, issue.id)}
                      className={`transition-opacity ${draggedIssueId === issue.id ? "opacity-40" : ""}`}
                    >
                      <IssueCard
                        issue={issue}
                        project={project}
                        users={users}
                        onClick={() => setSelectedIssue(issue)}
                      />
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </ScrollArea>

      <CreateIssueDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        projectId={projectId}
        defaultStatus={createStatus}
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
