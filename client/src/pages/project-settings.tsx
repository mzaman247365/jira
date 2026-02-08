import { useQuery, useMutation } from "@tanstack/react-query";
import { useRoute, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useForm } from "react-hook-form";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { PROJECT_COLORS, LABEL_COLORS, STATUSES, STATUS_COLUMNS, PROJECT_ROLES } from "@/lib/constants";
import { ProjectAvatar } from "@/components/project-avatar";
import { WorkflowEditor } from "@/components/workflow-editor";
import {
  Trash2,
  Pencil,
  Plus,
  Check,
  X,
  ArrowUp,
  ArrowDown,
  Settings2,
  Tags,
  Component,
  LayoutDashboard,
  GitBranch,
  Users,
  Settings,
  Search,
  UserPlus,
  Shield,
} from "lucide-react";
import type { Project, Label as LabelType, Component as ComponentType, BoardConfig, ProjectMember } from "@shared/schema";
import type { User } from "@shared/models/auth";
import { useState, useEffect } from "react";

// ── Swimlane Options ────────────────────────────────────────────────────
const SWIMLANE_OPTIONS = [
  { value: "none", label: "None" },
  { value: "assignee", label: "Assignee" },
  { value: "priority", label: "Priority" },
  { value: "type", label: "Issue Type" },
];

// ── Labels Tab ──────────────────────────────────────────────────────────
function LabelsTab({ projectId }: { projectId: string }) {
  const { toast } = useToast();
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState<string>(LABEL_COLORS[0]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editColor, setEditColor] = useState<string>("");

  const { data: labels = [], isLoading } = useQuery<LabelType[]>({
    queryKey: ["/api/projects", projectId, "labels"],
    enabled: !!projectId,
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

  const startEditing = (label: LabelType) => {
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

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-8 w-full" />
      </div>
    );
  }

  return (
    <Card className="p-6">
      <div className="space-y-5">
        <div className="flex items-center gap-2">
          <Tags className="h-5 w-5 text-muted-foreground" />
          <div>
            <h3 className="font-semibold">Project Labels</h3>
            <p className="text-sm text-muted-foreground">
              Create and manage labels to categorize issues in this project.
            </p>
          </div>
        </div>

        <Separator />

        {/* Create Label */}
        <div className="space-y-3 border rounded-lg p-4">
          <h4 className="text-sm font-medium">Add New Label</h4>
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
        <div className="space-y-1">
          {labels.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-6">
              No labels yet. Create one above.
            </p>
          )}
          {labels.map((label) => (
            <div
              key={label.id}
              className="flex items-center gap-2 py-2 px-3 rounded-md hover:bg-muted/50 group"
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
                    className="h-8 text-sm flex-1"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") confirmEdit();
                      if (e.key === "Escape") cancelEditing();
                    }}
                    autoFocus
                  />
                  <div className="flex gap-1 flex-wrap">
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
                    className="h-7 w-7"
                    onClick={confirmEdit}
                    disabled={updateMutation.isPending}
                  >
                    <Check className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7"
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
                    className="h-7 w-7 opacity-0 group-hover:opacity-100"
                    onClick={() => startEditing(label)}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7 opacity-0 group-hover:opacity-100 text-destructive"
                    onClick={() => handleDelete(label.id)}
                    disabled={deleteMutation.isPending}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </>
              )}
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}

