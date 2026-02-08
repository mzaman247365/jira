import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { STATUSES, STATUS_COLUMNS } from "@/lib/constants";
import { ArrowUp, ArrowDown, Settings2 } from "lucide-react";
import type { BoardConfig } from "@shared/schema";

interface BoardConfigDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
}

const SWIMLANE_OPTIONS = [
  { value: "none", label: "None" },
  { value: "assignee", label: "Assignee" },
  { value: "priority", label: "Priority" },
  { value: "type", label: "Issue Type" },
];

export function BoardConfigDialog({ open, onOpenChange, projectId }: BoardConfigDialogProps) {
  const { toast } = useToast();

  const [swimlaneBy, setSwimlaneBy] = useState("none");
  const [wipLimits, setWipLimits] = useState<Record<string, number>>({});
  const [columnOrder, setColumnOrder] = useState<string[]>([...STATUS_COLUMNS]);

  const { data: config } = useQuery<BoardConfig>({
    queryKey: ["/api/projects", projectId, "board-config"],
    enabled: !!projectId && open,
  });

  // Sync state with fetched config
  useEffect(() => {
    if (config) {
      setSwimlaneBy(config.swimlaneBy ?? "none");
      setWipLimits((config.wipLimits as Record<string, number>) ?? {});
      setColumnOrder(
        (config.columnOrder as string[]) ?? [...STATUS_COLUMNS],
      );
    }
  }, [config]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("PATCH", `/api/projects/${projectId}/board-config`, {
        swimlaneBy,
        wipLimits,
        columnOrder,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId, "board-config"] });
      toast({ title: "Board configuration saved" });
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const moveColumn = (index: number, direction: "up" | "down") => {
    const newOrder = [...columnOrder];
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newOrder.length) return;
    [newOrder[index], newOrder[targetIndex]] = [newOrder[targetIndex], newOrder[index]];
    setColumnOrder(newOrder);
  };

  const updateWipLimit = (status: string, value: string) => {
    const num = parseInt(value, 10);
    setWipLimits((prev) => {
      const next = { ...prev };
      if (!value || isNaN(num) || num <= 0) {
        delete next[status];
      } else {
        next[status] = num;
      }
      return next;
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings2 className="h-5 w-5" />
            Board Configuration
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Swimlane setting */}
          <div className="space-y-2">
            <Label>Swimlanes</Label>
            <Select value={swimlaneBy} onValueChange={setSwimlaneBy}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SWIMLANE_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Group issues into horizontal swimlanes on the board.
            </p>
          </div>

          <Separator />

          {/* WIP Limits */}
          <div className="space-y-3">
            <Label>WIP Limits</Label>
            <p className="text-xs text-muted-foreground">
              Set a maximum number of issues per column. Leave empty for no limit.
            </p>
            <div className="space-y-2">
              {columnOrder.map((status) => {
                const label =
                  STATUSES[status as keyof typeof STATUSES]?.label ?? status;
                return (
                  <div key={status} className="flex items-center gap-3">
                    <span className="text-sm w-28 truncate">{label}</span>
                    <Input
                      type="number"
                      min={0}
                      placeholder="No limit"
                      value={wipLimits[status] ?? ""}
                      onChange={(e) => updateWipLimit(status, e.target.value)}
                      className="w-24 h-8 text-sm"
                    />
                  </div>
                );
              })}
            </div>
          </div>

          <Separator />

          {/* Column Order */}
          <div className="space-y-3">
            <Label>Column Order</Label>
            <p className="text-xs text-muted-foreground">
              Reorder status columns on the board.
            </p>
            <div className="space-y-1">
              {columnOrder.map((status, index) => {
                const label =
                  STATUSES[status as keyof typeof STATUSES]?.label ?? status;
                return (
                  <div
                    key={status}
                    className="flex items-center gap-2 p-2 rounded-md bg-muted/50"
                  >
                    <span className="flex-1 text-sm font-medium">{label}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      disabled={index === 0}
                      onClick={() => moveColumn(index, "up")}
                    >
                      <ArrowUp className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      disabled={index === columnOrder.length - 1}
                      onClick={() => moveColumn(index, "down")}
                    >
                      <ArrowDown className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => saveMutation.mutate()}
              disabled={saveMutation.isPending}
            >
              {saveMutation.isPending ? "Saving..." : "Save Configuration"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
