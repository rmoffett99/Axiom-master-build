import { useQuery, useMutation } from "@tanstack/react-query";
import { useRoute, Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import {
  ArrowLeft,
  Edit,
  FileText,
  User,
  Calendar,
  Clock,
  AlertTriangle,
  CheckCircle,
  XCircle,
  HelpCircle,
  Link as LinkIcon,
  GitBranch,
  History,
  Bell
} from "lucide-react";
import type { 
  DecisionWithDetails, 
  DecisionVersion, 
  Assumption, 
  EvidenceLink, 
  Dependency,
  Alert 
} from "@shared/schema";

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { variant: "default" | "secondary" | "outline" | "destructive"; label: string }> = {
    draft: { variant: "outline", label: "Draft" },
    published: { variant: "default", label: "Published" },
    superseded: { variant: "secondary", label: "Superseded" },
  };

  const { variant, label } = config[status] || config.draft;
  return <Badge variant={variant}>{label}</Badge>;
}

function AssumptionStatusIcon({ status }: { status: string }) {
  const icons: Record<string, { icon: typeof CheckCircle; className: string }> = {
    valid: { icon: CheckCircle, className: "text-chart-5" },
    expired: { icon: Clock, className: "text-chart-2" },
    invalidated: { icon: XCircle, className: "text-destructive" },
    pending_review: { icon: HelpCircle, className: "text-muted-foreground" },
  };

  const { icon: Icon, className } = icons[status] || icons.pending_review;
  return <Icon className={`w-4 h-4 ${className}`} />;
}

