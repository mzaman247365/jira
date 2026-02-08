import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useRoute } from "wouter";
import {
  Plus,
  Package,
  Pencil,
  Trash2,
  Rocket,
  Calendar,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { VERSION_STATUSES, type VersionStatus } from "@/lib/constants";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Version, Issue, Project } from "@shared/schema";

export default function Releases() {
  const [, params] = useRoute("/project/:projectId/releases");
  const projectId = params?.projectId || "";
  const { toast } = useToast();

  const [createOpen, setCreateOpen] = useState(false);
  const [editVersion, setEditVersion] = useState<Version | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    startDate: "",
    releaseDate: "",
  });

  const { data: project, isLoading: projectLoading } = useQuery<Project>({
    queryKey: ["/api/projects", projectId],
    enabled: !!projectId,
  });

  const { data: versions = [], isLoading: versionsLoading } = useQuery<Version[]>({
    queryKey: ["/api/projects", projectId, "versions"],
    enabled: !!projectId,
  });

  const { data: issues = [] } = useQuery<Issue[]>({
    queryKey: ["/api/projects", projectId, "issues"],
    enabled: !!projectId,
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      await apiRequest("POST", `/api/projects/${projectId}/versions`, {
        ...data,
        projectId,
        startDate: data.startDate || null,
        releaseDate: data.releaseDate || null,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId, "versions"] });
      setCreateOpen(false);
      resetForm();
      toast({ title: "Version created" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: typeof formData }) => {
      await apiRequest("PATCH", `/api/versions/${id}`, {
        ...data,
        startDate: data.startDate || null,
        releaseDate: data.releaseDate || null,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId, "versions"] });
      setEditVersion(null);
      resetForm();
      toast({ title: "Version updated" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/versions/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId, "versions"] });
      toast({ title: "Version deleted" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const releaseMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("POST", `/api/versions/${id}/release`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId, "versions"] });
      toast({ title: "Version released" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const resetForm = () => {
    setFormData({ name: "", description: "", startDate: "", releaseDate: "" });
  };

  const openEdit = (version: Version) => {
    setEditVersion(version);
    setFormData({
      name: version.name,
      description: version.description || "",
      startDate: version.startDate
        ? new Date(version.startDate).toISOString().split("T")[0]
        : "",
      releaseDate: version.releaseDate
        ? new Date(version.releaseDate).toISOString().split("T")[0]
        : "",
    });
  };

  const formatDate = (date: string | Date | null | undefined) => {
    if (!date) return "--";
    return new Date(date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const getVersionProgress = (versionId: string) => {
    const versionIssues = issues.filter((i) => i.fixVersionId === versionId);
    if (versionIssues.length === 0) return { done: 0, total: 0, pct: 0 };
    const done = versionIssues.filter((i) => i.status === "done").length;
    return { done, total: versionIssues.length, pct: Math.round((done / versionIssues.length) * 100) };
  };

  if (projectLoading || versionsLoading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-8 w-48" />
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-32 w-full" />
        ))}
      </div>
    );
  }

  if (!project) return null;

  const versionFormDialog = (
    open: boolean,
    onOpenChange: (v: boolean) => void,
    title: string,
    onSubmit: () => void,
    isPending: boolean,
    submitLabel: string,
  ) => (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="version-name">Name</Label>
            <Input
              id="version-name"
              value={formData.name}
              onChange={(e) => setFormData((f) => ({ ...f, name: e.target.value }))}
              placeholder="e.g., v1.0.0"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="version-desc">Description</Label>
            <Textarea
              id="version-desc"
              value={formData.description}
              onChange={(e) => setFormData((f) => ({ ...f, description: e.target.value }))}
              placeholder="What's in this release?"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="version-start">Start Date</Label>
              <Input
                id="version-start"
                type="date"
                value={formData.startDate}
                onChange={(e) => setFormData((f) => ({ ...f, startDate: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="version-release">Release Date</Label>
              <Input
                id="version-release"
                type="date"
                value={formData.releaseDate}
                onChange={(e) => setFormData((f) => ({ ...f, releaseDate: e.target.value }))}
              />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={onSubmit} disabled={isPending || !formData.name.trim()}>
            {isPending ? "Saving..." : submitLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between gap-4 px-6 py-4 border-b flex-wrap">
        <div>
          <h1 className="text-xl font-semibold">{project.name} Releases</h1>
          <p className="text-sm text-muted-foreground">
            {versions.length} version{versions.length !== 1 ? "s" : ""}
          </p>
        </div>
        <Button
          onClick={() => {
            resetForm();
            setCreateOpen(true);
          }}
          className="gap-1.5"
        >
          <Plus className="h-4 w-4" /> Create Version
        </Button>
      </div>

      <div className="flex-1 overflow-auto p-6 space-y-4">
        {versions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-4 text-center">
            <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center">
              <Package className="h-8 w-8 text-muted-foreground" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">No versions yet</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Create a version to start tracking releases.
              </p>
            </div>
          </div>
        ) : (
          versions.map((version) => {
            const { done, total, pct } = getVersionProgress(version.id);
            const statusConfig = VERSION_STATUSES[version.status as VersionStatus];

            return (
              <Card key={version.id} className="p-5 space-y-3">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1 min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-base">{version.name}</h3>
                      <Badge
                        className="text-white text-xs"
                        style={{ backgroundColor: statusConfig?.color || "#6B778C" }}
                      >
                        {statusConfig?.label || version.status}
                      </Badge>
                    </div>
                    {version.description && (
                      <p className="text-sm text-muted-foreground">{version.description}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    {version.status === "unreleased" && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => releaseMutation.mutate(version.id)}
                        disabled={releaseMutation.isPending}
                        className="gap-1"
                      >
                        <Rocket className="h-3.5 w-3.5" /> Release
                      </Button>
                    )}
                    <Button variant="ghost" size="icon" onClick={() => openEdit(version)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        if (confirm("Delete this version?")) {
                          deleteMutation.mutate(version.id);
                        }
                      }}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>

                <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
                  <div className="flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5" />
                    {formatDate(version.startDate)} - {formatDate(version.releaseDate)}
                  </div>
                </div>

                {total > 0 && (
                  <div className="flex items-center gap-3">
                    <Progress value={pct} className="h-2 flex-1" />
                    <span className="text-xs text-muted-foreground font-medium whitespace-nowrap">
                      {done}/{total} done ({pct}%)
                    </span>
                  </div>
                )}
              </Card>
            );
          })
        )}
      </div>

      {versionFormDialog(
        createOpen,
        setCreateOpen,
        "Create Version",
        () => createMutation.mutate(formData),
        createMutation.isPending,
        "Create",
      )}

      {versionFormDialog(
        !!editVersion,
        (open) => {
          if (!open) setEditVersion(null);
        },
        "Edit Version",
        () => {
          if (editVersion) {
            updateMutation.mutate({ id: editVersion.id, data: formData });
          }
        },
        updateMutation.isPending,
        "Save Changes",
      )}
    </div>
  );
}
