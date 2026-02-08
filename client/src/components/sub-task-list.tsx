import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { STATUSES } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { UserAvatar } from "@/components/user-avatar";
import { Plus } from "lucide-react";
import type { Issue, Project } from "@shared/schema";
import type { User } from "@shared/models/auth";
import type { Status } from "@/lib/constants";

interface SubTaskListProps {
  issue: Issue;
  project: Project;
  users: User[];
}

export function SubTaskList({ issue, project, users }: SubTaskListProps) {
  const { toast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [newTitle, setNewTitle] = useState("");

  const { data: children = [] } = useQuery<Issue[]>({
    queryKey: ["/api/issues", issue.id, "children"],
  });

  const createMutation = useMutation({
    mutationFn: async (title: string) => {
      await apiRequest("POST", `/api/projects/${project.id}/issues`, {
        title,
        type: "sub_task",
        parentId: issue.id,
        projectId: project.id,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/issues", issue.id, "children"] });
      queryClient.invalidateQueries({ queryKey: ["/api/projects", project.id, "issues"] });
      setNewTitle("");
      setShowForm(false);
      toast({ title: "Sub-task created" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to create sub-task", description: error.message, variant: "destructive" });
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ childId, status }: { childId: string; status: string }) => {
      await apiRequest("PATCH", `/api/issues/${childId}`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/issues", issue.id, "children"] });
      queryClient.invalidateQueries({ queryKey: ["/api/projects", project.id, "issues"] });
    },
  });

  const doneCount = children.filter((c) => c.status === "done").length;
  const totalCount = children.length;
  const progressPercent = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">
          Sub-tasks {totalCount > 0 && `(${doneCount}/${totalCount})`}
        </span>
      </div>

      {totalCount > 0 && (
        <div className="flex items-center gap-2">
          <Progress value={progressPercent} className="h-2 flex-1" />
          <span className="text-xs text-muted-foreground w-8 text-right">{progressPercent}%</span>
        </div>
      )}

      <div className="space-y-1">
        {children.map((child) => {
          const assignee = users.find((u) => u.id === child.assigneeId);
          const childKey = `${project.key}-${child.issueNumber}`;
          return (
            <div
              key={child.id}
              className="flex items-center gap-2 py-1.5 px-2 rounded-md hover:bg-muted/50 group"
            >
              <Select
                value={child.status}
                onValueChange={(v) =>
                  updateStatusMutation.mutate({ childId: child.id, status: v })
                }
              >
                <SelectTrigger className="h-6 w-24 text-xs border-0 bg-transparent p-0">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.entries(STATUSES) as [Status, { label: string; color: string }][]).map(
                    ([key, { label }]) => (
                      <SelectItem key={key} value={key}>
                        {label}
                      </SelectItem>
                    )
                  )}
                </SelectContent>
              </Select>
              <span className="text-xs text-muted-foreground shrink-0">{childKey}</span>
              <span className="text-sm flex-1 truncate">{child.title}</span>
              {assignee && (
                <UserAvatar
                  firstName={assignee.firstName}
                  lastName={assignee.lastName}
                  imageUrl={assignee.profileImageUrl}
                  size="sm"
                />
              )}
            </div>
          );
        })}
      </div>

      {showForm ? (
        <div className="flex items-center gap-2">
          <Input
            placeholder="Sub-task title"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            className="flex-1 h-8 text-sm"
            onKeyDown={(e) => {
              if (e.key === "Enter" && newTitle.trim()) {
                createMutation.mutate(newTitle.trim());
              }
              if (e.key === "Escape") {
                setShowForm(false);
                setNewTitle("");
              }
            }}
            autoFocus
          />
          <Button
            size="sm"
            className="h-8"
            disabled={!newTitle.trim() || createMutation.isPending}
            onClick={() => newTitle.trim() && createMutation.mutate(newTitle.trim())}
          >
            Create
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-8"
            onClick={() => {
              setShowForm(false);
              setNewTitle("");
            }}
          >
            Cancel
          </Button>
        </div>
      ) : (
        <Button
          variant="ghost"
          size="sm"
          className="gap-1.5 text-muted-foreground h-8"
          onClick={() => setShowForm(true)}
        >
          <Plus className="h-3.5 w-3.5" />
          Add sub-task
        </Button>
      )}
    </div>
  );
}
