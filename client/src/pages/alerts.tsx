import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Link } from "wouter";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import {
  AlertTriangle,
  Bell,
  Check,
  Clock,
  FileText,
  Filter,
  ChevronRight,
  User
} from "lucide-react";
import type { Alert, Decision } from "@shared/schema";

interface AlertWithDecision extends Alert {
  decision?: Decision;
}

function SeverityBadge({ severity }: { severity: string }) {
  const config: Record<string, { variant: "default" | "secondary" | "outline" | "destructive"; label: string }> = {
    critical: { variant: "destructive", label: "Critical" },
    high: { variant: "secondary", label: "High" },
    medium: { variant: "outline", label: "Medium" },
    low: { variant: "outline", label: "Low" },
  };

  const { variant, label } = config[severity] || config.low;
  return <Badge variant={variant}>{label}</Badge>;
}

function TypeBadge({ type }: { type: string }) {
  const labels: Record<string, string> = {
    assumption_expired: "Assumption Expired",
    owner_departed: "Owner Departed",
    review_overdue: "Review Overdue",
    contradiction_detected: "Contradiction",
    high_debt_score: "High Debt Score",
  };

  return (
    <Badge variant="outline" className="text-xs">
      {labels[type] || type}
    </Badge>
  );
}

function AlertCard({ alert, onAcknowledge }: { alert: AlertWithDecision; onAcknowledge: (id: string) => void }) {
  const severityColors: Record<string, string> = {
    critical: "border-l-destructive",
    high: "border-l-chart-2",
    medium: "border-l-chart-1",
    low: "border-l-border",
  };

  const severityBgColors: Record<string, string> = {
    critical: "bg-destructive/5",
    high: "bg-chart-2/5",
    medium: "bg-chart-1/5",
    low: "bg-muted/30",
  };

  return (
    <Card className={`border-l-4 ${severityColors[alert.severity]} ${severityBgColors[alert.severity]}`}>
      <CardContent className="p-4">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-full bg-background flex items-center justify-center flex-shrink-0">
            <AlertTriangle className={`w-5 h-5 ${
              alert.severity === "critical" ? "text-destructive" : 
              alert.severity === "high" ? "text-chart-2" : "text-muted-foreground"
            }`} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2 mb-2 flex-wrap">
              <div className="flex items-center gap-2 flex-wrap">
                <SeverityBadge severity={alert.severity} />
                <TypeBadge type={alert.type} />
              </div>
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {new Date(alert.createdAt).toLocaleDateString()}
              </span>
            </div>
            
            <p className="text-sm font-medium mb-2">{alert.message}</p>
            
            {alert.decision && (
              <Link href={`/decisions/${alert.decision.id}`}>
                <div className="inline-flex items-center gap-2 text-sm text-primary hover:underline cursor-pointer">
                  <FileText className="w-3 h-3" />
                  {alert.decision.title}
                  <ChevronRight className="w-3 h-3" />
                </div>
              </Link>
            )}

            <div className="flex items-center justify-between mt-4 pt-3 border-t gap-4 flex-wrap">
              {alert.acknowledgedAt ? (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Check className="w-3 h-3" />
                  Acknowledged {new Date(alert.acknowledgedAt).toLocaleString()}
                </div>
              ) : (
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => onAcknowledge(alert.id)}
                  data-testid={`button-acknowledge-${alert.id}`}
                >
                  <Check className="w-3 h-3 mr-1" />
                  Acknowledge
                </Button>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function AlertsPage() {
  const [severityFilter, setSeverityFilter] = useState<string>("all");
  const { toast } = useToast();

  const { data: alerts, isLoading } = useQuery<AlertWithDecision[]>({
    queryKey: ["/api/alerts"],
  });

  const acknowledgeMutation = useMutation({
    mutationFn: async (alertId: string) => {
      await apiRequest("POST", `/api/alerts/${alertId}/acknowledge`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/alerts"] });
      toast({ title: "Alert acknowledged", description: "The alert has been marked as acknowledged." });
    },
  });

  const filteredAlerts = alerts?.filter(a => {
    if (severityFilter === "all") return true;
    return a.severity === severityFilter;
  }) || [];

  const pendingAlerts = filteredAlerts.filter(a => !a.acknowledgedAt);
  const acknowledgedAlerts = filteredAlerts.filter(a => a.acknowledgedAt);

  const criticalCount = alerts?.filter(a => a.severity === "critical" && !a.acknowledgedAt).length || 0;
  const highCount = alerts?.filter(a => a.severity === "high" && !a.acknowledgedAt).length || 0;

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-8 w-32" />
        <div className="grid grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-24" />)}
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Alerts</h1>
          <p className="text-muted-foreground">Decision drift and risk notifications</p>
        </div>
        <Select value={severityFilter} onValueChange={setSeverityFilter}>
          <SelectTrigger className="w-40" data-testid="select-severity-filter">
            <Filter className="w-4 h-4 mr-2" />
            <SelectValue placeholder="Filter" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Severity</SelectItem>
            <SelectItem value="critical">Critical</SelectItem>
            <SelectItem value="high">High</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="low">Low</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className={criticalCount > 0 ? "border-destructive/50 bg-destructive/5" : ""}>
          <CardContent className="py-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-md bg-destructive/10 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-destructive" />
              </div>
              <div>
                <p className="text-2xl font-bold">{criticalCount}</p>
                <p className="text-xs text-muted-foreground">Critical</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className={highCount > 0 ? "border-chart-2/50 bg-chart-2/5" : ""}>
          <CardContent className="py-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-md bg-chart-2/10 flex items-center justify-center">
                <Bell className="w-5 h-5 text-chart-2" />
              </div>
              <div>
                <p className="text-2xl font-bold">{highCount}</p>
                <p className="text-xs text-muted-foreground">High</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-md bg-muted flex items-center justify-center">
                <Clock className="w-5 h-5 text-muted-foreground" />
              </div>
              <div>
                <p className="text-2xl font-bold">{pendingAlerts.length}</p>
                <p className="text-xs text-muted-foreground">Pending</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-md bg-muted flex items-center justify-center">
                <Check className="w-5 h-5 text-muted-foreground" />
              </div>
              <div>
                <p className="text-2xl font-bold">{acknowledgedAlerts.length}</p>
                <p className="text-xs text-muted-foreground">Acknowledged</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="pending">
        <TabsList>
          <TabsTrigger value="pending" data-testid="tab-pending-alerts">
            Pending ({pendingAlerts.length})
          </TabsTrigger>
          <TabsTrigger value="acknowledged" data-testid="tab-acknowledged-alerts">
            Acknowledged ({acknowledgedAlerts.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="space-y-4 mt-6">
          {pendingAlerts.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                  <Bell className="w-8 h-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-semibold mb-2">No pending alerts</h3>
                <p className="text-muted-foreground max-w-sm mx-auto">
                  All alerts have been acknowledged. The system will generate new alerts when decision risks are detected.
                </p>
              </CardContent>
            </Card>
          ) : (
            pendingAlerts.map(alert => (
              <AlertCard 
                key={alert.id} 
                alert={alert} 
                onAcknowledge={(id) => acknowledgeMutation.mutate(id)}
              />
            ))
          )}
        </TabsContent>

        <TabsContent value="acknowledged" className="space-y-4 mt-6">
          {acknowledgedAlerts.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground">No acknowledged alerts</p>
              </CardContent>
            </Card>
          ) : (
            acknowledgedAlerts.map(alert => (
              <AlertCard 
                key={alert.id} 
                alert={alert} 
                onAcknowledge={() => {}}
              />
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
