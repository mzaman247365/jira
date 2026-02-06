import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRoute } from "wouter";
import { Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { IssueTypeIcon } from "@/components/issue-type-icon";
import { PriorityIcon } from "@/components/priority-icon";
import { StatusBadge } from "@/components/status-badge";
import { UserAvatar } from "@/components/user-avatar";
import { CreateIssueDialog } from "@/components/create-issue-dialog";
import { IssueDetailSheet } from "@/components/issue-detail-sheet";
import type { Issue, Project } from "@shared/schema";
import type { User } from "@shared/models/auth";
import type { IssueType, Priority, Status } from "@/lib/constants";

export default function Backlog() {
  const [, params] = useRoute("/project/:projectId/backlog");
  const projectId = params?.projectId || "";

  const [createOpen, setCreateOpen] = useState(false);
  const [selectedIssue, setSelectedIssue] = useState<Issue | null>(null);
  const [search, setSearch] = useState("");

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

  const filteredIssues = issues.filter((i) =>
    i.title.toLowerCase().includes(search.toLowerCase()) ||
    `${project?.key}-${i.issueNumber}`.toLowerCase().includes(search.toLowerCase())
  );

  if (projectLoading || issuesLoading) {
    return (
      <div className="p-6 space-y-3">
        <Skeleton className="h-8 w-48" />
        {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
      </div>
    );
  }

  if (!project) return null;

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between gap-4 px-6 py-4 border-b flex-wrap">
        <div>
          <h1 className="text-xl font-semibold" data-testid="text-backlog-title">{project.name} Backlog</h1>
          <p className="text-sm text-muted-foreground">{filteredIssues.length} issue{filteredIssues.length !== 1 ? "s" : ""}</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search issues..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 w-56"
              data-testid="input-search-issues"
            />
          </div>
          <Button onClick={() => setCreateOpen(true)} className="gap-1.5" data-testid="button-create-issue-backlog">
            <Plus className="h-4 w-4" /> Create Issue
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        <table className="w-full">
          <thead className="sticky top-0 z-10 bg-background border-b">
            <tr className="text-xs text-muted-foreground uppercase tracking-wider">
              <th className="text-left font-medium px-6 py-3 w-12">Type</th>
              <th className="text-left font-medium px-3 py-3 w-24">Key</th>
              <th className="text-left font-medium px-3 py-3">Summary</th>
              <th className="text-left font-medium px-3 py-3 w-28">Status</th>
              <th className="text-left font-medium px-3 py-3 w-16">Priority</th>
              <th className="text-left font-medium px-3 py-3 w-20">Assignee</th>
            </tr>
          </thead>
          <tbody>
            {filteredIssues.map((issue) => {
              const assignee = users.find((u) => u.id === issue.assigneeId);
              return (
                <tr
                  key={issue.id}
                  className="border-b hover-elevate cursor-pointer"
                  onClick={() => setSelectedIssue(issue)}
                  data-testid={`row-issue-${issue.id}`}
                >
                  <td className="px-6 py-3">
                    <IssueTypeIcon type={issue.type as IssueType} />
                  </td>
                  <td className="px-3 py-3">
                    <span className="text-sm text-muted-foreground font-medium">
                      {project.key}-{issue.issueNumber}
                    </span>
                  </td>
                  <td className="px-3 py-3">
                    <span className="text-sm font-medium">{issue.title}</span>
                  </td>
                  <td className="px-3 py-3">
                    <StatusBadge status={issue.status as Status} />
                  </td>
                  <td className="px-3 py-3">
                    <PriorityIcon priority={issue.priority as Priority} />
                  </td>
                  <td className="px-3 py-3">
                    {assignee ? (
                      <UserAvatar
                        firstName={assignee.firstName}
                        lastName={assignee.lastName}
                        imageUrl={assignee.profileImageUrl}
                        size="sm"
                      />
                    ) : (
                      <span className="text-xs text-muted-foreground">--</span>
                    )}
                  </td>
                </tr>
              );
            })}
            {filteredIssues.length === 0 && (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-muted-foreground">
                  {search ? "No issues match your search." : "No issues yet. Create one to get started."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <CreateIssueDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        projectId={projectId}
        defaultStatus="backlog"
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
