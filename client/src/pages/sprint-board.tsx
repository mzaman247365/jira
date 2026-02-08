import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useRoute } from "wouter";
import { Plus, Calendar, Target, Clock, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { IssueCard } from "@/components/issue-card";
import { CreateIssueDialog } from "@/components/create-issue-dialog";
import { IssueDetailSheet } from "@/components/issue-detail-sheet";
import { STATUSES, STATUS_COLUMNS, type Status } from "@/lib/constants";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Issue, Project, Sprint } from "@shared/schema";
import type { User } from "@shared/models/auth";

export default function SprintBoard() {
  const [, params] = useRoute("/project/:projectId/sprint-board");
  const projectId = params?.projectId || "";
  const { toast } = useToast();

  const [createOpen, setCreateOpen] = useState(false);
  const [createStatus, setCreateStatus] = useState<Status>("todo");
  const [selectedIssue, setSelectedIssue] = useState<Issue | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);
  const [draggedIssueId, setDraggedIssueId] = useState<string | null>(null);
  const [completeDialogOpen, setCompleteDialogOpen] = useState(false);

  const { data: project, isLoading: projectLoading } = useQuery<Project>({
    queryKey: ["/api/projects", projectId],
    enabled: !!projectId,
  });

  const { data: sprints = [], isLoading: sprintsLoading } = useQuery<Sprint[]>({
    queryKey: ["/api/projects", projectId, "sprints"],
    enabled: !!projectId,
  });

  const activeSprint = sprints.find((s) => s.status === "active");

  const { data: sprintIssues = [], isLoading: issuesLoading } = useQuery<Issue[]>({
    queryKey: ["/api/sprints", activeSprint?.id, "issues"],
    enabled: !!activeSprint?.id,
  });

  const { data: users = [] } = useQuery<User[]>({
    queryKey: ["/api/users"],
  });

  const updateMutation = useMutation({
    mutationFn: async ({ issueId, status }: { issueId: string; status: string }) => {
      await apiRequest("PATCH", `/api/issues/${issueId}`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sprints", activeSprint?.id, "issues"] });
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId, "issues"] });
    },
  });

  const completeSprintMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", `/api/sprints/${activeSprint!.id}/complete`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId, "sprints"] });
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId, "issues"] });
      setCompleteDialogOpen(false);
      toast({ title: "Sprint completed" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
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

  const getDaysRemaining = () => {
    if (!activeSprint?.endDate) return null;
    const end = new Date(activeSprint.endDate);
    const now = new Date();
    const diff = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return diff;
  };

  const formatDate = (date: string | Date | null | undefined) => {
    if (!date) return "--";
    return new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  if (projectLoading || sprintsLoading) {
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

  if (!activeSprint) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 text-center p-6">
        <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center">
          <Target className="h-8 w-8 text-muted-foreground" />
        </div>
        <div>
          <h2 className="text-lg font-semibold">No active sprint</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Start a sprint from the Backlog.
          </p>
        </div>
      </div>
    );
  }

  const doneCount = sprintIssues.filter((i) => i.status === "done").length;
  const totalCount = sprintIssues.length;
  const progressPct = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0;
  const daysRemaining = getDaysRemaining();

  return (
    <div className="flex flex-col h-full">
      <div className="px-6 py-4 border-b space-y-3">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-xl font-semibold">{activeSprint.name}</h1>
            {activeSprint.goal && (
              <p className="text-sm text-muted-foreground mt-0.5">{activeSprint.goal}</p>
            )}
          </div>
          <Button
            variant="outline"
            onClick={() => setCompleteDialogOpen(true)}
            className="gap-1.5"
          >
            <CheckCircle2 className="h-4 w-4" /> Complete Sprint
          </Button>
        </div>
        <div className="flex items-center gap-6 flex-wrap text-sm text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <Calendar className="h-3.5 w-3.5" />
            {formatDate(activeSprint.startDate)} - {formatDate(activeSprint.endDate)}
          </div>
          {daysRemaining !== null && (
            <div className="flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5" />
              {daysRemaining > 0
                ? `${daysRemaining} day${daysRemaining !== 1 ? "s" : ""} remaining`
                : "Sprint ended"}
            </div>
          )}
          <div className="flex items-center gap-2 flex-1 min-w-[200px]">
            <Progress value={progressPct} className="h-2 flex-1" />
            <span className="text-xs font-medium">
              {doneCount}/{totalCount} done
            </span>
          </div>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="flex gap-4 p-6 min-h-0 items-start">
          {STATUS_COLUMNS.map((statusKey) => {
            const columnIssues = sprintIssues.filter((i) => i.status === statusKey);
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

      <Dialog open={completeDialogOpen} onOpenChange={setCompleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Complete Sprint</DialogTitle>
            <DialogDescription>
              {totalCount - doneCount > 0
                ? `${totalCount - doneCount} issue${totalCount - doneCount !== 1 ? "s" : ""} will be moved back to the backlog.`
                : "All issues in this sprint are done."}
            </DialogDescription>
          </DialogHeader>
          <div className="text-sm space-y-2">
            <p><strong>Completed:</strong> {doneCount} issue{doneCount !== 1 ? "s" : ""}</p>
            <p><strong>Incomplete:</strong> {totalCount - doneCount} issue{totalCount - doneCount !== 1 ? "s" : ""}</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCompleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => completeSprintMutation.mutate()}
              disabled={completeSprintMutation.isPending}
            >
              {completeSprintMutation.isPending ? "Completing..." : "Complete Sprint"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
