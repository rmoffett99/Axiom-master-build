import { Switch, Route, useLocation } from "wouter";
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

const sidebarStyle = {
  "--sidebar-width": "16rem",
  "--sidebar-width-icon": "3rem",
} as React.CSSProperties;

function AppRoutes() {
  return (
    <Switch>
      <Route path="/dashboard" component={DashboardPage} />
      <Route path="/decisions/new" component={DecisionNewPage} />
      <Route path="/decisions/:id" component={DecisionDetailPage} />
      <Route path="/decisions" component={DecisionsPage} />
      <Route path="/alerts" component={AlertsPage} />
      <Route path="/board" component={BoardModePage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function AppLayout() {
  return (
    <SidebarProvider style={sidebarStyle}>
      <div className="flex h-screen w-full">
        <AppSidebar />
        <div className="flex flex-col flex-1 min-w-0">
          <header className="flex items-center justify-between gap-2 px-4 py-2 border-b bg-background/80 backdrop-blur-sm sticky top-0 z-40">
            <SidebarTrigger data-testid="button-sidebar-toggle" />
            <ThemeToggle />
          </header>
          <main className="flex-1 overflow-auto">
            <AppRoutes />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}

function Router() {
  const [location] = useLocation();
  const isLanding = location === "/";

  if (isLanding) {
    return <LandingPage />;
  }

  return <AppLayout />;
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
