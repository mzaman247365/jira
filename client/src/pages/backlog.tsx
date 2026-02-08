import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useRoute } from "wouter";
import { Plus, Search, ChevronRight, ChevronDown, MoreHorizontal, Zap, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { IssueTypeIcon } from "@/components/issue-type-icon";
import { PriorityIcon } from "@/components/priority-icon";
import { StatusBadge } from "@/components/status-badge";
import { UserAvatar } from "@/components/user-avatar";
import { CreateIssueDialog } from "@/components/create-issue-dialog";
import { IssueDetailSheet } from "@/components/issue-detail-sheet";
import { FilterBar } from "@/components/filter-bar";
import { SPRINT_STATUSES } from "@/lib/constants";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Issue, Project, Sprint } from "@shared/schema";
import type { User } from "@shared/models/auth";
import type { IssueType, Priority, Status, SprintStatus } from "@/lib/constants";

// ── Helpers ───────────────────────────────────────────────────────────────

function sumStoryPoints(issues: Issue[]): number {
  return issues.reduce((sum, i) => sum + (i.storyPoints ?? 0), 0);
}

function applyFilters(issues: Issue[], filters: Record<string, string>): Issue[] {
  return issues.filter((issue) => {
    if (filters.type && issue.type !== filters.type) return false;
    if (filters.status && issue.status !== filters.status) return false;
    if (filters.priority && issue.priority !== filters.priority) return false;
    if (filters.assigneeId) {
      if (filters.assigneeId === "unassigned") {
        if (issue.assigneeId) return false;
      } else if (issue.assigneeId !== filters.assigneeId) {
        return false;
      }
    }
    return true;
  });
}

// ── Sprint Section ────────────────────────────────────────────────────────

interface SprintSectionProps {
  sprint: Sprint;
  issues: Issue[];
  allSprints: Sprint[];
  project: Project;
  users: User[];
  onIssueClick: (issue: Issue) => void;
  onMoveSprint: (issueId: string, sprintId: string | null) => void;
  onStartSprint: (sprintId: string) => void;
  onCompleteSprint: (sprintId: string) => void;
  startingSprintId: string | null;
  completingSprintId: string | null;
}

function SprintSection({
  sprint,
  issues,
  allSprints,
  project,
  users,
  onIssueClick,
  onMoveSprint,
  onStartSprint,
  onCompleteSprint,
  startingSprintId,
  completingSprintId,
}: SprintSectionProps) {
  const [open, setOpen] = useState(true);
  const statusInfo = SPRINT_STATUSES[sprint.status as SprintStatus];
  const storyPoints = sumStoryPoints(issues);

  return (
    <Collapsible open={open} onOpenChange={setOpen} className="border rounded-lg">
      <div className="flex items-center justify-between gap-3 px-4 py-3 bg-muted/40">
        <CollapsibleTrigger asChild>
          <button className="flex items-center gap-2 text-left flex-1 min-w-0">
            {open ? (
              <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
            )}
            <span className="font-semibold text-sm truncate">{sprint.name}</span>
            <Badge
              variant="outline"
              className="gap-1.5 text-xs font-medium shrink-0"
            >
              <div
                className="h-2 w-2 rounded-full shrink-0"
                style={{ backgroundColor: statusInfo?.color || "#6B778C" }}
              />
              {statusInfo?.label || sprint.status}
            </Badge>
            <span className="text-xs text-muted-foreground shrink-0">
              {issues.length} issue{issues.length !== 1 ? "s" : ""}
            </span>
            {storyPoints > 0 && (
              <span className="text-xs text-muted-foreground shrink-0">
                ({storyPoints} pt{storyPoints !== 1 ? "s" : ""})
              </span>
            )}
          </button>
        </CollapsibleTrigger>

        <div className="flex items-center gap-2 shrink-0">
          {sprint.status === "planning" && (
            <Button
              size="sm"
              variant="default"
              className="gap-1.5 h-7 text-xs"
              disabled={startingSprintId === sprint.id}
              onClick={(e) => {
                e.stopPropagation();
                onStartSprint(sprint.id);
              }}
            >
              <Zap className="h-3 w-3" />
              {startingSprintId === sprint.id ? "Starting..." : "Start Sprint"}
            </Button>
          )}
          {sprint.status === "active" && (
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5 h-7 text-xs"
              disabled={completingSprintId === sprint.id}
              onClick={(e) => {
                e.stopPropagation();
                onCompleteSprint(sprint.id);
              }}
            >
              <CheckCircle2 className="h-3 w-3" />
              {completingSprintId === sprint.id ? "Completing..." : "Complete Sprint"}
            </Button>
          )}
        </div>
      </div>

      <CollapsibleContent>
        {issues.length === 0 ? (
          <div className="px-6 py-8 text-center text-sm text-muted-foreground">
            No issues in this sprint. Drag issues here or use the move action.
          </div>
        ) : (
          <IssueTable
            issues={issues}
            project={project}
            users={users}
            allSprints={allSprints}
            currentSprintId={sprint.id}
            onIssueClick={onIssueClick}
            onMoveSprint={onMoveSprint}
          />
        )}
      </CollapsibleContent>
    </Collapsible>
  );
}

