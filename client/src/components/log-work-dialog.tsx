import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { parseDuration, formatDuration } from "@/lib/time-utils";

interface LogWorkDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  issueId: string;
}

export function LogWorkDialog({ open, onOpenChange, issueId }: LogWorkDialogProps) {
  const { toast } = useToast();
  const [timeSpentInput, setTimeSpentInput] = useState("");
  const [description, setDescription] = useState("");
  const [startedAt, setStartedAt] = useState(() => {
    const now = new Date();
    // Format as YYYY-MM-DDTHH:mm for datetime-local input
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`;
  });

  const parsedMinutes = parseDuration(timeSpentInput);

  const mutation = useMutation({
    mutationFn: async () => {
      if (!parsedMinutes || parsedMinutes <= 0) {
        throw new Error("Invalid time format. Use formats like 2h, 30m, 1h 30m, 1d.");
      }
      await apiRequest("POST", `/api/issues/${issueId}/worklogs`, {
        timeSpent: parsedMinutes,
        description: description.trim() || undefined,
        startedAt: new Date(startedAt).toISOString(),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/issues", issueId] });
      queryClient.invalidateQueries({ queryKey: ["/api/issues", issueId, "worklogs"] });
      toast({ title: "Work logged", description: `Logged ${formatDuration(parsedMinutes)}` });
      setTimeSpentInput("");
      setDescription("");
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Log Work</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="time-spent">Time Spent</Label>
            <Input
              id="time-spent"
              placeholder="e.g. 2h, 30m, 1h 30m, 1d"
              value={timeSpentInput}
              onChange={(e) => setTimeSpentInput(e.target.value)}
            />
            {timeSpentInput && parsedMinutes && (
              <p className="text-xs text-muted-foreground">
                Parsed as: {formatDuration(parsedMinutes)}
              </p>
            )}
            {timeSpentInput && !parsedMinutes && (
              <p className="text-xs text-destructive">
                Invalid format. Use: 2h, 30m, 1h 30m, 1d, 1w
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="started-at">Date Started</Label>
            <Input
              id="started-at"
              type="datetime-local"
              value={startedAt}
              onChange={(e) => setStartedAt(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="work-description">Description</Label>
            <Textarea
              id="work-description"
              placeholder="What did you work on?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="min-h-[80px]"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!parsedMinutes || mutation.isPending}
            >
              {mutation.isPending ? "Logging..." : "Log Work"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