function AssumptionCard({ assumption, onValidate }: { assumption: Assumption; onValidate: (id: string, status: string) => void }) {
  const statusLabels: Record<string, string> = {
    valid: "Valid",
    expired: "Expired",
    invalidated: "Invalidated",
    pending_review: "Pending Review",
  };

  // Visual distinction for expired/invalidated assumptions
  const cardClass = assumption.status === "expired" 
    ? "overflow-hidden border-chart-2/50 bg-chart-2/5" 
    : assumption.status === "invalidated"
    ? "overflow-hidden border-destructive/50 bg-destructive/5"
    : "overflow-hidden";

  return (
    <Card className={cardClass}>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <AssumptionStatusIcon status={assumption.status} />
          <div className="flex-1 min-w-0">
            <p className="text-sm">{assumption.description}</p>
            <div className="flex items-center flex-wrap gap-x-4 gap-y-1 mt-2 text-xs text-muted-foreground">
              <span>{statusLabels[assumption.status]}</span>
              {assumption.validUntil && (
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  Valid until {new Date(assumption.validUntil).toLocaleDateString()}
                </span>
              )}
              {assumption.validatedAt && (
                <span className="flex items-center gap-1">
                  <CheckCircle className="w-3 h-3" />
                  Last checked {new Date(assumption.validatedAt).toLocaleDateString()}
                </span>
              )}
            </div>
            {assumption.status === "pending_review" && (
              <div className="flex gap-2 mt-3">
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => onValidate(assumption.id, "valid")}
                  data-testid={`button-validate-${assumption.id}`}
                >
                  <CheckCircle className="w-3 h-3 mr-1" />
                  Still Valid
                </Button>
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => onValidate(assumption.id, "invalidated")}
                  data-testid={`button-invalidate-${assumption.id}`}
                >
                  <XCircle className="w-3 h-3 mr-1" />
                  Invalidated
                </Button>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function EvidenceCard({ evidence }: { evidence: EvidenceLink }) {
  return (
    <a href={evidence.url} target="_blank" rel="noopener noreferrer" className="block">
      <Card className="hover-elevate cursor-pointer">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-md bg-primary/10 flex items-center justify-center flex-shrink-0">
              <LinkIcon className="w-4 h-4 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm truncate">{evidence.title}</p>
              {evidence.description && (
                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{evidence.description}</p>
              )}
              <p className="text-xs text-primary mt-2 truncate">{evidence.url}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </a>
  );
}

function VersionHistoryItem({ version, isLatest }: { version: DecisionVersion; isLatest: boolean }) {
  return (
    <div className="flex gap-4">
      <div className="flex flex-col items-center">
        <div className={`w-3 h-3 rounded-full ${isLatest ? "bg-primary" : "bg-border"}`} />
        <div className="w-px flex-1 bg-border" />
      </div>
      <div className="pb-6 flex-1">
        <div className="flex items-center gap-2 mb-1">
          <span className="font-medium text-sm">Version {version.versionNumber}</span>
          {isLatest && <Badge variant="outline" className="text-xs">Current</Badge>}
        </div>
        <p className="text-xs text-muted-foreground mb-2">
          {new Date(version.createdAt).toLocaleString()}
        </p>
        <p className="text-sm text-muted-foreground">{version.rationale.substring(0, 150)}...</p>
      </div>
    </div>
  );
}

function AlertItem({ alert, onAcknowledge }: { alert: Alert; onAcknowledge: (id: string) => void }) {
  const severityColors: Record<string, string> = {
    critical: "bg-destructive/10 text-destructive border-destructive/20",
    high: "bg-chart-2/10 text-chart-2 border-chart-2/20",
    medium: "bg-chart-1/10 text-chart-1 border-chart-1/20",
    low: "bg-muted text-muted-foreground border-border",
  };

  return (
    <Card className={`border ${severityColors[alert.severity]}`}>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <Badge variant="outline" className="text-xs">{alert.severity.toUpperCase()}</Badge>
              <span className="text-xs text-muted-foreground">
                {new Date(alert.createdAt).toLocaleDateString()}
              </span>
            </div>
            <p className="text-sm">{alert.message}</p>
            {!alert.acknowledgedAt && (
              <Button 
                size="sm" 
                variant="outline" 
                className="mt-3"
                onClick={() => onAcknowledge(alert.id)}
                data-testid={`button-ack-alert-${alert.id}`}
              >
                Acknowledge
              </Button>
            )}
            {alert.acknowledgedAt && (
              <p className="text-xs text-muted-foreground mt-2">
                Acknowledged {new Date(alert.acknowledgedAt).toLocaleString()}
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function DecisionDetailPage() {
  const [, params] = useRoute("/decisions/:id");
  const { toast } = useToast();

  const { data: decision, isLoading } = useQuery<DecisionWithDetails & {
    versions?: DecisionVersion[];
    evidence?: EvidenceLink[];
    dependencies?: Dependency[];
    alerts?: Alert[];
  }>({
    queryKey: ["/api/decisions", params?.id],
    enabled: !!params?.id,
  });

  const validateMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      await apiRequest("PATCH", `/api/assumptions/${id}`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/decisions", params?.id] });
      toast({ title: "Assumption updated", description: "The assumption status has been updated." });
    },
  });

  const acknowledgeMutation = useMutation({
    mutationFn: async (alertId: string) => {
      await apiRequest("POST", `/api/alerts/${alertId}/acknowledge`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/decisions", params?.id] });
      toast({ title: "Alert acknowledged", description: "The alert has been marked as acknowledged." });
    },
  });

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!decision) {
    return (
      <div className="p-6">
        <div className="flex flex-col items-center justify-center py-16">
          <FileText className="w-16 h-16 text-muted-foreground mb-4" />
          <h2 className="text-xl font-semibold mb-2">Decision Not Found</h2>
          <p className="text-muted-foreground mb-4">The decision you're looking for doesn't exist.</p>
          <Link href="/decisions">
            <Button>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Decisions
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const currentVersion = decision.currentVersion;
  const assumptions = decision.assumptions || [];
  const evidence = decision.evidence || [];
  const versions = decision.versions || [];
  const alerts = decision.alerts || [];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-4">
          <Link href="/decisions">
            <Button variant="ghost" size="icon" data-testid="button-back">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-bold tracking-tight">{decision.title}</h1>
              <StatusBadge status={decision.status} />
            </div>
            <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground flex-wrap">
              <span className="flex items-center gap-1">
                <User className="w-3 h-3" />
                {decision.owner?.displayName || "Unknown"}
              </span>
              <span className="flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                Created {new Date(decision.createdAt).toLocaleDateString()}
              </span>
              {decision.reviewByDate && (
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  Review by {new Date(decision.reviewByDate).toLocaleDateString()}
                </span>
              )}
            </div>
          </div>
          <div className="flex gap-2 flex-shrink-0">
            <Link href={`/decisions/${decision.id}/amend`}>
              <Button variant="outline" data-testid="button-amend-decision">
                <Edit className="w-4 h-4 mr-2" />
                Amend
              </Button>
            </Link>
          </div>
        </div>

        {/* Debt Score Card */}
        <Card className="bg-card">
          <CardContent className="py-4">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div>
                <p className="text-sm text-muted-foreground">Decision Debt Score</p>
                <p className="text-3xl font-bold">{decision.debtScore || 0}</p>
              </div>
              <div className="flex gap-6 text-sm">
                <div>
                  <p className="text-muted-foreground">Assumptions</p>
                  <p className="font-medium">{assumptions.length}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Pending Review</p>
                  <p className="font-medium">{assumptions.filter(a => a.status === "pending_review").length}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Active Alerts</p>
                  <p className="font-medium">{alerts.filter(a => !a.acknowledgedAt).length}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview" data-testid="tab-overview">Overview</TabsTrigger>
          <TabsTrigger value="assumptions" data-testid="tab-assumptions">
            Assumptions ({assumptions.length})
          </TabsTrigger>
          <TabsTrigger value="evidence" data-testid="tab-evidence">
            Evidence ({evidence.length})
          </TabsTrigger>
          <TabsTrigger value="history" data-testid="tab-history">
            History ({versions.length})
          </TabsTrigger>
          <TabsTrigger value="alerts" data-testid="tab-alerts">
            Alerts ({alerts.filter(a => !a.acknowledgedAt).length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {currentVersion ? (
            <>
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Context</CardTitle>
                  <CardDescription>Background and circumstances of this decision</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">{currentVersion.context}</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Rationale</CardTitle>
                  <CardDescription>Why this decision was made</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">{currentVersion.rationale}</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Outcome</CardTitle>
                  <CardDescription>The decision itself</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">{currentVersion.outcome}</p>
                </CardContent>
              </Card>

              {currentVersion.alternatives && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Alternatives Considered</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">{currentVersion.alternatives}</p>
                  </CardContent>
                </Card>
              )}

              {currentVersion.risks && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Risks</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">{currentVersion.risks}</p>
                  </CardContent>
                </Card>
              )}
            </>
          ) : (
            <Card>
              <CardContent className="py-8 text-center">
                <p className="text-muted-foreground">No version details available</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="assumptions" className="space-y-4">
          {assumptions.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center">
                <HelpCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No assumptions recorded</p>
              </CardContent>
            </Card>
          ) : (
            assumptions.map(assumption => (
              <AssumptionCard 
                key={assumption.id} 
                assumption={assumption} 
                onValidate={(id, status) => validateMutation.mutate({ id, status })}
              />
            ))
          )}
        </TabsContent>

        <TabsContent value="evidence" className="space-y-4">
          {evidence.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center">
                <LinkIcon className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No evidence links recorded</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid sm:grid-cols-2 gap-4">
              {evidence.map(ev => (
                <EvidenceCard key={ev.id} evidence={ev} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <History className="w-5 h-5" />
                Version History
              </CardTitle>
              <CardDescription>All amendments to this decision</CardDescription>
            </CardHeader>
            <CardContent>
              {versions.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">No version history available</p>
              ) : (
                <div className="space-y-0">
                  {versions.map((version, index) => (
                    <VersionHistoryItem 
                      key={version.id} 
                      version={version} 
                      isLatest={index === 0}
                    />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="alerts" className="space-y-4">
          {alerts.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center">
                <Bell className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No alerts for this decision</p>
              </CardContent>
            </Card>
          ) : (
            alerts.map(alert => (
              <AlertItem 
                key={alert.id} 
                alert={alert} 
                onAcknowledge={(id) => acknowledgeMutation.mutate(id)}
              />
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
