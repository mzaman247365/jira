import { useQuery, useMutation } from "@tanstack/react-query";
import { useRoute, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { useForm } from "react-hook-form";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { PROJECT_COLORS } from "@/lib/constants";
import { ProjectAvatar } from "@/components/project-avatar";
import { Trash2 } from "lucide-react";
import type { Project } from "@shared/schema";
import { useEffect } from "react";

export default function ProjectSettings() {
  const [, params] = useRoute("/project/:projectId/settings");
  const projectId = params?.projectId || "";
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const { data: project, isLoading } = useQuery<Project>({
    queryKey: ["/api/projects", projectId],
    enabled: !!projectId,
  });

  const { register, handleSubmit, watch, setValue, reset } = useForm({
    defaultValues: { name: "", description: "", avatarColor: "#4C9AFF" },
  });

  useEffect(() => {
    if (project) {
      reset({
        name: project.name,
        description: project.description || "",
        avatarColor: project.avatarColor || "#4C9AFF",
      });
    }
  }, [project, reset]);

  const selectedColor = watch("avatarColor");
  const name = watch("name");

  const updateMutation = useMutation({
    mutationFn: async (data: any) => {
      await apiRequest("PATCH", `/api/projects/${projectId}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId] });
      toast({ title: "Project updated" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("DELETE", `/api/projects/${projectId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      toast({ title: "Project deleted" });
      setLocation("/");
    },
  });

  if (isLoading) {
    return (
      <div className="max-w-2xl mx-auto p-6 space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (!project) return null;

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-xl font-semibold" data-testid="text-settings-title">Project Settings</h1>
        <p className="text-sm text-muted-foreground">Manage your project configuration.</p>
      </div>

      <Card className="p-6">
        <form
          onSubmit={handleSubmit((data) => updateMutation.mutate(data))}
          className="space-y-5"
        >
          <div className="flex items-center gap-4">
            <ProjectAvatar name={name || project.name} color={selectedColor} size="lg" />
            <div>
              <h3 className="font-semibold">{project.key}</h3>
              <p className="text-sm text-muted-foreground">Project key cannot be changed</p>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="settings-name">Name</Label>
            <Input id="settings-name" {...register("name")} data-testid="input-settings-name" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="settings-description">Description</Label>
            <Textarea id="settings-description" {...register("description")} data-testid="input-settings-description" />
          </div>

          <div className="space-y-2">
            <Label>Color</Label>
            <div className="flex flex-wrap gap-2">
              {PROJECT_COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setValue("avatarColor", color)}
                  className={`h-8 w-8 rounded-md transition-transform ${
                    selectedColor === color ? "ring-2 ring-primary ring-offset-2 ring-offset-background scale-110" : ""
                  }`}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </div>

          <div className="flex justify-end">
            <Button type="submit" disabled={updateMutation.isPending} data-testid="button-save-settings">
              {updateMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </form>
      </Card>

      <Card className="p-6 space-y-4">
        <div>
          <h3 className="font-semibold text-destructive">Danger Zone</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Deleting this project will permanently remove all issues and data.
          </p>
        </div>
        <Button
          variant="destructive"
          onClick={() => {
            if (confirm("Are you sure you want to delete this project? This action cannot be undone.")) {
              deleteMutation.mutate();
            }
          }}
          disabled={deleteMutation.isPending}
          className="gap-1.5"
          data-testid="button-delete-project"
        >
          <Trash2 className="h-4 w-4" /> Delete Project
        </Button>
      </Card>
    </div>
  );
}
