import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useRoute } from "wouter";
import {
  Plus,
  Users,
  Trash2,
  Search,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { UserAvatar } from "@/components/user-avatar";
import { PROJECT_ROLES, type ProjectRole } from "@/lib/constants";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import type { ProjectMember, Project, Issue } from "@shared/schema";
import type { User } from "@shared/models/auth";

export default function Team() {
  const [, params] = useRoute("/project/:projectId/team");
  const projectId = params?.projectId || "";
  const { toast } = useToast();
  const { user: currentUser } = useAuth();

  const [addOpen, setAddOpen] = useState(false);
  const [userSearch, setUserSearch] = useState("");
  const [selectedUserId, setSelectedUserId] = useState("");
  const [selectedRole, setSelectedRole] = useState<string>("member");

  const { data: project, isLoading: projectLoading } = useQuery<Project>({
    queryKey: ["/api/projects", projectId],
    enabled: !!projectId,
  });

  const { data: members = [], isLoading: membersLoading } = useQuery<ProjectMember[]>({
    queryKey: ["/api/projects", projectId, "members"],
    enabled: !!projectId,
  });

  const { data: users = [] } = useQuery<User[]>({
    queryKey: ["/api/users"],
  });

  const { data: issues = [] } = useQuery<Issue[]>({
    queryKey: ["/api/projects", projectId, "issues"],
    enabled: !!projectId,
  });

  const addMemberMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", `/api/projects/${projectId}/members`, {
        projectId,
        userId: selectedUserId,
        role: selectedRole,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId, "members"] });
      setAddOpen(false);
      setSelectedUserId("");
      setSelectedRole("member");
      setUserSearch("");
      toast({ title: "Member added" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const updateRoleMutation = useMutation({
    mutationFn: async ({ memberId, role }: { memberId: string; role: string }) => {
      await apiRequest("PATCH", `/api/project-members/${memberId}`, { role });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId, "members"] });
      toast({ title: "Role updated" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const removeMemberMutation = useMutation({
    mutationFn: async (memberId: string) => {
      await apiRequest("DELETE", `/api/project-members/${memberId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId, "members"] });
      toast({ title: "Member removed" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const getUserById = (userId: string) => users.find((u) => u.id === userId);

  const getAssignedCount = (userId: string) =>
    issues.filter((i) => i.assigneeId === userId).length;

  const memberUserIds = members.map((m) => m.userId);
  const availableUsers = users.filter(
    (u) =>
      !memberUserIds.includes(u.id) &&
      (u.firstName?.toLowerCase().includes(userSearch.toLowerCase()) ||
        u.lastName?.toLowerCase().includes(userSearch.toLowerCase()) ||
        u.email?.toLowerCase().includes(userSearch.toLowerCase()) ||
        u.username?.toLowerCase().includes(userSearch.toLowerCase())),
  );

  if (projectLoading || membersLoading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-8 w-48" />
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-40" />
          ))}
        </div>
      </div>
    );
  }

  if (!project) return null;

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between gap-4 px-6 py-4 border-b flex-wrap">
        <div>
          <h1 className="text-xl font-semibold">{project.name} Team</h1>
          <p className="text-sm text-muted-foreground">
            {members.length} member{members.length !== 1 ? "s" : ""}
          </p>
        </div>
        <Button onClick={() => setAddOpen(true)} className="gap-1.5">
          <Plus className="h-4 w-4" /> Add Member
        </Button>
      </div>

      <div className="flex-1 overflow-auto p-6">
        {members.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-4 text-center">
            <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center">
              <Users className="h-8 w-8 text-muted-foreground" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">No team members</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Add members to start collaborating.
              </p>
            </div>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {members.map((member) => {
              const user = getUserById(member.userId);
              if (!user) return null;

              const assignedCount = getAssignedCount(user.id);
              const roleConfig = PROJECT_ROLES[member.role as ProjectRole];
              const isSelf = currentUser?.id === user.id;

              return (
                <Card key={member.id} className="p-5 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <UserAvatar
                        firstName={user.firstName}
                        lastName={user.lastName}
                        imageUrl={user.profileImageUrl}
                        size="lg"
                      />
                      <div className="min-w-0">
                        <p className="font-semibold truncate">
                          {user.firstName} {user.lastName}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                      </div>
                    </div>
                    {!isSelf && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="flex-shrink-0"
                        onClick={() => {
                          if (confirm("Remove this member?")) {
                            removeMemberMutation.mutate(member.id);
                          }
                        }}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>

                  <div className="flex items-center justify-between gap-2">
                    <Select
                      value={member.role}
                      onValueChange={(role) =>
                        updateRoleMutation.mutate({ memberId: member.id, role })
                      }
                    >
                      <SelectTrigger className="h-8 text-xs w-auto">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(PROJECT_ROLES).map(([key, { label }]) => (
                          <SelectItem key={key} value={key}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <Badge variant="secondary" className="text-xs">
                      {assignedCount} issue{assignedCount !== 1 ? "s" : ""}
                    </Badge>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Add Member Dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Team Member</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Search Users</Label>
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name or email..."
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
              <div className="max-h-48 overflow-auto border rounded-md">
                {availableUsers.length === 0 ? (
                  <p className="text-sm text-muted-foreground px-3 py-4 text-center">
                    {userSearch ? "No matching users found." : "No available users."}
                  </p>
                ) : (
                  availableUsers.map((user) => (
                    <div
                      key={user.id}
                      className={`flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-accent ${
                        selectedUserId === user.id ? "bg-accent" : ""
                      }`}
                      onClick={() => setSelectedUserId(user.id)}
                    >
                      <UserAvatar
                        firstName={user.firstName}
                        lastName={user.lastName}
                        imageUrl={user.profileImageUrl}
                        size="sm"
                      />
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">
                          {user.firstName} {user.lastName}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Role</Label>
              <Select value={selectedRole} onValueChange={setSelectedRole}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(PROJECT_ROLES).map(([key, { label, description }]) => (
                    <SelectItem key={key} value={key}>
                      <div>
                        <span>{label}</span>
                        <span className="text-xs text-muted-foreground ml-2">{description}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => addMemberMutation.mutate()}
              disabled={!selectedUserId || addMemberMutation.isPending}
            >
              {addMemberMutation.isPending ? "Adding..." : "Add Member"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
