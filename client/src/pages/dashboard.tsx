import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Plus, FolderKanban, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ProjectAvatar } from "@/components/project-avatar";
import { StatusBadge } from "@/components/status-badge";
import { IssueTypeIcon } from "@/components/issue-type-icon";
import { PriorityIcon } from "@/components/priority-icon";
import { useAuth } from "@/hooks/use-auth";
import { STATUSES, type Status, type IssueType, type Priority } from "@/lib/constants";
import type { Project, Issue } from "@shared/schema";

export default function Dashboard({ onCreateProject }: { onCreateProject: () => void }) {
  const { user } = useAuth();
  const [, setLocation] = useLocation();

  const { data: projects = [], isLoading: projectsLoading } = useQuery<Project[]>({
    queryKey: ["/api/projects"],
  });

  const { data: recentIssues = [], isLoading: issuesLoading } = useQuery<(Issue & { projectKey?: string })[]>({
    queryKey: ["/api/issues/recent"],
  });

  const greeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  };

  return (
    <div className="flex-1 overflow-auto">
      <div className="max-w-5xl mx-auto px-6 py-8 space-y-8">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-greeting">
            {greeting()}, {user?.firstName || "there"}
          </h1>
          <p className="text-muted-foreground mt-1">Here's what's happening across your projects.</p>
        </div>

        <div>
          <div className="flex items-center justify-between gap-4 mb-4 flex-wrap">
            <h2 className="text-lg font-semibold">Projects</h2>
            <Button onClick={onCreateProject} variant="outline" className="gap-1.5" data-testid="button-new-project">
              <Plus className="h-4 w-4" /> New Project
            </Button>
          </div>
          {projectsLoading ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3].map((i) => <Skeleton key={i} className="h-32" />)}
            </div>
          ) : projects.length === 0 ? (
            <Card className="p-8 text-center space-y-3">
              <FolderKanban className="h-10 w-10 text-muted-foreground mx-auto" />
              <div>
                <p className="font-medium">No projects yet</p>
                <p className="text-sm text-muted-foreground">Create your first project to start tracking work.</p>
              </div>
              <Button onClick={onCreateProject} className="gap-1.5" data-testid="button-first-project">
                <Plus className="h-4 w-4" /> Create Project
              </Button>
            </Card>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {projects.map((project) => (
                <Card
                  key={project.id}
                  className="p-4 hover-elevate active-elevate-2 cursor-pointer"
                  onClick={() => setLocation(`/project/${project.id}/board`)}
                  data-testid={`card-project-${project.id}`}
                >
                  <div className="flex items-start gap-3">
                    <ProjectAvatar name={project.name} color={project.avatarColor || "#4C9AFF"} />
                    <div className="min-w-0 flex-1">
                      <h3 className="font-semibold truncate">{project.name}</h3>
                      <p className="text-xs text-muted-foreground font-medium">{project.key}</p>
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-1" />
                  </div>
                  {project.description && (
                    <p className="text-sm text-muted-foreground mt-2 line-clamp-2">{project.description}</p>
                  )}
                </Card>
              ))}
            </div>
          )}
        </div>

        {recentIssues.length > 0 && (
          <div>
            <h2 className="text-lg font-semibold mb-4">Recent Issues</h2>
            <Card className="divide-y">
              {recentIssues.slice(0, 8).map((issue) => (
                <div
                  key={issue.id}
                  className="flex items-center gap-3 px-4 py-3 hover-elevate cursor-pointer"
                  onClick={() => setLocation(`/project/${issue.projectId}/board`)}
                  data-testid={`row-recent-${issue.id}`}
                >
                  <IssueTypeIcon type={issue.type as IssueType} className="h-4 w-4 flex-shrink-0" />
                  <span className="text-xs text-muted-foreground font-medium min-w-[60px]">
                    {(issue as any).projectKey}-{issue.issueNumber}
                  </span>
                  <span className="text-sm font-medium truncate flex-1">{issue.title}</span>
                  <PriorityIcon priority={issue.priority as Priority} className="h-4 w-4 flex-shrink-0" />
                  <StatusBadge status={issue.status as Status} />
                </div>
              ))}
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
