import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import { ThemeToggle } from "@/components/theme-toggle";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { OrgProvider, useOrg } from "@/lib/org-context";
import { Eye } from "lucide-react";

import LandingPage from "@/pages/landing";
import DashboardPage from "@/pages/dashboard";
import DecisionsPage from "@/pages/decisions";
import DecisionDetailPage from "@/pages/decision-detail";
import DecisionNewPage from "@/pages/decision-new";
import AlertsPage from "@/pages/alerts";
import BoardModePage from "@/pages/board";
import AuditPage from "@/pages/audit";
import NotFound from "@/pages/not-found";

const sidebarStyle = {
  "--sidebar-width": "16rem",
  "--sidebar-width-icon": "3rem",
} as React.CSSProperties;

function OrgRoutes() {
  return (
    <Switch>
      <Route path="/org/:orgSlug/dashboard" component={DashboardPage} />
      <Route path="/org/:orgSlug/decisions/new" component={DecisionNewPage} />
      <Route path="/org/:orgSlug/decisions/:id" component={DecisionDetailPage} />
      <Route path="/org/:orgSlug/decisions" component={DecisionsPage} />
      <Route path="/org/:orgSlug/alerts" component={AlertsPage} />
      <Route path="/org/:orgSlug/board" component={BoardModePage} />
      <Route path="/org/:orgSlug/audit" component={AuditPage} />
      <Route path="/org/:orgSlug" component={DashboardPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function DemoBanner() {
  const { activeOrg } = useOrg();
  if (activeOrg?.slug !== "axiom-demo") return null;
  return (
    <div className="bg-amber-500/10 border-b border-amber-500/20 px-4 py-1.5 flex items-center justify-center gap-2" data-testid="banner-demo">
      <Eye className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 flex-shrink-0" />
      <span className="text-xs font-medium text-amber-700 dark:text-amber-300">You're viewing a demo workspace</span>
    </div>
  );
}

function AppLayout() {
  return (
    <SidebarProvider style={sidebarStyle}>
      <div className="flex h-screen w-full">
        <AppSidebar />
        <div className="flex flex-col flex-1 min-w-0">
          <DemoBanner />
          <header className="flex items-center justify-between gap-2 px-4 py-2 border-b bg-background/80 backdrop-blur-sm sticky top-0 z-40">
            <SidebarTrigger data-testid="button-sidebar-toggle" />
            <ThemeToggle />
          </header>
          <main className="flex-1 overflow-auto">
            <OrgRoutes />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}

function AppWithOrg() {
  return (
    <OrgProvider>
      <AppLayout />
    </OrgProvider>
  );
}

function Router() {
  const [location] = useLocation();

  if (location === "/") {
    return <LandingPage />;
  }

  return <AppWithOrg />;
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