// ── Backlog Section (no sprint) ───────────────────────────────────────────

interface BacklogSectionProps {
  issues: Issue[];
  allSprints: Sprint[];
  project: Project;
  users: User[];
  onIssueClick: (issue: Issue) => void;
  onMoveSprint: (issueId: string, sprintId: string | null) => void;
}

function BacklogSection({
  issues,
  allSprints,
  project,
  users,
  onIssueClick,
  onMoveSprint,
}: BacklogSectionProps) {
  const [open, setOpen] = useState(true);
  const storyPoints = sumStoryPoints(issues);

  return (
    <Collapsible open={open} onOpenChange={setOpen} className="border rounded-lg">
      <div className="flex items-center gap-3 px-4 py-3 bg-muted/40">
        <CollapsibleTrigger asChild>
          <button className="flex items-center gap-2 text-left flex-1 min-w-0">
            {open ? (
              <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
            )}
            <span className="font-semibold text-sm">Backlog</span>
            <span className="text-xs text-muted-foreground shrink-0">
              {issues.length} issue{issues.length !== 1 ? "s" : ""}
            </span>
            {storyPoints > 0 && (
              <span className="text-xs text-muted-foreground shrink-0">
                ({storyPoints} pt{storyPoints !== 1 ? "s" : ""})
              </span>
            )}
          </button>
        </CollapsibleTrigger>
      </div>

      <CollapsibleContent>
        {issues.length === 0 ? (
          <div className="px-6 py-8 text-center text-sm text-muted-foreground">
            No unassigned backlog issues.
          </div>
        ) : (
          <IssueTable
            issues={issues}
            project={project}
            users={users}
            allSprints={allSprints}
            currentSprintId={null}
            onIssueClick={onIssueClick}
            onMoveSprint={onMoveSprint}
          />
        )}
      </CollapsibleContent>
    </Collapsible>
  );
}

// ── Issue Table ───────────────────────────────────────────────────────────

interface IssueTableProps {
  issues: Issue[];
  project: Project;
  users: User[];
  allSprints: Sprint[];
  currentSprintId: string | null;
  onIssueClick: (issue: Issue) => void;
  onMoveSprint: (issueId: string, sprintId: string | null) => void;
}

