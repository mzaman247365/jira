import { useState, useEffect, useCallback, lazy, Suspense } from "react";
import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { ThemeProvider } from "@/components/theme-provider";
import { ThemeToggle } from "@/components/theme-toggle";
import { AppSidebar } from "@/components/app-sidebar";
import { CreateProjectDialog } from "@/components/create-project-dialog";
import { GlobalSearch } from "@/components/global-search";
import { NotificationBell } from "@/components/notification-bell";
import { KeyboardShortcutsDialog } from "@/components/keyboard-shortcuts-dialog";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";

// Pages
import NotFound from "@/pages/not-found";
import Landing from "@/pages/landing";
import Dashboard from "@/pages/dashboard";
import Board from "@/pages/board";
import Backlog from "@/pages/backlog";
import ProjectSettings from "@/pages/project-settings";
import SprintBoard from "@/pages/sprint-board";
import Releases from "@/pages/releases";
import Search from "@/pages/search";
import MyWork from "@/pages/my-work";
import Team from "@/pages/team";
import Roadmap from "@/pages/roadmap";
import Reports from "@/pages/reports";
import EpicBoard from "@/pages/epic-board";
import Login from "@/pages/login";
import Register from "@/pages/register";
import Profile from "@/pages/profile";

function AuthenticatedApp() {
  const [createProjectOpen, setCreateProjectOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [, setLocation] = useLocation();

  // Global keyboard shortcuts
  useEffect(() => {
    let gPressed = false;
    let gTimeout: ReturnType<typeof setTimeout>;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Skip if user is typing in an input/textarea
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable) {
        return;
      }

      // ? - show keyboard shortcuts
      if (e.key === "?" && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        setShortcutsOpen(true);
        return;
      }

      // c - create issue (only outside inputs)
      if (e.key === "c" && !e.metaKey && !e.ctrlKey) {
        // Let the current page handle this if it can
        return;
      }

      // g + key combinations
      if (e.key === "g" && !e.metaKey && !e.ctrlKey) {
        gPressed = true;
        clearTimeout(gTimeout);
        gTimeout = setTimeout(() => { gPressed = false; }, 1000);
        return;
      }

      if (gPressed) {
        gPressed = false;
        clearTimeout(gTimeout);
        switch (e.key) {
          case "d": e.preventDefault(); setLocation("/"); break;
          case "b": break; // board - context dependent
          case "l": break; // backlog - context dependent
          case "w": e.preventDefault(); setLocation("/my-work"); break;
          case "s": e.preventDefault(); setLocation("/search"); break;
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      clearTimeout(gTimeout);
    };
  }, [setLocation]);

  const style: Record<string, string> = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  };

  return (
    <SidebarProvider style={style}>
      <div className="flex h-screen w-full">
        <AppSidebar onCreateProject={() => setCreateProjectOpen(true)} />
        <div className="flex flex-col flex-1 min-w-0">
          <header className="flex items-center justify-between gap-4 px-3 h-12 border-b flex-shrink-0">
            <SidebarTrigger data-testid="button-sidebar-toggle" />
            <div className="flex items-center gap-2">
              <NotificationBell />
              <ThemeToggle />
            </div>
          </header>
          <main className="flex-1 overflow-y-auto">
            <Switch>
              <Route path="/">
                <Dashboard onCreateProject={() => setCreateProjectOpen(true)} />
              </Route>
              <Route path="/project/:projectId/board" component={Board} />
              <Route path="/project/:projectId/backlog" component={Backlog} />
              <Route path="/project/:projectId/settings" component={ProjectSettings} />
              <Route path="/project/:projectId/sprint-board" component={SprintBoard} />
              <Route path="/project/:projectId/releases" component={Releases} />
              <Route path="/project/:projectId/roadmap" component={Roadmap} />
              <Route path="/project/:projectId/reports" component={Reports} />
              <Route path="/project/:projectId/epics" component={EpicBoard} />
              <Route path="/project/:projectId/team" component={Team} />
              <Route path="/search" component={Search} />
              <Route path="/my-work" component={MyWork} />
              <Route path="/profile" component={Profile} />
              <Route component={NotFound} />
            </Switch>
          </main>
        </div>
      </div>
      <CreateProjectDialog open={createProjectOpen} onOpenChange={setCreateProjectOpen} />
      <GlobalSearch />
      <KeyboardShortcutsDialog open={shortcutsOpen} onOpenChange={setShortcutsOpen} />
    </SidebarProvider>
  );
}

function AppRouter() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!user) {
    return (
      <Switch>
        <Route path="/login" component={Login} />
        <Route path="/register" component={Register} />
        <Route>
          <Landing />
        </Route>
      </Switch>
    );
  }

  return <AuthenticatedApp />;
}

export default function App() {
  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <AppRouter />
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}
