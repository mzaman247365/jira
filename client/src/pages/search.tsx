import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import {
  Search as SearchIcon,
  Save,
  Trash2,
  Filter,
  ChevronLeft,
  ChevronRight,
  Bookmark,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { IssueTypeIcon } from "@/components/issue-type-icon";
import { PriorityIcon } from "@/components/priority-icon";
import { StatusBadge } from "@/components/status-badge";
import { UserAvatar } from "@/components/user-avatar";
import {
  ISSUE_TYPES,
  STATUSES,
  PRIORITIES,
  type IssueType,
  type Status,
  type Priority,
} from "@/lib/constants";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Issue, Project, Sprint, Label as LabelType, SavedFilter } from "@shared/schema";
import type { User } from "@shared/models/auth";

const PAGE_SIZE = 10;

interface SearchFilters {
  query: string;
  projectId: string;
  type: string;
  status: string;
  priority: string;
  assigneeId: string;
  sprintId: string;
  labelId: string;
}

const emptyFilters: SearchFilters = {
  query: "",
  projectId: "",
  type: "",
  status: "",
  priority: "",
  assigneeId: "",
  sprintId: "",
  labelId: "",
};

export default function SearchPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const [filters, setFilters] = useState<SearchFilters>(emptyFilters);
  const [appliedFilters, setAppliedFilters] = useState<SearchFilters>(emptyFilters);
  const [page, setPage] = useState(1);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [filterName, setFilterName] = useState("");

  const { data: projects = [] } = useQuery<Project[]>({
    queryKey: ["/api/projects"],
  });

  const { data: users = [] } = useQuery<User[]>({
    queryKey: ["/api/users"],
  });

  const { data: sprints = [] } = useQuery<Sprint[]>({
    queryKey: ["/api/projects", filters.projectId, "sprints"],
    enabled: !!filters.projectId,
  });

  const { data: labels = [] } = useQuery<LabelType[]>({
    queryKey: ["/api/projects", filters.projectId, "labels"],
    enabled: !!filters.projectId,
  });

  const { data: savedFilters = [] } = useQuery<SavedFilter[]>({
    queryKey: ["/api/saved-filters"],
  });

  const buildSearchParams = (f: SearchFilters) => {
    const params = new URLSearchParams();
    if (f.query) params.set("q", f.query);
    if (f.projectId) params.set("projectId", f.projectId);
    if (f.type) params.set("type", f.type);
    if (f.status) params.set("status", f.status);
    if (f.priority) params.set("priority", f.priority);
    if (f.assigneeId) params.set("assigneeId", f.assigneeId);
    if (f.sprintId) params.set("sprintId", f.sprintId);
    if (f.labelId) params.set("labelId", f.labelId);
    params.set("page", page.toString());
    params.set("limit", PAGE_SIZE.toString());
    return params.toString();
  };

  const hasAppliedFilters = Object.values(appliedFilters).some((v) => v !== "");

  const { data: searchResults, isLoading: searchLoading } = useQuery<{
    issues: (Issue & { projectKey?: string })[];
    total: number;
  }>({
    queryKey: ["/api/issues/search?" + buildSearchParams(appliedFilters)],
    enabled: hasAppliedFilters,
  });

  const results = searchResults?.issues || [];
  const total = searchResults?.total || 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const handleSearch = () => {
    setPage(1);
    setAppliedFilters({ ...filters });
  };

  const saveFilterMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/saved-filters", {
        name: filterName,
        filterJson: appliedFilters,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/saved-filters"] });
      setSaveDialogOpen(false);
      setFilterName("");
      toast({ title: "Filter saved" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const deleteFilterMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/saved-filters/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/saved-filters"] });
      toast({ title: "Filter deleted" });
    },
  });

  const applySavedFilter = (sf: SavedFilter) => {
    const saved = sf.filterJson as unknown as SearchFilters;
    setFilters(saved);
    setAppliedFilters(saved);
    setPage(1);
  };

  useEffect(() => {
    if (hasAppliedFilters) {
      queryClient.invalidateQueries({
        queryKey: ["/api/issues/search?" + buildSearchParams(appliedFilters)],
      });
    }
  }, [page]);

  return (
    <div className="flex h-full">
      {/* Saved Filters Sidebar */}
      <div className="w-64 border-r bg-card/50 flex flex-col flex-shrink-0">
        <div className="px-4 py-3 border-b">
          <h3 className="text-sm font-semibold flex items-center gap-1.5">
            <Bookmark className="h-3.5 w-3.5" />
            Saved Filters
          </h3>
        </div>
        <div className="flex-1 overflow-auto p-2 space-y-1">
          {savedFilters.length === 0 ? (
            <p className="text-xs text-muted-foreground px-2 py-4 text-center">
              No saved filters yet.
            </p>
          ) : (
            savedFilters.map((sf) => (
              <div
                key={sf.id}
                className="flex items-center justify-between gap-1 px-2 py-1.5 rounded-md hover:bg-accent cursor-pointer group"
                onClick={() => applySavedFilter(sf)}
              >
                <span className="text-sm truncate">{sf.name}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 opacity-0 group-hover:opacity-100 flex-shrink-0"
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteFilterMutation.mutate(sf.id);
                  }}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        <div className="px-6 py-4 border-b space-y-4">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <h1 className="text-xl font-semibold flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Advanced Search
            </h1>
            {hasAppliedFilters && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSaveDialogOpen(true)}
                className="gap-1.5"
              >
                <Save className="h-3.5 w-3.5" /> Save Filter
              </Button>
            )}
          </div>

          {/* Filter Bar */}
          <div className="flex items-end gap-3 flex-wrap">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <SearchIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search issues..."
                  value={filters.query}
                  onChange={(e) => setFilters((f) => ({ ...f, query: e.target.value }))}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                  className="pl-9"
                />
              </div>
            </div>

            <Select
              value={filters.projectId}
              onValueChange={(v) => setFilters((f) => ({ ...f, projectId: v === "all" ? "" : v, sprintId: "", labelId: "" }))}
            >
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Project" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Projects</SelectItem>
                {projects.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={filters.type}
              onValueChange={(v) => setFilters((f) => ({ ...f, type: v === "all" ? "" : v }))}
            >
              <SelectTrigger className="w-32">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {Object.entries(ISSUE_TYPES).map(([key, { label }]) => (
                  <SelectItem key={key} value={key}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={filters.status}
              onValueChange={(v) => setFilters((f) => ({ ...f, status: v === "all" ? "" : v }))}
            >
              <SelectTrigger className="w-32">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                {Object.entries(STATUSES).map(([key, { label }]) => (
                  <SelectItem key={key} value={key}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={filters.priority}
              onValueChange={(v) => setFilters((f) => ({ ...f, priority: v === "all" ? "" : v }))}
            >
              <SelectTrigger className="w-32">
                <SelectValue placeholder="Priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priorities</SelectItem>
                {Object.entries(PRIORITIES).map(([key, { label }]) => (
                  <SelectItem key={key} value={key}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={filters.assigneeId}
              onValueChange={(v) => setFilters((f) => ({ ...f, assigneeId: v === "all" ? "" : v }))}
            >
              <SelectTrigger className="w-36">
                <SelectValue placeholder="Assignee" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Assignees</SelectItem>
                {users.map((u) => (
                  <SelectItem key={u.id} value={u.id}>
                    {u.firstName} {u.lastName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {filters.projectId && sprints.length > 0 && (
              <Select
                value={filters.sprintId}
                onValueChange={(v) => setFilters((f) => ({ ...f, sprintId: v === "all" ? "" : v }))}
              >
                <SelectTrigger className="w-36">
                  <SelectValue placeholder="Sprint" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Sprints</SelectItem>
                  {sprints.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {filters.projectId && labels.length > 0 && (
              <Select
                value={filters.labelId}
                onValueChange={(v) => setFilters((f) => ({ ...f, labelId: v === "all" ? "" : v }))}
              >
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Label" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Labels</SelectItem>
                  {labels.map((l) => (
                    <SelectItem key={l.id} value={l.id}>
                      {l.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            <Button onClick={handleSearch} className="gap-1.5">
              <SearchIcon className="h-4 w-4" /> Search
            </Button>
          </div>
        </div>

        {/* Results */}
        <div className="flex-1 overflow-auto">
          {!hasAppliedFilters ? (
            <div className="flex flex-col items-center justify-center py-16 gap-4 text-center">
              <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center">
                <SearchIcon className="h-8 w-8 text-muted-foreground" />
              </div>
              <div>
                <h2 className="text-lg font-semibold">Search for issues</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Use the filters above to find issues across projects.
                </p>
              </div>
            </div>
          ) : searchLoading ? (
            <div className="p-6 space-y-3">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : (
            <>
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
                  {results.map((issue) => {
                    const assignee = users.find((u) => u.id === issue.assigneeId);
                    const project = projects.find((p) => p.id === issue.projectId);
                    const key = project
                      ? `${project.key}-${issue.issueNumber}`
                      : (issue as any).projectKey
                        ? `${(issue as any).projectKey}-${issue.issueNumber}`
                        : `#${issue.issueNumber}`;

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
                          <span className="text-sm text-muted-foreground font-medium">{key}</span>
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
                  {results.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center text-muted-foreground">
                        No issues match your search criteria.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>

              {/* Pagination */}
              {total > PAGE_SIZE && (
                <div className="flex items-center justify-between px-6 py-3 border-t">
                  <span className="text-sm text-muted-foreground">
                    Showing {(page - 1) * PAGE_SIZE + 1}-{Math.min(page * PAGE_SIZE, total)} of{" "}
                    {total}
                  </span>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page <= 1}
                      onClick={() => setPage((p) => p - 1)}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="text-sm">
                      Page {page} of {totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page >= totalPages}
                      onClick={() => setPage((p) => p + 1)}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Save Filter Dialog */}
      <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save Filter</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="filter-name">Filter Name</Label>
            <Input
              id="filter-name"
              value={filterName}
              onChange={(e) => setFilterName(e.target.value)}
              placeholder="e.g., My Open Bugs"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSaveDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => saveFilterMutation.mutate()}
              disabled={!filterName.trim() || saveFilterMutation.isPending}
            >
              {saveFilterMutation.isPending ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