function IssueTable({
  issues,
  project,
  users,
  allSprints,
  currentSprintId,
  onIssueClick,
  onMoveSprint,
}: IssueTableProps) {
  const nonCompletedSprints = allSprints.filter((s) => s.status !== "completed");

  return (
    <table className="w-full">
      <thead className="border-b">
        <tr className="text-xs text-muted-foreground uppercase tracking-wider">
          <th className="text-left font-medium px-6 py-2 w-12">Type</th>
          <th className="text-left font-medium px-3 py-2 w-24">Key</th>
          <th className="text-left font-medium px-3 py-2">Summary</th>
          <th className="text-left font-medium px-3 py-2 w-28">Status</th>
          <th className="text-left font-medium px-3 py-2 w-16">Priority</th>
          <th className="text-left font-medium px-3 py-2 w-16">Points</th>
          <th className="text-left font-medium px-3 py-2 w-20">Assignee</th>
          <th className="text-left font-medium px-3 py-2 w-10"></th>
        </tr>
      </thead>
      <tbody>
        {issues.map((issue) => {
          const assignee = users.find((u) => u.id === issue.assigneeId);
          return (
            <tr
              key={issue.id}
              className="border-b hover-elevate cursor-pointer"
              onClick={() => onIssueClick(issue)}
              data-testid={`row-issue-${issue.id}`}
            >
              <td className="px-6 py-2.5">
                <IssueTypeIcon type={issue.type as IssueType} />
              </td>
              <td className="px-3 py-2.5">
                <span className="text-sm text-muted-foreground font-medium">
                  {project.key}-{issue.issueNumber}
                </span>
              </td>
              <td className="px-3 py-2.5">
                <span className="text-sm font-medium">{issue.title}</span>
              </td>
              <td className="px-3 py-2.5">
                <StatusBadge status={issue.status as Status} />
              </td>
              <td className="px-3 py-2.5">
                <PriorityIcon priority={issue.priority as Priority} />
              </td>
              <td className="px-3 py-2.5">
                <span className="text-xs text-muted-foreground">
                  {issue.storyPoints ?? "--"}
                </span>
              </td>
              <td className="px-3 py-2.5">
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
              <td className="px-3 py-2.5">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                    {nonCompletedSprints.map((sprint) => (
                      <DropdownMenuItem
                        key={sprint.id}
                        disabled={sprint.id === currentSprintId}
                        onClick={() => onMoveSprint(issue.id, sprint.id)}
                      >
                        Move to {sprint.name}
                        {sprint.status === "active" && (
                          <Badge variant="outline" className="ml-2 text-[10px] h-4 px-1">
                            Active
                          </Badge>
                        )}
                      </DropdownMenuItem>
                    ))}
                    {nonCompletedSprints.length > 0 && currentSprintId !== null && (
                      <DropdownMenuSeparator />
                    )}
                    {currentSprintId !== null && (
                      <DropdownMenuItem onClick={() => onMoveSprint(issue.id, null)}>
                        Remove from sprint
                      </DropdownMenuItem>
                    )}
                    {nonCompletedSprints.length === 0 && currentSprintId === null && (
                      <DropdownMenuItem disabled>
                        No sprints available
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

// ── Main Component ────────────────────────────────────────────────────────

export default function Backlog() {
  const [, params] = useRoute("/project/:projectId/backlog");
  const projectId = params?.projectId || "";
  const { toast } = useToast();

  const [createOpen, setCreateOpen] = useState(false);
  const [selectedIssue, setSelectedIssue] = useState<Issue | null>(null);
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState<Record<string, string>>({});

  // ── Queries ───────────────────────────────────────────────────────────

  const { data: project, isLoading: projectLoading } = useQuery<Project>({
    queryKey: ["/api/projects", projectId],
    enabled: !!projectId,
  });

  const { data: issues = [], isLoading: issuesLoading } = useQuery<Issue[]>({
    queryKey: ["/api/projects", projectId, "issues"],
    enabled: !!projectId,
  });

  const { data: sprints = [], isLoading: sprintsLoading } = useQuery<Sprint[]>({
    queryKey: ["/api/projects", projectId, "sprints"],
    enabled: !!projectId,
  });

  const { data: users = [] } = useQuery<User[]>({
    queryKey: ["/api/users"],
  });

  // ── Mutations ─────────────────────────────────────────────────────────

  const moveToSprintMutation = useMutation({
    mutationFn: async ({ issueId, sprintId }: { issueId: string; sprintId: string | null }) => {
      await apiRequest("PATCH", `/api/issues/${issueId}`, { sprintId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId, "issues"] });
      toast({ title: "Issue moved successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const startSprintMutation = useMutation({
    mutationFn: async (sprintId: string) => {
      await apiRequest("POST", `/api/sprints/${sprintId}/start`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId, "sprints"] });
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId, "issues"] });
      toast({ title: "Sprint started" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const completeSprintMutation = useMutation({
    mutationFn: async (sprintId: string) => {
      await apiRequest("POST", `/api/sprints/${sprintId}/complete`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId, "sprints"] });
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId, "issues"] });
      toast({ title: "Sprint completed" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  // ── Derived data ──────────────────────────────────────────────────────

  const filteredIssues = useMemo(() => {
    let result = issues;

    // Text search
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (i) =>
          i.title.toLowerCase().includes(q) ||
          `${project?.key}-${i.issueNumber}`.toLowerCase().includes(q),
      );
    }

    // FilterBar filters
    result = applyFilters(result, filters);

    return result;
  }, [issues, search, filters, project?.key]);

  const activeSprints = useMemo(
    () => sprints.filter((s) => s.status === "active"),
    [sprints],
  );

  const planningSprints = useMemo(
    () => sprints.filter((s) => s.status === "planning"),
    [sprints],
  );

  const nonCompletedSprints = useMemo(
    () => sprints.filter((s) => s.status !== "completed"),
    [sprints],
  );

  const activeSprintIssues = useMemo(
    () =>
      activeSprints.flatMap((sprint) =>
        filteredIssues.filter((i) => i.sprintId === sprint.id),
      ),
    [activeSprints, filteredIssues],
  );

  const planningSprintIssuesMap = useMemo(() => {
    const map = new Map<string, Issue[]>();
    for (const sprint of planningSprints) {
      map.set(
        sprint.id,
        filteredIssues.filter((i) => i.sprintId === sprint.id),
      );
    }
    return map;
  }, [planningSprints, filteredIssues]);

  const backlogIssues = useMemo(
    () => filteredIssues.filter((i) => !i.sprintId),
    [filteredIssues],
  );

  // ── Handlers ──────────────────────────────────────────────────────────

  const handleMoveSprint = (issueId: string, sprintId: string | null) => {
    moveToSprintMutation.mutate({ issueId, sprintId });
  };

  const handleStartSprint = (sprintId: string) => {
    startSprintMutation.mutate(sprintId);
  };

  const handleCompleteSprint = (sprintId: string) => {
    completeSprintMutation.mutate(sprintId);
  };

  // ── Loading state ─────────────────────────────────────────────────────

  if (projectLoading || issuesLoading || sprintsLoading) {
    return (
      <div className="p-6 space-y-3">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-10 w-full" />
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  if (!project) return null;

  // ── Render ────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 px-6 py-4 border-b flex-wrap">
        <div>
          <h1 className="text-xl font-semibold" data-testid="text-backlog-title">
            {project.name} Backlog
          </h1>
          <p className="text-sm text-muted-foreground">
            {filteredIssues.length} issue{filteredIssues.length !== 1 ? "s" : ""}
            {nonCompletedSprints.length > 0 &&
              ` across ${nonCompletedSprints.length} sprint${nonCompletedSprints.length !== 1 ? "s" : ""}`}
          </p>
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
          <Button
            onClick={() => setCreateOpen(true)}
            className="gap-1.5"
            data-testid="button-create-issue-backlog"
          >
            <Plus className="h-4 w-4" /> Create Issue
          </Button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="px-6 py-3 border-b">
        <FilterBar
          projectId={projectId}
          filters={filters}
          onFiltersChange={setFilters}
        />
      </div>

      {/* Sprint Sections */}
      <div className="flex-1 overflow-auto px-6 py-4 space-y-4">
        {/* Active Sprints */}
        {activeSprints.map((sprint) => (
          <SprintSection
            key={sprint.id}
            sprint={sprint}
            issues={filteredIssues.filter((i) => i.sprintId === sprint.id)}
            allSprints={nonCompletedSprints}
            project={project}
            users={users}
            onIssueClick={setSelectedIssue}
            onMoveSprint={handleMoveSprint}
            onStartSprint={handleStartSprint}
            onCompleteSprint={handleCompleteSprint}
            startingSprintId={
              startSprintMutation.isPending
                ? (startSprintMutation.variables as string) ?? null
                : null
            }
            completingSprintId={
              completeSprintMutation.isPending
                ? (completeSprintMutation.variables as string) ?? null
                : null
            }
          />
        ))}

        {/* Planning Sprints */}
        {planningSprints.map((sprint) => (
          <SprintSection
            key={sprint.id}
            sprint={sprint}
            issues={planningSprintIssuesMap.get(sprint.id) ?? []}
            allSprints={nonCompletedSprints}
            project={project}
            users={users}
            onIssueClick={setSelectedIssue}
            onMoveSprint={handleMoveSprint}
            onStartSprint={handleStartSprint}
            onCompleteSprint={handleCompleteSprint}
            startingSprintId={
              startSprintMutation.isPending
                ? (startSprintMutation.variables as string) ?? null
                : null
            }
            completingSprintId={
              completeSprintMutation.isPending
                ? (completeSprintMutation.variables as string) ?? null
                : null
            }
          />
        ))}

        {/* Backlog (unassigned) */}
        <BacklogSection
          issues={backlogIssues}
          allSprints={nonCompletedSprints}
          project={project}
          users={users}
          onIssueClick={setSelectedIssue}
          onMoveSprint={handleMoveSprint}
        />
      </div>

      {/* Dialogs / Sheets */}
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
