import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import { ThemeToggle } from "@/components/theme-toggle";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";

import LandingPage from "@/pages/landing";
import DashboardPage from "@/pages/dashboard";
import DecisionsPage from "@/pages/decisions";
import DecisionDetailPage from "@/pages/decision-detail";
import DecisionNewPage from "@/pages/decision-new";
import AlertsPage from "@/pages/alerts";
import BoardModePage from "@/pages/board";
import NotFound from "@/pages/not-found";

function AppLayout({ children }: { children: React.ReactNode }) {
  const style = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  };

  return (
    <SidebarProvider style={style as React.CSSProperties}>
      <div className="flex h-screen w-full">
        <AppSidebar />
        <div className="flex flex-col flex-1 min-w-0">
          <header className="flex items-center justify-between gap-2 px-4 py-2 border-b bg-background/80 backdrop-blur-sm sticky top-0 z-40">
            <SidebarTrigger data-testid="button-sidebar-toggle" />
            <ThemeToggle />
          </header>
          <main className="flex-1 overflow-auto">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={LandingPage} />
      <Route path="/dashboard">
        <AppLayout>
          <DashboardPage />
        </AppLayout>
      </Route>
      <Route path="/decisions">
        <AppLayout>
          <DecisionsPage />
        </AppLayout>
      </Route>
      <Route path="/decisions/new">
        <AppLayout>
          <DecisionNewPage />
        </AppLayout>
      </Route>
      <Route path="/decisions/:id">
        <AppLayout>
          <DecisionDetailPage />
        </AppLayout>
      </Route>
      <Route path="/alerts">
        <AppLayout>
          <AlertsPage />
        </AppLayout>
      </Route>
      <Route path="/board">
        <AppLayout>
          <BoardModePage />
        </AppLayout>
      </Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ThemeProvider defaultTheme="light" storageKey="axiom-ui-theme">
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;
