import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { IssueTypeIcon } from "@/components/issue-type-icon";
import { PriorityIcon } from "@/components/priority-icon";
import { UserAvatar } from "@/components/user-avatar";
import { LabelBadge } from "@/components/label-badge";
import { LabelPicker } from "@/components/label-picker";
import { SubTaskList } from "@/components/sub-task-list";
import { IssueLinksSection } from "@/components/issue-links-section";
import { TimeTrackingSection } from "@/components/time-tracking-section";
import { LogWorkDialog } from "@/components/log-work-dialog";
import { AttachmentSection } from "@/components/attachment-section";
import { ActivityFeed } from "@/components/activity-feed";
import { VersionPicker } from "@/components/version-picker";
import { ISSUE_TYPES, PRIORITIES, STATUSES } from "@/lib/constants";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { Send, Trash2, Eye, EyeOff, Star, StarOff, Calendar } from "lucide-react";
import type { Issue, Project, Comment, Label as LabelType, Sprint } from "@shared/schema";
import type { User } from "@shared/models/auth";
import type { IssueType, Priority, Status } from "@/lib/constants";

interface IssueDetailSheetProps {
  issue: Issue | null;
  project: Project;
  users: User[];
  onClose: () => void;
}

export function IssueDetailSheet({ issue, project, users, onClose }: IssueDetailSheetProps) {
  const { toast } = useToast();
  const { user: currentUser } = useAuth();
  const [commentText, setCommentText] = useState("");
  const [logWorkOpen, setLogWorkOpen] = useState(false);

  const { data: comments = [] } = useQuery<Comment[]>({
    queryKey: ["/api/issues", issue?.id, "comments"],
    enabled: !!issue,
  });

  const { data: issueLabels = [] } = useQuery<LabelType[]>({
    queryKey: ["/api/issues", issue?.id, "labels"],
    enabled: !!issue,
  });

  const { data: sprints = [] } = useQuery<Sprint[]>({
    queryKey: ["/api/projects", project.id, "sprints"],
    enabled: !!issue,
  });

  const { data: watchers = [] } = useQuery<any[]>({
    queryKey: ["/api/issues", issue?.id, "watchers"],
    enabled: !!issue,
  });

  const isWatching = watchers.some((w: any) => w.userId === currentUser?.id);

  const updateMutation = useMutation({
    mutationFn: async (data: Partial<Issue>) => {
      await apiRequest("PATCH", `/api/issues/${issue!.id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", project.id, "issues"] });
      queryClient.invalidateQueries({ queryKey: ["/api/issues", issue?.id] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("DELETE", `/api/issues/${issue!.id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", project.id, "issues"] });
      toast({ title: "Issue deleted" });
      onClose();
    },
  });

  const commentMutation = useMutation({
    mutationFn: async (content: string) => {
      await apiRequest("POST", `/api/issues/${issue!.id}/comments`, { content });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/issues", issue?.id, "comments"] });
      setCommentText("");
    },
  });

  const watchMutation = useMutation({
    mutationFn: async () => {
      if (isWatching) {
        await apiRequest("DELETE", `/api/issues/${issue!.id}/watch`);
      } else {
        await apiRequest("POST", `/api/issues/${issue!.id}/watch`);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/issues", issue?.id, "watchers"] });
    },
  });

  const labelToggleMutation = useMutation({
    mutationFn: async ({ labelId, add }: { labelId: string; add: boolean }) => {
      if (add) {
        await apiRequest("POST", `/api/issues/${issue!.id}/labels`, { labelId });
      } else {
        await apiRequest("DELETE", `/api/issues/${issue!.id}/labels/${labelId}`);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/issues", issue?.id, "labels"] });
    },
  });

  if (!issue) return null;

  const issueKey = `${project.key}-${issue.issueNumber}`;
  const assignee = users.find((u) => u.id === issue.assigneeId);

  return (
    <Sheet open={!!issue} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="sm:max-w-2xl p-0 flex flex-col">
        <SheetHeader className="px-6 pt-6 pb-4 border-b space-y-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <IssueTypeIcon type={issue.type as IssueType} className="h-4 w-4" />
              <span className="font-medium" data-testid="text-detail-key">{issueKey}</span>
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => watchMutation.mutate()}
                className="h-8 w-8"
              >
                {isWatching ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
          </div>
          <SheetTitle className="text-lg leading-snug" data-testid="text-detail-title">
            {issue.title}
          </SheetTitle>
          {issue.parentId && (
            <div className="text-xs text-muted-foreground">Sub-task of parent issue</div>
          )}
        </SheetHeader>

        <ScrollArea className="flex-1 px-6">
          <div className="py-4 space-y-5">
            {/* Core fields */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Status</Label>
                <Select
                  value={issue.status}
                  onValueChange={(v) => updateMutation.mutate({ status: v as any })}
                >
                  <SelectTrigger data-testid="select-detail-status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.entries(STATUSES) as [Status, { label: string }][]).map(([key, { label }]) => (
                      <SelectItem key={key} value={key}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Priority</Label>
                <Select
                  value={issue.priority}
                  onValueChange={(v) => updateMutation.mutate({ priority: v as any })}
                >
                  <SelectTrigger data-testid="select-detail-priority">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.entries(PRIORITIES) as [Priority, { label: string }][]).map(([key, { label }]) => (
                      <SelectItem key={key} value={key}>
                        <div className="flex items-center gap-2">
                          <PriorityIcon priority={key} className="h-3.5 w-3.5" />
                          {label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Type</Label>
                <Select
                  value={issue.type}
                  onValueChange={(v) => updateMutation.mutate({ type: v as any })}
                >
                  <SelectTrigger data-testid="select-detail-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.entries(ISSUE_TYPES) as [IssueType, { label: string }][]).map(([key, { label }]) => (
                      <SelectItem key={key} value={key}>
                        <div className="flex items-center gap-2">
                          <IssueTypeIcon type={key} className="h-3.5 w-3.5" />
                          {label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Assignee</Label>
                <Select
                  value={issue.assigneeId || "unassigned"}
                  onValueChange={(v) => updateMutation.mutate({ assigneeId: v === "unassigned" ? null : v })}
                >
                  <SelectTrigger data-testid="select-detail-assignee">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unassigned">Unassigned</SelectItem>
                    {users.map((u) => (
                      <SelectItem key={u.id} value={u.id}>
                        <div className="flex items-center gap-2">
                          <UserAvatar firstName={u.firstName} lastName={u.lastName} imageUrl={u.profileImageUrl} size="sm" />
                          {u.firstName} {u.lastName}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Sprint */}
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Sprint</Label>
              <Select
                value={issue.sprintId || "none"}
                onValueChange={(v) => updateMutation.mutate({ sprintId: v === "none" ? null : v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="No sprint" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No sprint</SelectItem>
                  {sprints.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name} {s.status === "active" ? "(Active)" : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Versions */}
            <div className="grid grid-cols-2 gap-4">
              <VersionPicker
                projectId={project.id}
                value={issue.fixVersionId}
                onChange={(v) => updateMutation.mutate({ fixVersionId: v })}
                label="Fix Version"
              />
              <VersionPicker
                projectId={project.id}
                value={issue.affectsVersionId}
                onChange={(v) => updateMutation.mutate({ affectsVersionId: v })}
                label="Affects Version"
              />
            </div>

            {/* Dates */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Start Date</Label>
                <Input
                  type="date"
                  value={issue.startDate ? new Date(issue.startDate).toISOString().split("T")[0] : ""}
                  onChange={(e) => updateMutation.mutate({ startDate: e.target.value ? new Date(e.target.value) : null })}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Due Date</Label>
                <Input
                  type="date"
                  value={issue.dueDate ? new Date(issue.dueDate).toISOString().split("T")[0] : ""}
                  onChange={(e) => updateMutation.mutate({ dueDate: e.target.value ? new Date(e.target.value) : null })}
                />
              </div>
            </div>

            {/* Story Points */}
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Story Points</Label>
              <Input
                type="number"
                min={0}
                max={100}
                value={issue.storyPoints ?? ""}
                onChange={(e) => {
                  const val = e.target.value ? parseInt(e.target.value, 10) : null;
                  updateMutation.mutate({ storyPoints: val });
                }}
                className="w-24"
              />
            </div>

            {/* Labels */}
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Labels</Label>
              <div className="flex flex-wrap gap-1.5 items-center">
                {issueLabels.map((label) => (
                  <LabelBadge
                    key={label.id}
                    label={label}
                    onRemove={() => labelToggleMutation.mutate({ labelId: label.id, add: false })}
                  />
                ))}
                <LabelPicker
                  issueId={issue.id}
                  projectId={project.id}
                  selectedLabelIds={issueLabels.map((l) => l.id)}
                  onToggle={(labelId, add) => labelToggleMutation.mutate({ labelId, add })}
                />
              </div>
            </div>

            <Separator />

            {/* Description */}
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Description</Label>
              <p className="text-sm leading-relaxed whitespace-pre-wrap" data-testid="text-detail-description">
                {issue.description || "No description provided."}
              </p>
            </div>

            <Separator />

            {/* Time Tracking */}
            <TimeTrackingSection issue={issue} onLogWork={() => setLogWorkOpen(true)} />

            <Separator />

            {/* Sub-tasks (only for non-sub_task issues) */}
            {issue.type !== "sub_task" && (
              <>
                <SubTaskList issue={issue} project={project} users={users} />
                <Separator />
              </>
            )}

            {/* Issue Links */}
            <IssueLinksSection issue={issue} project={project} />

            <Separator />

            {/* Attachments */}
            <AttachmentSection issueId={issue.id} />

            <Separator />

            {/* Activity & Comments */}
            <ActivityFeed issueId={issue.id} comments={comments} users={users} />

            {/* Add comment */}
            <div className="flex gap-2 items-start">
              <UserAvatar
                firstName={currentUser?.firstName}
                lastName={currentUser?.lastName}
                imageUrl={currentUser?.profileImageUrl}
                size="sm"
              />
              <div className="flex-1 flex gap-2">
                <Input
                  placeholder="Add a comment..."
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && commentText.trim()) {
                      commentMutation.mutate(commentText.trim());
                    }
                  }}
                  data-testid="input-comment"
                />
                <Button
                  size="icon"
                  variant="ghost"
                  disabled={!commentText.trim() || commentMutation.isPending}
                  onClick={() => commentText.trim() && commentMutation.mutate(commentText.trim())}
                  data-testid="button-send-comment"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </ScrollArea>

        <div className="px-6 py-3 border-t flex justify-between items-center">
          <div className="text-xs text-muted-foreground">
            {watchers.length} watcher{watchers.length !== 1 ? "s" : ""}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => deleteMutation.mutate()}
            className="text-destructive gap-1.5"
            data-testid="button-delete-issue"
          >
            <Trash2 className="h-3.5 w-3.5" /> Delete
          </Button>
        </div>
      </SheetContent>

      <LogWorkDialog
        open={logWorkOpen}
        onOpenChange={setLogWorkOpen}
        issueId={issue.id}
      />
    </Sheet>
  );
}