// ── Components Tab ──────────────────────────────────────────────────────
function ComponentsTab({ projectId }: { projectId: string }) {
  const { toast } = useToast();
  const [newName, setNewName] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");

  const { data: components = [], isLoading } = useQuery<ComponentType[]>({
    queryKey: ["/api/projects", projectId, "components"],
    enabled: !!projectId,
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
    mutationFn: async ({ id, name, description }: { id: string; name: string; description: string }) => {
      await apiRequest("PATCH", `/api/components/${id}`, { name, description: description || null });
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

  const startEditing = (component: ComponentType) => {
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
    updateMutation.mutate({ id: editingId, name: editName.trim(), description: editDescription.trim() });
  };

  const handleDelete = (id: string) => {
    if (window.confirm("Are you sure you want to delete this component?")) {
      deleteMutation.mutate(id);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-8 w-full" />
      </div>
    );
  }

  return (
    <Card className="p-6">
      <div className="space-y-5">
        <div className="flex items-center gap-2">
          <Component className="h-5 w-5 text-muted-foreground" />
          <div>
            <h3 className="font-semibold">Project Components</h3>
            <p className="text-sm text-muted-foreground">
              Manage components to organize issues by area or module.
            </p>
          </div>
        </div>

        <Separator />

        {/* Create Component */}
        <div className="space-y-3 border rounded-lg p-4">
          <h4 className="text-sm font-medium">Add New Component</h4>
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
        <div className="space-y-1">
          {components.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-6">
              No components yet. Create one above.
            </p>
          )}
          {components.map((component) => (
            <div
              key={component.id}
              className="flex items-center gap-3 py-2 px-3 rounded-md hover:bg-muted/50 group"
            >
              {editingId === component.id ? (
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2">
                    <Input
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="h-8 text-sm flex-1"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") confirmEdit();
                        if (e.key === "Escape") cancelEditing();
                      }}
                      autoFocus
                      placeholder="Component name"
                    />
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7"
                      onClick={confirmEdit}
                      disabled={updateMutation.isPending}
                    >
                      <Check className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7"
                      onClick={cancelEditing}
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                  <Input
                    value={editDescription}
                    onChange={(e) => setEditDescription(e.target.value)}
                    className="h-8 text-sm"
                    placeholder="Description (optional)"
                  />
                </div>
              ) : (
                <>
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-medium">{component.name}</span>
                    {component.description && (
                      <p className="text-xs text-muted-foreground truncate">{component.description}</p>
                    )}
                  </div>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7 opacity-0 group-hover:opacity-100"
                    onClick={() => startEditing(component)}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7 opacity-0 group-hover:opacity-100 text-destructive"
                    onClick={() => handleDelete(component.id)}
                    disabled={deleteMutation.isPending}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </>
              )}
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}

// ── Board Tab ───────────────────────────────────────────────────────────
function BoardTab({ projectId }: { projectId: string }) {
  const { toast } = useToast();

  const [swimlaneBy, setSwimlaneBy] = useState("none");
  const [wipLimits, setWipLimits] = useState<Record<string, number>>({});
  const [columnOrder, setColumnOrder] = useState<string[]>([...STATUS_COLUMNS]);

  const { data: config, isLoading } = useQuery<BoardConfig>({
    queryKey: ["/api/projects", projectId, "board-config"],
    enabled: !!projectId,
  });

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

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  return (
    <Card className="p-6">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Settings2 className="h-5 w-5 text-muted-foreground" />
            <div>
              <h3 className="font-semibold">Board Configuration</h3>
              <p className="text-sm text-muted-foreground">
                Configure swimlanes, WIP limits, and column order for the board view.
              </p>
            </div>
          </div>
          <Button
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending}
          >
            {saveMutation.isPending ? "Saving..." : "Save Configuration"}
          </Button>
        </div>

        <Separator />

        {/* Swimlane setting */}
        <div className="space-y-2">
          <Label>Swimlanes</Label>
          <Select value={swimlaneBy} onValueChange={setSwimlaneBy}>
            <SelectTrigger className="w-64">
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
              const statusLabel =
                STATUSES[status as keyof typeof STATUSES]?.label ?? status;
              return (
                <div key={status} className="flex items-center gap-3">
                  <span className="text-sm w-28 truncate">{statusLabel}</span>
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
              const statusLabel =
                STATUSES[status as keyof typeof STATUSES]?.label ?? status;
              return (
                <div
                  key={status}
                  className="flex items-center gap-2 p-2 rounded-md bg-muted/50"
                >
                  <span className="flex-1 text-sm font-medium">{statusLabel}</span>
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
      </div>
    </Card>
  );
}

// ── Members Tab ─────────────────────────────────────────────────────────
interface MemberWithUser extends ProjectMember {
  user?: User | null;
}

function MembersTab({ projectId }: { projectId: string }) {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedRole, setSelectedRole] = useState<string>("member");

  const { data: members = [], isLoading } = useQuery<MemberWithUser[]>({
    queryKey: ["/api/projects", projectId, "members"],
    enabled: !!projectId,
  });

  const addMemberMutation = useMutation({
    mutationFn: async (userId: string) => {
      await apiRequest("POST", `/api/projects/${projectId}/members`, {
        projectId,
        userId,
        role: selectedRole,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId, "members"] });
      setSearchQuery("");
      setSearchResults([]);
      toast({ title: "Member added" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to add member", description: error.message, variant: "destructive" });
    },
  });

  const updateRoleMutation = useMutation({
    mutationFn: async ({ memberId, role }: { memberId: string; role: string }) => {
      await apiRequest("PATCH", `/api/projects/${projectId}/members/${memberId}`, { role });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId, "members"] });
      toast({ title: "Member role updated" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to update role", description: error.message, variant: "destructive" });
    },
  });

  const removeMemberMutation = useMutation({
    mutationFn: async (memberId: string) => {
      await apiRequest("DELETE", `/api/projects/${projectId}/members/${memberId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId, "members"] });
      toast({ title: "Member removed" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to remove member", description: error.message, variant: "destructive" });
    },
  });

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }
    setIsSearching(true);
    try {
      const res = await apiRequest("GET", `/api/users/search?q=${encodeURIComponent(searchQuery.trim())}`);
      const users: User[] = await res.json();
      // Filter out users who are already members
      const memberUserIds = new Set(members.map((m) => m.userId));
      setSearchResults(users.filter((u) => !memberUserIds.has(u.id)));
    } catch {
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleRemoveMember = (memberId: string) => {
    if (window.confirm("Are you sure you want to remove this member?")) {
      removeMemberMutation.mutate(memberId);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-8 w-full" />
      </div>
    );
  }

  return (
    <Card className="p-6">
      <div className="space-y-5">
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5 text-muted-foreground" />
          <div>
            <h3 className="font-semibold">Project Members</h3>
            <p className="text-sm text-muted-foreground">
              Manage who has access to this project and their roles.
            </p>
          </div>
        </div>

        <Separator />

        {/* Add Member */}
        <div className="space-y-3 border rounded-lg p-4">
          <h4 className="text-sm font-medium flex items-center gap-1.5">
            <UserPlus className="h-4 w-4" />
            Add Member
          </h4>
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search users by name or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSearch();
                }}
              />
            </div>
            <Select value={selectedRole} onValueChange={setSelectedRole}>
              <SelectTrigger className="w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(PROJECT_ROLES).map(([key, val]) => (
                  <SelectItem key={key} value={key}>
                    {val.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              size="sm"
              variant="secondary"
              onClick={handleSearch}
              disabled={isSearching || !searchQuery.trim()}
            >
              <Search className="h-4 w-4 mr-1" />
              Search
            </Button>
          </div>

          {/* Search Results */}
          {searchResults.length > 0 && (
            <div className="space-y-1 border rounded-md p-2 max-h-48 overflow-y-auto">
              {searchResults.map((user) => (
                <div
                  key={user.id}
                  className="flex items-center justify-between py-1.5 px-2 rounded-md hover:bg-muted/50"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    {user.profileImageUrl ? (
                      <img
                        src={user.profileImageUrl}
                        alt=""
                        className="h-6 w-6 rounded-full"
                      />
                    ) : (
                      <div className="h-6 w-6 rounded-full bg-muted flex items-center justify-center text-xs font-medium">
                        {(user.firstName?.[0] || user.username?.[0] || "?").toUpperCase()}
                      </div>
                    )}
                    <div className="min-w-0">
                      <span className="text-sm font-medium truncate block">
                        {user.firstName} {user.lastName}
                      </span>
                      <span className="text-xs text-muted-foreground truncate block">
                        {user.email || user.username}
                      </span>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => addMemberMutation.mutate(user.id)}
                    disabled={addMemberMutation.isPending}
                  >
                    <Plus className="h-3.5 w-3.5 mr-1" />
                    Add
                  </Button>
                </div>
              ))}
            </div>
          )}

          {searchQuery.trim() && searchResults.length === 0 && !isSearching && (
            <p className="text-sm text-muted-foreground text-center py-2">
              No users found matching your search.
            </p>
          )}
        </div>

        {/* Current Members */}
        <div className="space-y-1">
          <h4 className="text-sm font-medium mb-2">
            Current Members ({members.length})
          </h4>
          {members.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-6">
              No members yet. Add someone above.
            </p>
          )}
          {members.map((member) => {
            const roleInfo = PROJECT_ROLES[member.role as keyof typeof PROJECT_ROLES];
            return (
              <div
                key={member.id}
                className="flex items-center gap-3 py-2 px-3 rounded-md hover:bg-muted/50 group"
              >
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  {member.user?.profileImageUrl ? (
                    <img
                      src={member.user.profileImageUrl}
                      alt=""
                      className="h-7 w-7 rounded-full"
                    />
                  ) : (
                    <div className="h-7 w-7 rounded-full bg-muted flex items-center justify-center text-xs font-medium">
                      {(member.user?.firstName?.[0] || member.user?.username?.[0] || "?").toUpperCase()}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <span className="text-sm font-medium truncate block">
                      {member.user?.firstName} {member.user?.lastName}
                    </span>
                    <span className="text-xs text-muted-foreground truncate block">
                      {member.user?.email || member.user?.username || member.userId}
                    </span>
                  </div>
                </div>

                <Select
                  value={member.role}
                  onValueChange={(role) =>
                    updateRoleMutation.mutate({ memberId: member.id, role })
                  }
                >
                  <SelectTrigger className="w-36 h-8">
                    <div className="flex items-center gap-1.5">
                      <Shield className="h-3 w-3" />
                      <SelectValue />
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(PROJECT_ROLES).map(([key, val]) => (
                      <SelectItem key={key} value={key}>
                        <div>
                          <div className="font-medium">{val.label}</div>
                          <div className="text-xs text-muted-foreground">{val.description}</div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7 opacity-0 group-hover:opacity-100 text-destructive"
                  onClick={() => handleRemoveMember(member.id)}
                  disabled={removeMemberMutation.isPending}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            );
          })}
        </div>
      </div>
    </Card>
  );
}

// ── Main Page Component ─────────────────────────────────────────────────
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
      <div className="max-w-3xl mx-auto p-6 space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (!project) return null;

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-xl font-semibold" data-testid="text-settings-title">Project Settings</h1>
        <p className="text-sm text-muted-foreground">Manage your project configuration.</p>
      </div>

      <Tabs defaultValue="general" className="space-y-6">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="general" className="gap-1.5">
            <Settings className="h-3.5 w-3.5" />
            General
          </TabsTrigger>
          <TabsTrigger value="labels" className="gap-1.5">
            <Tags className="h-3.5 w-3.5" />
            Labels
          </TabsTrigger>
          <TabsTrigger value="components" className="gap-1.5">
            <Component className="h-3.5 w-3.5" />
            Components
          </TabsTrigger>
          <TabsTrigger value="board" className="gap-1.5">
            <LayoutDashboard className="h-3.5 w-3.5" />
            Board
          </TabsTrigger>
          <TabsTrigger value="workflow" className="gap-1.5">
            <GitBranch className="h-3.5 w-3.5" />
            Workflow
          </TabsTrigger>
          <TabsTrigger value="members" className="gap-1.5">
            <Users className="h-3.5 w-3.5" />
            Members
          </TabsTrigger>
        </TabsList>

        {/* ── General Tab ──────────────────────────────────────────────── */}
        <TabsContent value="general" className="space-y-6">
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
        </TabsContent>

        {/* ── Labels Tab ───────────────────────────────────────────────── */}
        <TabsContent value="labels">
          <LabelsTab projectId={projectId} />
        </TabsContent>

        {/* ── Components Tab ───────────────────────────────────────────── */}
        <TabsContent value="components">
          <ComponentsTab projectId={projectId} />
        </TabsContent>

        {/* ── Board Tab ────────────────────────────────────────────────── */}
        <TabsContent value="board">
          <BoardTab projectId={projectId} />
        </TabsContent>

        {/* ── Workflow Tab ─────────────────────────────────────────────── */}
        <TabsContent value="workflow">
          <Card className="p-6">
            <WorkflowEditor projectId={projectId} />
          </Card>
        </TabsContent>

        {/* ── Members Tab ──────────────────────────────────────────────── */}
        <TabsContent value="members">
          <MembersTab projectId={projectId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
