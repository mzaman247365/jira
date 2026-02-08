import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { STATUSES, PRIORITIES } from "@/lib/constants";
import { X, ArrowRightCircle, AlertTriangle, UserPlus, Zap, Trash2 } from "lucide-react";
import type { Status, Priority } from "@/lib/constants";
import type { User } from "@shared/models/auth";
import type { Sprint } from "@shared/schema";

interface BulkActionBarProps {
  selectedIds: string[];
  projectId: string;
  onClear: () => void;
}

export function BulkActionBar({ selectedIds, projectId, onClear }: BulkActionBarProps) {
  const { toast } = useToast();
  const [statusPopover, setStatusPopover] = useState(false);
  const [priorityPopover, setPriorityPopover] = useState(false);
  const [assigneePopover, setAssigneePopover] = useState(false);
  const [sprintPopover, setSprintPopover] = useState(false);

  const { data: users = [] } = useQuery<User[]>({
    queryKey: ["/api/users"],
  });

  const { data: sprints = [] } = useQuery<Sprint[]>({
    queryKey: ["/api/projects", projectId, "sprints"],
    enabled: !!projectId,
  });

  const bulkMutation = useMutation({
    mutationFn: async (updates: Record<string, unknown>) => {
      await apiRequest("POST", "/api/issues/bulk", {
        issueIds: selectedIds,
        updates,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId, "issues"] });
      toast({ title: "Issues updated" });
      onClear();
    },
    onError: (error: Error) => {
      toast({ title: "Bulk update failed", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/issues/bulk", {
        issueIds: selectedIds,
        action: "delete",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId, "issues"] });
      toast({ title: `${selectedIds.length} issues deleted` });
      onClear();
    },
    onError: (error: Error) => {
      toast({ title: "Delete failed", description: error.message, variant: "destructive" });
    },
  });

  if (selectedIds.length === 0) return null;

  return (
    <div
      className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 transition-all duration-300 ease-out"
      style={{
        animation: "slideUp 0.3s ease-out",
      }}
    >
      <style>{`
        @keyframes slideUp {
          from { transform: translate(-50%, 100%); opacity: 0; }
          to { transform: translate(-50%, 0); opacity: 1; }
        }
      `}</style>
      <div className="flex items-center gap-3 px-4 py-3 bg-background border rounded-lg shadow-lg">
        <span className="text-sm font-medium whitespace-nowrap">
          {selectedIds.length} issue{selectedIds.length !== 1 ? "s" : ""} selected
        </span>

        <div className="h-4 w-px bg-border" />

        {/* Change Status */}
        <Popover open={statusPopover} onOpenChange={setStatusPopover}>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="gap-1.5 h-8">
              <ArrowRightCircle className="h-3.5 w-3.5" />
              Status
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-48 p-2" align="center" side="top">
            <div className="space-y-1">
              {(Object.entries(STATUSES) as [Status, { label: string }][]).map(
                ([key, { label }]) => (
                  <Button
                    key={key}
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start text-sm h-8"
                    onClick={() => {
                      bulkMutation.mutate({ status: key });
                      setStatusPopover(false);
                    }}
                  >
                    {label}
                  </Button>
                ),
              )}
            </div>
          </PopoverContent>
        </Popover>

        {/* Change Priority */}
        <Popover open={priorityPopover} onOpenChange={setPriorityPopover}>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="gap-1.5 h-8">
              <AlertTriangle className="h-3.5 w-3.5" />
              Priority
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-48 p-2" align="center" side="top">
            <div className="space-y-1">
              {(Object.entries(PRIORITIES) as [Priority, { label: string }][]).map(
                ([key, { label }]) => (
                  <Button
                    key={key}
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start text-sm h-8"
                    onClick={() => {
                      bulkMutation.mutate({ priority: key });
                      setPriorityPopover(false);
                    }}
                  >
                    {label}
                  </Button>
                ),
              )}
            </div>
          </PopoverContent>
        </Popover>

        {/* Change Assignee */}
        <Popover open={assigneePopover} onOpenChange={setAssigneePopover}>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="gap-1.5 h-8">
              <UserPlus className="h-3.5 w-3.5" />
              Assignee
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-48 p-2" align="center" side="top">
            <div className="space-y-1 max-h-48 overflow-y-auto">
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start text-sm h-8"
                onClick={() => {
                  bulkMutation.mutate({ assigneeId: null });
                  setAssigneePopover(false);
                }}
              >
                Unassigned
              </Button>
              {users.map((u) => (
                <Button
                  key={u.id}
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start text-sm h-8"
                  onClick={() => {
                    bulkMutation.mutate({ assigneeId: u.id });
                    setAssigneePopover(false);
                  }}
                >
                  {u.firstName} {u.lastName}
                </Button>
              ))}
            </div>
          </PopoverContent>
        </Popover>

        {/* Move to Sprint */}
        <Popover open={sprintPopover} onOpenChange={setSprintPopover}>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="gap-1.5 h-8">
              <Zap className="h-3.5 w-3.5" />
              Sprint
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-48 p-2" align="center" side="top">
            <div className="space-y-1 max-h-48 overflow-y-auto">
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start text-sm h-8"
                onClick={() => {
                  bulkMutation.mutate({ sprintId: null });
                  setSprintPopover(false);
                }}
              >
                No Sprint
              </Button>
              {sprints.map((s) => (
                <Button
                  key={s.id}
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start text-sm h-8"
                  onClick={() => {
                    bulkMutation.mutate({ sprintId: s.id });
                    setSprintPopover(false);
                  }}
                >
                  {s.name}
                </Button>
              ))}
            </div>
          </PopoverContent>
        </Popover>

        {/* Delete */}
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5 h-8 text-destructive border-destructive/30 hover:bg-destructive/10"
          onClick={() => deleteMutation.mutate()}
          disabled={deleteMutation.isPending}
        >
          <Trash2 className="h-3.5 w-3.5" />
          Delete
        </Button>

        <div className="h-4 w-px bg-border" />

        {/* Clear Selection */}
        <Button
          variant="ghost"
          size="sm"
          className="gap-1.5 h-8"
          onClick={onClear}
        >
          <X className="h-3.5 w-3.5" />
          Clear
        </Button>
      </div>
    </div>
  );
}
