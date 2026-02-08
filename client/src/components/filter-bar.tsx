import { useQuery } from "@tanstack/react-query";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { ISSUE_TYPES, PRIORITIES, STATUSES } from "@/lib/constants";
import { X } from "lucide-react";
import type { IssueType, Priority, Status } from "@/lib/constants";
import type { User } from "@shared/models/auth";

interface FilterBarProps {
  projectId?: string;
  filters: Record<string, string>;
  onFiltersChange: (filters: Record<string, string>) => void;
  showProjectFilter?: boolean;
}

export function FilterBar({
  projectId,
  filters,
  onFiltersChange,
  showProjectFilter,
}: FilterBarProps) {
  // Fetch users for assignee filter
  const { data: users = [] } = useQuery<User[]>({
    queryKey: ["/api/users"],
  });

  // Fetch projects for project filter (only if shown)
  const { data: projects = [] } = useQuery<Array<{ id: string; name: string; key: string }>>({
    queryKey: ["/api/projects"],
    enabled: !!showProjectFilter,
  });

  const setFilter = (key: string, value: string) => {
    const next = { ...filters };
    if (value === "all") {
      delete next[key];
    } else {
      next[key] = value;
    }
    onFiltersChange(next);
  };

  const hasFilters = Object.keys(filters).length > 0;

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {showProjectFilter && (
        <Select
          value={filters.projectId || "all"}
          onValueChange={(v) => setFilter("projectId", v)}
        >
          <SelectTrigger className="w-[150px] h-8 text-xs">
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
      )}

      <Select
        value={filters.type || "all"}
        onValueChange={(v) => setFilter("type", v)}
      >
        <SelectTrigger className="w-[120px] h-8 text-xs">
          <SelectValue placeholder="Type" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Types</SelectItem>
          {(Object.entries(ISSUE_TYPES) as [IssueType, { label: string }][]).map(
            ([key, { label }]) => (
              <SelectItem key={key} value={key}>
                {label}
              </SelectItem>
            ),
          )}
        </SelectContent>
      </Select>

      <Select
        value={filters.status || "all"}
        onValueChange={(v) => setFilter("status", v)}
      >
        <SelectTrigger className="w-[130px] h-8 text-xs">
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Statuses</SelectItem>
          {(Object.entries(STATUSES) as [Status, { label: string }][]).map(
            ([key, { label }]) => (
              <SelectItem key={key} value={key}>
                {label}
              </SelectItem>
            ),
          )}
        </SelectContent>
      </Select>

      <Select
        value={filters.priority || "all"}
        onValueChange={(v) => setFilter("priority", v)}
      >
        <SelectTrigger className="w-[130px] h-8 text-xs">
          <SelectValue placeholder="Priority" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Priorities</SelectItem>
          {(Object.entries(PRIORITIES) as [Priority, { label: string }][]).map(
            ([key, { label }]) => (
              <SelectItem key={key} value={key}>
                {label}
              </SelectItem>
            ),
          )}
        </SelectContent>
      </Select>

      <Select
        value={filters.assigneeId || "all"}
        onValueChange={(v) => setFilter("assigneeId", v)}
      >
        <SelectTrigger className="w-[140px] h-8 text-xs">
          <SelectValue placeholder="Assignee" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Assignees</SelectItem>
          <SelectItem value="unassigned">Unassigned</SelectItem>
          {users.map((u) => (
            <SelectItem key={u.id} value={u.id}>
              {u.firstName} {u.lastName}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {hasFilters && (
        <Button
          variant="ghost"
          size="sm"
          className="h-8 px-2 text-xs gap-1"
          onClick={() => onFiltersChange({})}
        >
          <X className="h-3 w-3" />
          Clear Filters
        </Button>
      )}
    </div>
  );
}
