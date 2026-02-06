import { useLocation, Link } from "wouter";
import { LayoutDashboard, FolderKanban, List, Plus, Settings, LogOut, Columns3 } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { UserAvatar } from "@/components/user-avatar";
import { ProjectAvatar } from "@/components/project-avatar";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarFooter,
  SidebarHeader,
  SidebarSeparator,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import type { Project } from "@shared/schema";

export function AppSidebar({ onCreateProject }: { onCreateProject: () => void }) {
  const [location] = useLocation();
  const { user, logout } = useAuth();

  const { data: projects = [] } = useQuery<Project[]>({
    queryKey: ["/api/projects"],
  });

  const activeProjectId = location.match(/\/project\/([^/]+)/)?.[1];

  return (
    <Sidebar>
      <SidebarHeader className="p-4">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-md bg-primary flex items-center justify-center flex-shrink-0">
            <Columns3 className="h-4 w-4 text-primary-foreground" />
          </div>
          <span className="font-semibold text-base tracking-tight" data-testid="text-sidebar-brand">ProjectFlow</span>
        </div>
      </SidebarHeader>

      <SidebarSeparator />

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={location === "/"}>
                  <Link href="/" data-testid="link-dashboard">
                    <LayoutDashboard className="h-4 w-4" />
                    <span>Dashboard</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarSeparator />

        <SidebarGroup>
          <div className="flex items-center justify-between px-2 mb-1">
            <SidebarGroupLabel className="mb-0 p-0">Projects</SidebarGroupLabel>
            <Button
              size="icon"
              variant="ghost"
              onClick={onCreateProject}
              data-testid="button-create-project-sidebar"
            >
              <Plus className="h-3.5 w-3.5" />
            </Button>
          </div>
          <SidebarGroupContent>
            <SidebarMenu>
              {projects.map((project) => (
                <SidebarMenuItem key={project.id}>
                  <SidebarMenuButton asChild isActive={activeProjectId === project.id}>
                    <Link href={`/project/${project.id}/board`} data-testid={`link-project-${project.id}`}>
                      <ProjectAvatar name={project.name} color={project.avatarColor || "#4C9AFF"} size="sm" />
                      <span className="truncate">{project.name}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
              {projects.length === 0 && (
                <div className="px-3 py-4 text-sm text-muted-foreground text-center">
                  No projects yet
                </div>
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {activeProjectId && (
          <>
            <SidebarSeparator />
            <SidebarGroup>
              <SidebarGroupLabel>Current Project</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild isActive={location.includes("/board")}>
                      <Link href={`/project/${activeProjectId}/board`} data-testid="link-board">
                        <FolderKanban className="h-4 w-4" />
                        <span>Board</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild isActive={location.includes("/backlog")}>
                      <Link href={`/project/${activeProjectId}/backlog`} data-testid="link-backlog">
                        <List className="h-4 w-4" />
                        <span>Backlog</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild isActive={location.includes("/settings")}>
                      <Link href={`/project/${activeProjectId}/settings`} data-testid="link-settings">
                        <Settings className="h-4 w-4" />
                        <span>Settings</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </>
        )}
      </SidebarContent>

      <SidebarSeparator />

      <SidebarFooter className="p-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <UserAvatar
              firstName={user?.firstName}
              lastName={user?.lastName}
              imageUrl={user?.profileImageUrl}
              size="md"
            />
            <div className="min-w-0">
              <div className="text-sm font-medium truncate" data-testid="text-user-name">
                {user?.firstName} {user?.lastName}
              </div>
              <div className="text-xs text-muted-foreground truncate" data-testid="text-user-email">
                {user?.email}
              </div>
            </div>
          </div>
          <Button
            size="icon"
            variant="ghost"
            onClick={() => logout()}
            data-testid="button-logout"
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
