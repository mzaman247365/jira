import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { STATUSES } from "@/lib/constants";
import { Save, GitBranch } from "lucide-react";

interface WorkflowEditorProps {
  projectId: string;
}

interface WorkflowData {
  id?: string;
  projectId: string;
  name: string;
  statuses: string[] | null;
  transitions: Array<{
    id?: string;
    fromStatus: string;
    toStatus: string;
    name?: string | null;
  }>;
}

const ALL_STATUSES = Object.keys(STATUSES);

export function WorkflowEditor({ projectId }: WorkflowEditorProps) {
  const { toast } = useToast();

  // Matrix: transitionMap[fromStatus][toStatus] = true/false
  const [transitionMap, setTransitionMap] = useState<Record<string, Record<string, boolean>>>({});

  const { data: workflow, isLoading } = useQuery<WorkflowData>({
    queryKey: ["/api/projects", projectId, "workflow"],
    enabled: !!projectId,
  });

  // Initialize transition map from fetched data
  useEffect(() => {
    if (workflow) {
      const map: Record<string, Record<string, boolean>> = {};
      ALL_STATUSES.forEach((from) => {
        map[from] = {};
        ALL_STATUSES.forEach((to) => {
          map[from][to] = false;
        });
      });
      if (workflow.transitions) {
        workflow.transitions.forEach((t) => {
          if (map[t.fromStatus]) {
            map[t.fromStatus][t.toStatus] = true;
          }
        });
      }
      setTransitionMap(map);
    } else if (!isLoading) {
      // Default: allow all transitions
      const map: Record<string, Record<string, boolean>> = {};
      ALL_STATUSES.forEach((from) => {
        map[from] = {};
        ALL_STATUSES.forEach((to) => {
          map[from][to] = from !== to;
        });
      });
      setTransitionMap(map);
    }
  }, [workflow, isLoading]);

  const toggleTransition = (from: string, to: string) => {
    setTransitionMap((prev) => ({
      ...prev,
      [from]: {
        ...prev[from],
        [to]: !prev[from]?.[to],
      },
    }));
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      const transitions: Array<{ fromStatus: string; toStatus: string }> = [];
      ALL_STATUSES.forEach((from) => {
        ALL_STATUSES.forEach((to) => {
          if (from !== to && transitionMap[from]?.[to]) {
            transitions.push({ fromStatus: from, toStatus: to });
          }
        });
      });
      await apiRequest("PUT", `/api/projects/${projectId}/workflow`, {
        transitions,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId, "workflow"] });
      toast({ title: "Workflow saved" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <GitBranch className="h-5 w-5 text-muted-foreground" />
          <div>
            <h3 className="text-sm font-semibold">Workflow Transitions</h3>
            <p className="text-xs text-muted-foreground">
              Define which status transitions are allowed. Rows are "from" status, columns are "to" status.
            </p>
          </div>
        </div>
        <Button
          onClick={() => saveMutation.mutate()}
          disabled={saveMutation.isPending}
          className="gap-1.5"
        >
          <Save className="h-4 w-4" />
          {saveMutation.isPending ? "Saving..." : "Save Workflow"}
        </Button>
      </div>

      {/* Transition matrix table */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr>
              <th className="p-2 text-left text-xs font-medium text-muted-foreground border-b">
                From \ To
              </th>
              {ALL_STATUSES.map((status) => (
                <th
                  key={status}
                  className="p-2 text-center text-xs font-medium border-b min-w-[90px]"
                >
                  <span
                    className="inline-block px-2 py-0.5 rounded text-xs font-medium"
                    style={{
                      backgroundColor: `${STATUSES[status as keyof typeof STATUSES].color}20`,
                      color: STATUSES[status as keyof typeof STATUSES].color,
                    }}
                  >
                    {STATUSES[status as keyof typeof STATUSES].label}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ALL_STATUSES.map((fromStatus) => (
              <tr key={fromStatus} className="border-b last:border-b-0">
                <td className="p-2">
                  <span
                    className="inline-block px-2 py-0.5 rounded text-xs font-medium"
                    style={{
                      backgroundColor: `${STATUSES[fromStatus as keyof typeof STATUSES].color}20`,
                      color: STATUSES[fromStatus as keyof typeof STATUSES].color,
                    }}
                  >
                    {STATUSES[fromStatus as keyof typeof STATUSES].label}
                  </span>
                </td>
                {ALL_STATUSES.map((toStatus) => (
                  <td key={toStatus} className="p-2 text-center">
                    {fromStatus === toStatus ? (
                      <span className="text-muted-foreground/30">--</span>
                    ) : (
                      <Checkbox
                        checked={transitionMap[fromStatus]?.[toStatus] ?? false}
                        onCheckedChange={() => toggleTransition(fromStatus, toStatus)}
                      />
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Legend */}
      <div className="text-xs text-muted-foreground">
        <p>
          Check a box to allow transitioning from the row status to the column status.
          Diagonal cells (same status) are disabled.
        </p>
      </div>
    </div>
  );
}
