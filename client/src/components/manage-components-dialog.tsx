import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Pencil, Trash2, Plus, Check, X, Package } from "lucide-react";
import type { Component as ProjectComponent } from "@shared/schema";

interface ManageComponentsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
}

export function ManageComponentsDialog({ open, onOpenChange, projectId }: ManageComponentsDialogProps) {
  const { toast } = useToast();
  const [newName, setNewName] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");

  const { data: components = [] } = useQuery<ProjectComponent[]>({
    queryKey: ["/api/projects", projectId, "components"],
    enabled: open,
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", `/api/projects/${projectId}/components`, {
        name: newName.trim(),
        description: newDescription.trim() || null,
        projectId,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId, "components"] });
      setNewName("");
      setNewDescription("");
      toast({ title: "Component created" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to create component", description: error.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, name, description }: { id: string; name: string; description: string | null }) => {
      await apiRequest("PATCH", `/api/components/${id}`, { name, description });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId, "components"] });
      setEditingId(null);
      toast({ title: "Component updated" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to update component", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/components/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId, "components"] });
      toast({ title: "Component deleted" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to delete component", description: error.message, variant: "destructive" });
    },
  });

  const startEditing = (component: ProjectComponent) => {
    setEditingId(component.id);
    setEditName(component.name);
    setEditDescription(component.description || "");
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditName("");
    setEditDescription("");
  };

  const confirmEdit = () => {
    if (!editingId || !editName.trim()) return;
    updateMutation.mutate({
      id: editingId,
      name: editName.trim(),
      description: editDescription.trim() || null,
    });
  };

  const handleDelete = (id: string) => {
    if (window.confirm("Are you sure you want to delete this component?")) {
      deleteMutation.mutate(id);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Manage Components</DialogTitle>
          <DialogDescription>
            Create, edit, and delete components for this project.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Add Component Form */}
          <div className="space-y-3 border rounded-lg p-3">
            <div className="flex items-center gap-2">
              <Input
                placeholder="Component name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="flex-1"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && newName.trim()) {
                    createMutation.mutate();
                  }
                }}
              />
              <Button
                size="sm"
                disabled={!newName.trim() || createMutation.isPending}
                onClick={() => createMutation.mutate()}
              >
                <Plus className="h-4 w-4 mr-1" />
                Add
              </Button>
            </div>
            <Input
              placeholder="Description (optional)"
              value={newDescription}
              onChange={(e) => setNewDescription(e.target.value)}
            />
          </div>

          {/* Existing Components */}
          <div className="space-y-1 max-h-64 overflow-y-auto">
            {components.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">
                No components yet. Create one above.
              </p>
            )}
            {components.map((component) => (
              <div
                key={component.id}
                className="flex items-center gap-2 py-1.5 px-2 rounded-md hover:bg-muted/50 group"
              >
                {editingId === component.id ? (
                  <>
                    <Package className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    <div className="flex-1 space-y-1 min-w-0">
                      <Input
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="h-7 text-sm"
                        onKeyDown={(e) => {
                          if (e.key === "Enter") confirmEdit();
                          if (e.key === "Escape") cancelEditing();
                        }}
                        autoFocus
                      />
                      <Input
                        value={editDescription}
                        onChange={(e) => setEditDescription(e.target.value)}
                        placeholder="Description (optional)"
                        className="h-7 text-sm"
                        onKeyDown={(e) => {
                          if (e.key === "Enter") confirmEdit();
                          if (e.key === "Escape") cancelEditing();
                        }}
                      />
                    </div>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-6 w-6"
                      onClick={confirmEdit}
                      disabled={updateMutation.isPending}
                    >
                      <Check className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-6 w-6"
                      onClick={cancelEditing}
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </>
                ) : (
                  <>
                    <Package className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    <div className="flex-1 min-w-0">
                      <span className="text-sm truncate block">{component.name}</span>
                      {component.description && (
                        <span className="text-xs text-muted-foreground truncate block">
                          {component.description}
                        </span>
                      )}
                    </div>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-6 w-6 opacity-0 group-hover:opacity-100"
                      onClick={() => startEditing(component)}
                    >
                      <Pencil className="h-3 w-3" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-6 w-6 opacity-0 group-hover:opacity-100 text-destructive"
                      onClick={() => handleDelete(component.id)}
                      disabled={deleteMutation.isPending}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
