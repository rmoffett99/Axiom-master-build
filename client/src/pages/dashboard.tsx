import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "wouter";
import {
  TrendingDown,
  AlertTriangle,
  Clock,
  FileText,
  ArrowRight,
  ChevronRight
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { useOrgLink } from "@/lib/use-org-link";
import type { DashboardStats, DecisionWithDetails } from "@shared/schema";

function StatCard({ 
  title, 
  value, 
  description, 
  icon: Icon, 
  variant = "default" 
}: { 
  title: string; 
  value: string | number; 
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  variant?: "default" | "warning" | "danger";
}) {
  const variantStyles = {
    default: "bg-muted text-muted-foreground",
    warning: "bg-muted text-muted-foreground",
    danger: "bg-destructive/10 text-destructive",
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <div className={`w-8 h-8 rounded-md flex items-center justify-center ${variantStyles[variant]}`}>
          <Icon className="w-4 h-4" />
        </div>
      </CardHeader>
      <CardContent>
        <span className="text-3xl font-bold">{value}</span>
        <p className="text-xs text-muted-foreground mt-1">{description}</p>
      </CardContent>
    </Card>
  );
}

function DecisionRow({ decision }: { decision: DecisionWithDetails }) {
  const orgLink = useOrgLink();
  const getDebtVariant = (score: number): "destructive" | "secondary" | "outline" => {
    if (score >= 70) return "destructive";
    if (score >= 40) return "secondary";
    return "outline";
  };

  return (
    <Link href={orgLink(`/decisions/${decision.id}`)}>
      <div className="flex items-center gap-4 p-3 rounded-md hover-elevate cursor-pointer" data-testid={`decision-row-${decision.id}`}>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm truncate">{decision.title}</p>
          <p className="text-xs text-muted-foreground truncate">
            Owner: {decision.owner?.displayName || "Unknown"}
          </p>
        </div>
        <Badge variant={getDebtVariant(decision.debtScore || 0)}>
          {decision.debtScore || 0}
        </Badge>
        <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
      </div>
    </Link>
  );
}

function ExpiringDecisionRow({ decision, urgent = false }: { decision: DecisionWithDetails; urgent?: boolean }) {
  const orgLink = useOrgLink();
  const daysUntilReview = decision.reviewByDate 
    ? Math.ceil((new Date(decision.reviewByDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null;

  const pendingAssumptions = decision.assumptions?.filter(a => a.status === "pending_review").length || 0;

  return (
    <Link href={orgLink(`/decisions/${decision.id}`)}>
      <div className="flex items-center gap-4 p-3 rounded-md hover-elevate cursor-pointer" data-testid={`expiring-row-${decision.id}`}>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm truncate">{decision.title}</p>
          <p className="text-xs text-muted-foreground">
            {pendingAssumptions} assumptions pending
          </p>
        </div>
        {daysUntilReview !== null && (
          <Badge variant={urgent ? "destructive" : "secondary"}>
            {daysUntilReview}d
          </Badge>
        )}
        <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
      </div>
    </Link>
  );
}

export default function DashboardPage() {
  const orgLink = useOrgLink();
  const { data: stats, isLoading } = useQuery<DashboardStats>({
    queryKey: ["/api/dashboard/stats"],
  });

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <div>
          <Skeleton className="h-8 w-48 mb-2" />
          <Skeleton className="h-4 w-64" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <div className="grid lg:grid-cols-3 gap-6">
          <Skeleton className="h-80 lg:col-span-2" />
          <Skeleton className="h-80" />
        </div>
      </div>
    );
  }

  const chartData = stats?.debtTrend || [];
  const topRisky = stats?.topRiskyDecisions || [];

  // Filter decisions by expiration timeframe
  const getExpiringDecisions = (minDays: number, maxDays: number) => {
    return topRisky.filter(d => {
      const days = d.reviewByDate 
        ? Math.ceil((new Date(d.reviewByDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)) 
        : null;
      return days !== null && days > minDays && days <= maxDays;
    });
  };

  const expiring30 = getExpiringDecisions(-Infinity, 30);
  const expiring60 = getExpiringDecisions(30, 60);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">Organization Decision Health Overview</p>
        </div>
        <Link href={orgLink("/decisions/new")}>
          <Button data-testid="button-create-decision">
            Create Decision
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </Link>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Decisions"
          value={stats?.totalDecisions || 0}
          description="Active decisions tracked"
          icon={FileText}
        />
        <StatCard
          title="Avg. Decision Debt"
          value={stats?.avgDebtScore || 0}
          description="Organization-wide score"
          icon={TrendingDown}
          variant="warning"
        />
        <StatCard
          title="Critical Alerts"
          value={stats?.criticalAlerts || 0}
          description="Require immediate attention"
          icon={AlertTriangle}
          variant={stats?.criticalAlerts ? "danger" : "default"}
        />
        <StatCard
          title="Expiring Soon"
          value={stats?.expiringSoon || 0}
          description="Within next 30 days"
          icon={Clock}
          variant={stats?.expiringSoon ? "warning" : "default"}
        />
      </div>

      {/* Charts and Lists */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Debt Trend Chart */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg">Decision Debt Trend</CardTitle>
            <CardDescription>Organization risk trend over time</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis 
                    dataKey="date" 
                    tick={{ fontSize: 12 }}
                    tickLine={false}
                    axisLine={false}
                    className="fill-muted-foreground"
                  />
                  <YAxis 
                    tick={{ fontSize: 12 }}
                    tickLine={false}
                    axisLine={false}
                    className="fill-muted-foreground"
                    domain={[0, 100]}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "6px",
                      fontSize: "12px"
                    }}
                    formatter={(value: number) => [`Score: ${value}`, '']}
                    labelFormatter={(label) => `Date: ${label}`}
                  />
                  <Line 
                    type="linear" 
                    dataKey="score" 
                    stroke="hsl(var(--foreground))"
                    strokeWidth={1.5}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Highest Risk Decisions */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2">
            <div>
              <CardTitle className="text-lg">Highest Risk</CardTitle>
              <CardDescription>Ranked by decision debt score</CardDescription>
            </div>
            <Link href={orgLink("/decisions")}>
              <Button variant="ghost" size="sm" data-testid="button-view-all-risky">
                View All
              </Button>
            </Link>
          </CardHeader>
          <CardContent className="space-y-1">
            {topRisky.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                No decisions tracked yet
              </p>
            ) : (
              topRisky
                .slice()
                .sort((a, b) => (b.debtScore || 0) - (a.debtScore || 0))
                .slice(0, 5)
                .map(decision => (
                  <DecisionRow key={decision.id} decision={decision} />
                ))
            )}
          </CardContent>
        </Card>
      </div>

      {/* Expiring Decisions */}
      <div className="grid lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Expiring in 30 Days</CardTitle>
            <CardDescription>Require immediate review</CardDescription>
          </CardHeader>
          <CardContent className="space-y-1">
            {expiring30.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                None requiring immediate review
              </p>
            ) : (
              expiring30.map(decision => (
                <ExpiringDecisionRow key={decision.id} decision={decision} urgent />
              ))
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Expiring in 60 Days</CardTitle>
            <CardDescription>Plan ahead</CardDescription>
          </CardHeader>
          <CardContent className="space-y-1">
            {expiring60.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                None in this range
              </p>
            ) : (
              expiring60.map(decision => (
                <ExpiringDecisionRow key={decision.id} decision={decision} />
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
