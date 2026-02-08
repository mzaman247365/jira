import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { ClipboardList, User, Eye } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { IssueTypeIcon } from "@/components/issue-type-icon";
import { PriorityIcon } from "@/components/priority-icon";
import { StatusBadge } from "@/components/status-badge";
import { UserAvatar } from "@/components/user-avatar";
import type { Issue, Project } from "@shared/schema";
import type { User as UserType } from "@shared/models/auth";
import type { IssueType, Priority, Status } from "@/lib/constants";

export default function MyWork() {
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState("assigned");

  const { data: assignedIssues = [], isLoading: assignedLoading } = useQuery<
    (Issue & { projectKey?: string })[]
  >({
    queryKey: ["/api/me/assigned"],
  });

  const { data: reportedIssues = [], isLoading: reportedLoading } = useQuery<
    (Issue & { projectKey?: string })[]
  >({
    queryKey: ["/api/me/reported"],
  });

  const { data: watchingIssues = [], isLoading: watchingLoading } = useQuery<
    (Issue & { projectKey?: string })[]
  >({
    queryKey: ["/api/me/watching"],
  });

  const { data: users = [] } = useQuery<UserType[]>({
    queryKey: ["/api/users"],
  });

  const { data: projects = [] } = useQuery<Project[]>({
    queryKey: ["/api/projects"],
  });

  const getIssueKey = (issue: Issue & { projectKey?: string }) => {
    const project = projects.find((p) => p.id === issue.projectId);
    if (project) return `${project.key}-${issue.issueNumber}`;
    if (issue.projectKey) return `${issue.projectKey}-${issue.issueNumber}`;
    return `#${issue.issueNumber}`;
  };

  const renderIssueTable = (
    issues: (Issue & { projectKey?: string })[],
    isLoading: boolean,
    emptyMessage: string,
  ) => {
    if (isLoading) {
      return (
        <div className="space-y-3 p-6">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      );
    }

    if (issues.length === 0) {
      return (
        <div className="px-6 py-12 text-center text-muted-foreground">{emptyMessage}</div>
      );
    }

    return (
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
          {issues.map((issue) => {
            const assignee = users.find((u) => u.id === issue.assigneeId);
            return (
              <tr
                key={issue.id}
                className="border-b hover-elevate cursor-pointer"
                onClick={() => setLocation(`/project/${issue.projectId}/board`)}
              >
                <td className="px-6 py-3">
                  <IssueTypeIcon type={issue.type as IssueType} />
                </td>
                <td className="px-3 py-3">
                  <span className="text-sm text-muted-foreground font-medium">
                    {getIssueKey(issue)}
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
        </tbody>
      </table>
    );
  };

  return (
    <div className="flex flex-col h-full">
      <div className="px-6 py-4 border-b">
        <h1 className="text-xl font-semibold">My Work</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Issues that are relevant to you.
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
        <div className="px-6 pt-2 border-b">
          <TabsList>
            <TabsTrigger value="assigned" className="gap-1.5">
              <ClipboardList className="h-3.5 w-3.5" />
              Assigned to Me
              {!assignedLoading && (
                <span className="ml-1 text-xs bg-muted text-muted-foreground rounded-full h-5 min-w-[20px] flex items-center justify-center px-1.5">
                  {assignedIssues.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="reported" className="gap-1.5">
              <User className="h-3.5 w-3.5" />
              Reported by Me
              {!reportedLoading && (
                <span className="ml-1 text-xs bg-muted text-muted-foreground rounded-full h-5 min-w-[20px] flex items-center justify-center px-1.5">
                  {reportedIssues.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="watching" className="gap-1.5">
              <Eye className="h-3.5 w-3.5" />
              Watching
              {!watchingLoading && (
                <span className="ml-1 text-xs bg-muted text-muted-foreground rounded-full h-5 min-w-[20px] flex items-center justify-center px-1.5">
                  {watchingIssues.length}
                </span>
              )}
            </TabsTrigger>
          </TabsList>
        </div>

        <div className="flex-1 overflow-auto">
          <TabsContent value="assigned" className="mt-0 h-full">
            {renderIssueTable(assignedIssues, assignedLoading, "No issues assigned to you.")}
          </TabsContent>
          <TabsContent value="reported" className="mt-0 h-full">
            {renderIssueTable(reportedIssues, reportedLoading, "No issues reported by you.")}
          </TabsContent>
          <TabsContent value="watching" className="mt-0 h-full">
            {renderIssueTable(watchingIssues, watchingLoading, "You are not watching any issues.")}
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}
