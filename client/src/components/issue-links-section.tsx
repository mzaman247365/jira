import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { LINK_TYPES } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Link2, X, Plus } from "lucide-react";
import { LinkIssueDialog } from "@/components/link-issue-dialog";
import type { Issue, Project, IssueLink } from "@shared/schema";
import type { LinkType } from "@/lib/constants";

interface IssueLinksSectionProps {
  issue: Issue;
  project: Project;
}

export function IssueLinksSection({ issue, project }: IssueLinksSectionProps) {
  const { toast } = useToast();
  const [linkDialogOpen, setLinkDialogOpen] = useState(false);

  const { data: links = [] } = useQuery<IssueLink[]>({
    queryKey: ["/api/issues", issue.id, "links"],
  });

  const { data: projectIssues = [] } = useQuery<Issue[]>({
    queryKey: ["/api/projects", project.id, "issues"],
  });

  const deleteLinkMutation = useMutation({
    mutationFn: async (linkId: string) => {
      await apiRequest("DELETE", `/api/issue-links/${linkId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/issues", issue.id, "links"] });
      toast({ title: "Link removed" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to remove link", description: error.message, variant: "destructive" });
    },
  });

  const getLinkedIssue = (link: IssueLink): Issue | undefined => {
    const linkedIssueId = link.sourceIssueId === issue.id ? link.targetIssueId : link.sourceIssueId;
    return projectIssues.find((i) => i.id === linkedIssueId);
  };

  const getLinkLabel = (link: IssueLink): string => {
    const linkType = link.linkType as LinkType;
    if (link.sourceIssueId === issue.id) {
      return LINK_TYPES[linkType]?.label || linkType;
    }
    return LINK_TYPES[linkType]?.inverse || linkType;
  };

  // Group links by their display label
  const groupedLinks: Record<string, { link: IssueLink; linkedIssue: Issue | undefined }[]> = {};
  for (const link of links) {
    const label = getLinkLabel(link);
    if (!groupedLinks[label]) {
      groupedLinks[label] = [];
    }
    groupedLinks[label].push({ link, linkedIssue: getLinkedIssue(link) });
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium flex items-center gap-1.5">
          <Link2 className="h-3.5 w-3.5" />
          Linked Issues {links.length > 0 && `(${links.length})`}
        </span>
        <Button
          variant="ghost"
          size="sm"
          className="gap-1 h-7 text-muted-foreground"
          onClick={() => setLinkDialogOpen(true)}
        >
          <Plus className="h-3.5 w-3.5" />
          Link Issue
        </Button>
      </div>

      {links.length === 0 && (
        <p className="text-sm text-muted-foreground">No linked issues.</p>
      )}

      {Object.entries(groupedLinks).map(([label, items]) => (
        <div key={label} className="space-y-1">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            {label}
          </span>
          {items.map(({ link, linkedIssue }) => {
            const issueKey = linkedIssue
              ? `${project.key}-${linkedIssue.issueNumber}`
              : "Unknown";
            return (
              <div
                key={link.id}
                className="flex items-center gap-2 py-1.5 px-2 rounded-md hover:bg-muted/50 group"
              >
                <span className="text-xs font-medium text-muted-foreground shrink-0">
                  {issueKey}
                </span>
                <span className="text-sm flex-1 truncate">
                  {linkedIssue?.title || "Unknown issue"}
                </span>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-6 w-6 opacity-0 group-hover:opacity-100 text-muted-foreground"
                  onClick={() => deleteLinkMutation.mutate(link.id)}
                  disabled={deleteLinkMutation.isPending}
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
            );
          })}
        </div>
      ))}

      <LinkIssueDialog
        open={linkDialogOpen}
        onOpenChange={setLinkDialogOpen}
        issueId={issue.id}
        projectId={project.id}
      />
    </div>
  );
}
