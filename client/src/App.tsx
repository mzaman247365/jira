import { useState, useEffect } from "react";
import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { ThemeProvider } from "@/components/theme-provider";
import { ThemeToggle } from "@/components/theme-toggle";
import { AppSidebar } from "@/components/app-sidebar";
import { CreateProjectDialog } from "@/components/create-project-dialog";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import NotFound from "@/pages/not-found";
import Landing from "@/pages/landing";
import Dashboard from "@/pages/dashboard";
import Board from "@/pages/board";
import Backlog from "@/pages/backlog";
import ProjectSettings from "@/pages/project-settings";

function AuthenticatedApp() {
  const [createProjectOpen, setCreateProjectOpen] = useState(false);

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
            <ThemeToggle />
          </header>
          <main className="flex-1 overflow-hidden">
            <Switch>
              <Route path="/">
                <Dashboard onCreateProject={() => setCreateProjectOpen(true)} />
              </Route>
              <Route path="/project/:projectId/board" component={Board} />
              <Route path="/project/:projectId/backlog" component={Backlog} />
              <Route path="/project/:projectId/settings" component={ProjectSettings} />
              <Route component={NotFound} />
            </Switch>
          </main>
        </div>
      </div>
      <CreateProjectDialog open={createProjectOpen} onOpenChange={setCreateProjectOpen} />
    </SidebarProvider>
  );
}

function AppRouter() {
  const { user, isLoading } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (!isLoading && !user) {
      // Not logged in, landing page will show
    }
  }, [isLoading, user]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!user) {
    return <Landing />;
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
