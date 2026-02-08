import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { LINK_TYPES } from "@/lib/constants";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Check, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Issue } from "@shared/schema";
import type { LinkType } from "@/lib/constants";

interface LinkIssueDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  issueId: string;
  projectId: string;
}

export function LinkIssueDialog({ open, onOpenChange, issueId, projectId }: LinkIssueDialogProps) {
  const { toast } = useToast();
  const [linkType, setLinkType] = useState<LinkType>("relates_to");
  const [searchText, setSearchText] = useState("");
  const [selectedTargetId, setSelectedTargetId] = useState<string | null>(null);

  const { data: projectIssues = [] } = useQuery<Issue[]>({
    queryKey: ["/api/projects", projectId, "issues"],
    enabled: open,
  });

  const createLinkMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", `/api/issues/${issueId}/links`, {
        targetIssueId: selectedTargetId,
        linkType,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/issues", issueId, "links"] });
      toast({ title: "Issue linked" });
      resetAndClose();
    },
    onError: (error: Error) => {
      toast({ title: "Failed to link issue", description: error.message, variant: "destructive" });
    },
  });

  const resetAndClose = () => {
    setLinkType("relates_to");
    setSearchText("");
    setSelectedTargetId(null);
    onOpenChange(false);
  };

  // Filter out the current issue and search by title or issue number
  const filteredIssues = projectIssues.filter((i) => {
    if (i.id === issueId) return false;
    if (!searchText.trim()) return true;
    const query = searchText.toLowerCase();
    return (
      i.title.toLowerCase().includes(query) ||
      String(i.issueNumber).includes(query)
    );
  });

  const selectedIssue = projectIssues.find((i) => i.id === selectedTargetId);

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) resetAndClose(); else onOpenChange(o); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Link Issue</DialogTitle>
          <DialogDescription>
            Create a link between this issue and another issue in the project.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Link Type</Label>
            <Select value={linkType} onValueChange={(v) => setLinkType(v as LinkType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.entries(LINK_TYPES) as [LinkType, { label: string }][]).map(([key, { label }]) => (
                  <SelectItem key={key} value={key}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Search Issue</Label>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by title or number..."
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          <ScrollArea className="h-48 border rounded-md">
            <div className="p-1">
              {filteredIssues.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-6">
                  No matching issues found.
                </p>
              )}
              {filteredIssues.map((i) => (
                <button
                  key={i.id}
                  className={cn(
                    "w-full flex items-center gap-2 py-1.5 px-2 rounded-sm text-left hover:bg-accent transition-colors",
                    selectedTargetId === i.id && "bg-accent"
                  )}
                  onClick={() => setSelectedTargetId(i.id)}
                >
                  <span className="text-xs font-medium text-muted-foreground shrink-0">
                    {i.issueNumber}
                  </span>
                  <span className="text-sm flex-1 truncate">{i.title}</span>
                  {selectedTargetId === i.id && (
                    <Check className="h-4 w-4 shrink-0 text-primary" />
                  )}
                </button>
              ))}
            </div>
          </ScrollArea>

          {selectedIssue && (
            <div className="text-sm text-muted-foreground">
              Selected: <span className="font-medium text-foreground">{selectedIssue.title}</span>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={resetAndClose}>
            Cancel
          </Button>
          <Button
            disabled={!selectedTargetId || createLinkMutation.isPending}
            onClick={() => createLinkMutation.mutate()}
          >
            {createLinkMutation.isPending ? "Linking..." : "Link"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
