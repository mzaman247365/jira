import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { IssueTypeIcon } from "@/components/issue-type-icon";
import { PriorityIcon } from "@/components/priority-icon";
import { StatusBadge } from "@/components/status-badge";
import { UserAvatar } from "@/components/user-avatar";
import { ISSUE_TYPES, PRIORITIES, STATUSES } from "@/lib/constants";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { Send, Trash2 } from "lucide-react";
import type { Issue, Project, Comment } from "@shared/schema";
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

  const { data: comments = [] } = useQuery<Comment[]>({
    queryKey: ["/api/issues", issue?.id, "comments"],
    enabled: !!issue,
  });

  const updateMutation = useMutation({
    mutationFn: async (data: Partial<Issue>) => {
      await apiRequest("PATCH", `/api/issues/${issue!.id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", project.id, "issues"] });
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

  if (!issue) return null;

  const issueKey = `${project.key}-${issue.issueNumber}`;
  const assignee = users.find((u) => u.id === issue.assigneeId);
  const reporter = users.find((u) => u.id === issue.reporterId);

  return (
    <Sheet open={!!issue} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="sm:max-w-lg p-0 flex flex-col">
        <SheetHeader className="px-6 pt-6 pb-4 border-b space-y-0">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
            <IssueTypeIcon type={issue.type as IssueType} className="h-4 w-4" />
            <span className="font-medium" data-testid="text-detail-key">{issueKey}</span>
          </div>
          <SheetTitle className="text-lg leading-snug" data-testid="text-detail-title">
            {issue.title}
          </SheetTitle>
        </SheetHeader>

        <ScrollArea className="flex-1 px-6">
          <div className="py-4 space-y-5">
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

            <Separator />

            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Description</Label>
              <p className="text-sm leading-relaxed whitespace-pre-wrap" data-testid="text-detail-description">
                {issue.description || "No description provided."}
              </p>
            </div>

            <Separator />

            <div className="space-y-3">
              <Label className="text-xs text-muted-foreground">
                Activity ({comments.length})
              </Label>
              <div className="space-y-3">
                {comments.map((comment) => {
                  const author = users.find((u) => u.id === comment.authorId);
                  return (
                    <div key={comment.id} className="flex gap-2.5" data-testid={`comment-${comment.id}`}>
                      <UserAvatar
                        firstName={author?.firstName}
                        lastName={author?.lastName}
                        imageUrl={author?.profileImageUrl}
                        size="sm"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-medium">
                            {author?.firstName} {author?.lastName}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {comment.createdAt ? new Date(comment.createdAt).toLocaleDateString() : ""}
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
          </div>
        </ScrollArea>

        <div className="px-6 py-3 border-t flex justify-end">
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
    </Sheet>
  );
}
