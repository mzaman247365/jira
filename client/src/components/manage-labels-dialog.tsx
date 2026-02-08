import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { LABEL_COLORS } from "@/lib/constants";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Pencil, Trash2, Plus, Check, X } from "lucide-react";
import type { Label } from "@shared/schema";

interface ManageLabelsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
}

export function ManageLabelsDialog({ open, onOpenChange, projectId }: ManageLabelsDialogProps) {
  const { toast } = useToast();
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState<string>(LABEL_COLORS[0]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editColor, setEditColor] = useState<string>("");

  const { data: labels = [] } = useQuery<Label[]>({
    queryKey: ["/api/projects", projectId, "labels"],
    enabled: open,
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", `/api/projects/${projectId}/labels`, {
        name: newName.trim(),
        color: newColor,
        projectId,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId, "labels"] });
      setNewName("");
      setNewColor(LABEL_COLORS[0]);
      toast({ title: "Label created" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to create label", description: error.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, name, color }: { id: string; name: string; color: string }) => {
      await apiRequest("PATCH", `/api/labels/${id}`, { name, color });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId, "labels"] });
      setEditingId(null);
      toast({ title: "Label updated" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to update label", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/labels/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId, "labels"] });
      toast({ title: "Label deleted" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to delete label", description: error.message, variant: "destructive" });
    },
  });

  const startEditing = (label: Label) => {
    setEditingId(label.id);
    setEditName(label.name);
    setEditColor(label.color || LABEL_COLORS[0]);
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditName("");
    setEditColor("");
  };

  const confirmEdit = () => {
    if (!editingId || !editName.trim()) return;
    updateMutation.mutate({ id: editingId, name: editName.trim(), color: editColor });
  };

  const handleDelete = (id: string) => {
    if (window.confirm("Are you sure you want to delete this label?")) {
      deleteMutation.mutate(id);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Manage Labels</DialogTitle>
          <DialogDescription>
            Create, edit, and delete labels for this project.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Add Label Form */}
          <div className="space-y-3 border rounded-lg p-3">
            <div className="flex items-center gap-2">
              <Input
                placeholder="Label name"
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
            <div className="flex gap-1.5 flex-wrap">
              {LABEL_COLORS.map((color) => (
                <button
                  key={color}
                  className="h-6 w-6 rounded-full border-2 transition-all"
                  style={{
                    backgroundColor: color,
                    borderColor: newColor === color ? "white" : "transparent",
                    boxShadow: newColor === color ? `0 0 0 2px ${color}` : "none",
                  }}
                  onClick={() => setNewColor(color)}
                />
              ))}
            </div>
          </div>

          {/* Existing Labels */}
          <div className="space-y-1 max-h-64 overflow-y-auto">
            {labels.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">
                No labels yet. Create one above.
              </p>
            )}
            {labels.map((label) => (
              <div
                key={label.id}
                className="flex items-center gap-2 py-1.5 px-2 rounded-md hover:bg-muted/50 group"
              >
                {editingId === label.id ? (
                  <>
                    <div
                      className="h-3 w-3 rounded-full shrink-0"
                      style={{ backgroundColor: editColor }}
                    />
                    <Input
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="h-7 text-sm flex-1"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") confirmEdit();
                        if (e.key === "Escape") cancelEditing();
                      }}
                      autoFocus
                    />
                    <div className="flex gap-0.5 flex-wrap">
                      {LABEL_COLORS.map((color) => (
                        <button
                          key={color}
                          className="h-4 w-4 rounded-full border transition-all"
                          style={{
                            backgroundColor: color,
                            borderColor: editColor === color ? "white" : "transparent",
                            boxShadow: editColor === color ? `0 0 0 1px ${color}` : "none",
                          }}
                          onClick={() => setEditColor(color)}
                        />
                      ))}
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
                    <div
                      className="h-3 w-3 rounded-full shrink-0"
                      style={{ backgroundColor: label.color || "#6B778C" }}
                    />
                    <span className="text-sm flex-1 truncate">{label.name}</span>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-6 w-6 opacity-0 group-hover:opacity-100"
                      onClick={() => startEditing(label)}
                    >
                      <Pencil className="h-3 w-3" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-6 w-6 opacity-0 group-hover:opacity-100 text-destructive"
                      onClick={() => handleDelete(label.id)}
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
