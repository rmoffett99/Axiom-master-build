import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
} from "recharts";
import {
  TrendingDown,
  TrendingUp,
  AlertTriangle,
  Clock,
  FileText,
  Download,
  Eye,
  Shield,
  Users,
  Calendar
} from "lucide-react";
import type { DashboardStats, DecisionWithDetails } from "@shared/schema";

function DebtScoreBadge({ score }: { score: number }) {
  const getVariant = (s: number): "default" | "secondary" | "outline" | "destructive" => {
    if (s >= 70) return "destructive";
    if (s >= 40) return "secondary";
    return "outline";
  };

  return <Badge variant={getVariant(score)}>{score}</Badge>;
}

function StatBlock({ 
  title, 
  value, 
  subtitle,
  icon: Icon,
  variant = "default"
}: { 
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ComponentType<{ className?: string }>;
  variant?: "default" | "warning" | "danger";
}) {
  const iconColors = {
    default: "text-primary",
    warning: "text-chart-2",
    danger: "text-destructive",
  };

  return (
    <div className="text-center p-6">
      <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-3">
        <Icon className={`w-6 h-6 ${iconColors[variant]}`} />
      </div>
      <p className="text-3xl font-bold mb-1">{value}</p>
      <p className="text-sm font-medium">{title}</p>
      {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
    </div>
  );
}

export default function BoardModePage() {
  const { data: stats, isLoading } = useQuery<DashboardStats>({
    queryKey: ["/api/dashboard/stats"],
  });

  const handleExport = () => {
    const exportData = {
      exportDate: new Date().toISOString(),
      organizationDebtScore: stats?.avgDebtScore,
      totalDecisions: stats?.totalDecisions,
      criticalAlerts: stats?.criticalAlerts,
      expiringSoon: stats?.expiringSoon,
      topRisks: stats?.topRiskyDecisions?.slice(0, 10).map(d => ({
        title: d.title,
        owner: d.owner?.displayName,
        debtScore: d.debtScore,
        reviewDate: d.reviewByDate,
      })),
      debtTrend: stats?.debtTrend,
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `axiom-board-report-${new Date().toISOString().split("T")[0]}.json`;
    a.click();
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-32" />)}
        </div>
        <Skeleton className="h-80" />
      </div>
    );
  }

  const chartData = stats?.debtTrend || [];
  const topRisks = stats?.topRiskyDecisions?.slice(0, 10) || [];
  const expiring30 = topRisks.filter(d => {
    const days = d.reviewByDate ? Math.ceil((new Date(d.reviewByDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : null;
    return days !== null && days <= 30 && days > 0;
  });

  return (
    <div className="p-6 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-md bg-primary flex items-center justify-center">
            <Eye className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Board Mode</h1>
            <p className="text-muted-foreground">Executive overview — read-only</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="outline" className="gap-1">
            <Shield className="w-3 h-3" />
            Read-Only View
          </Badge>
          <Button variant="outline" onClick={handleExport} data-testid="button-export-report">
            <Download className="w-4 h-4 mr-2" />
            Export Report
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <Card>
        <CardContent className="p-0">
          <div className="grid grid-cols-2 lg:grid-cols-4 divide-x divide-y lg:divide-y-0">
            <StatBlock
              title="Organization Debt Score"
              value={stats?.avgDebtScore || 0}
              subtitle="Lower is better"
              icon={TrendingDown}
              variant={stats?.avgDebtScore && stats.avgDebtScore >= 50 ? "danger" : "default"}
            />
            <StatBlock
              title="Active Decisions"
              value={stats?.totalDecisions || 0}
              subtitle="Being tracked"
              icon={FileText}
            />
            <StatBlock
              title="Critical Alerts"
              value={stats?.criticalAlerts || 0}
              subtitle="Require attention"
              icon={AlertTriangle}
              variant={(stats?.criticalAlerts || 0) > 0 ? "danger" : "default"}
            />
            <StatBlock
              title="Expiring Soon"
              value={stats?.expiringSoon || 0}
              subtitle="Within 30 days"
              icon={Clock}
              variant={(stats?.expiringSoon || 0) > 0 ? "warning" : "default"}
            />
          </div>
        </CardContent>
      </Card>

      {/* Debt Trend Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Decision Debt Trend</CardTitle>
          <CardDescription>
            AI-assisted analysis of organizational decision risk over time
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                  </linearGradient>
                </defs>
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
                    borderRadius: "8px"
                  }}
                />
                <Area 
                  type="monotone" 
                  dataKey="score" 
                  stroke="hsl(var(--primary))"
                  fillOpacity={1}
                  fill="url(#colorScore)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Two Column Layout */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Top 10 Highest Risk */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-destructive" />
              Top 10 Highest Risk Decisions
            </CardTitle>
            <CardDescription>
              AI-detected risk based on decision debt analysis
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Decision</TableHead>
                  <TableHead className="hidden sm:table-cell">Owner</TableHead>
                  <TableHead className="text-right">Score</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {topRisks.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center py-8 text-muted-foreground">
                      No decisions tracked yet
                    </TableCell>
                  </TableRow>
                ) : (
                  topRisks.map((decision, index) => (
                    <TableRow key={decision.id} className="cursor-pointer hover-elevate">
                      <TableCell>
                        <Link href={`/decisions/${decision.id}`} className="flex items-center gap-2" data-testid={`link-decision-${decision.id}`}>
                          <span className="text-xs text-muted-foreground w-5">{index + 1}.</span>
                          <span className="font-medium truncate max-w-48">{decision.title}</span>
                        </Link>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <Users className="w-3 h-3" />
                          {decision.owner?.displayName || "Unknown"}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <DebtScoreBadge score={decision.debtScore || 0} />
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Expiring Decisions */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Clock className="w-5 h-5 text-chart-2" />
              Decisions Requiring Review
            </CardTitle>
            <CardDescription>
              Upcoming review dates within 30 days
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Decision</TableHead>
                  <TableHead className="text-right">Review Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {expiring30.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={2} className="text-center py-8 text-muted-foreground">
                      No decisions expiring within 30 days
                    </TableCell>
                  </TableRow>
                ) : (
                  expiring30.map((decision) => {
                    const daysLeft = decision.reviewByDate 
                      ? Math.ceil((new Date(decision.reviewByDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
                      : null;
                    
                    return (
                      <TableRow key={decision.id} className="cursor-pointer hover-elevate">
                        <TableCell>
                          <Link href={`/decisions/${decision.id}`} className="block" data-testid={`link-review-decision-${decision.id}`}>
                            <span className="font-medium truncate block max-w-64">{decision.title}</span>
                            <span className="text-xs text-muted-foreground">
                              Owner: {decision.owner?.displayName || "Unknown"}
                            </span>
                          </Link>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex flex-col items-end gap-1">
                            <span className="text-sm">
                              {decision.reviewByDate && new Date(decision.reviewByDate).toLocaleDateString()}
                            </span>
                            {daysLeft !== null && (
                              <Badge variant={daysLeft <= 7 ? "destructive" : "secondary"} className="text-xs">
                                {daysLeft} days
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* Footer Notice */}
      <Card className="bg-muted/30">
        <CardContent className="py-4">
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <Shield className="w-4 h-4" />
            <p>
              AI-assisted analysis of organizational decision risk. All decisions remain owned and accountable to leadership.
              Last updated: {new Date().toLocaleDateString()}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
