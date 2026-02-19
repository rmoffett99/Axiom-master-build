import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Shield,
  Search,
  Filter,
  X,
  Clock,
  User,
  FileText,
  Eye,
  Download,
  Lock,
  ChevronLeft,
} from "lucide-react";
import { useState, useMemo, useRef } from "react";
import { getCurrentOrgId } from "@/lib/org-state";

interface AuditEvent {
  id: string;
  timestamp: string;
  action: string;
  actor: string;
  resourceType: string;
  resourceId: string;
  status: string;
  source: string;
  metadata: Record<string, unknown>;
}

interface AuditResponse {
  events: AuditEvent[];
  total: number;
  limit: number;
  offset: number;
}

function ActionBadge({ action }: { action: string }) {
  const config: Record<string, { variant: "default" | "secondary" | "outline" | "destructive"; label: string }> = {
    created: { variant: "default", label: "Created" },
    evaluated: { variant: "secondary", label: "Evaluated" },
    logged: { variant: "outline", label: "Logged" },
    access: { variant: "outline", label: "Accessed" },
    export: { variant: "secondary", label: "Exported" },
  };

  const { variant, label } = config[action] || { variant: "outline" as const, label: action };
  return <Badge variant={variant}>{label}</Badge>;
}

function SourceIcon({ source }: { source: string }) {
  switch (source) {
    case "audit_access_log":
      return <Eye className="w-4 h-4 text-muted-foreground" />;
    case "audit_export_log":
      return <Download className="w-4 h-4 text-muted-foreground" />;
    default:
      return <FileText className="w-4 h-4 text-muted-foreground" />;
  }
}

function formatTimestamp(ts: string): string {
  const d = new Date(ts);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function truncateId(id: string): string {
  if (id.length <= 12) return id;
  return `${id.slice(0, 8)}...`;
}

function DetailPanel({ event, onClose }: { event: AuditEvent; onClose: () => void }) {
  return (
    <div className="fixed inset-y-0 right-0 w-full sm:w-[480px] bg-background border-l z-50 flex flex-col shadow-lg" data-testid="panel-audit-detail">
      <div className="flex items-center justify-between gap-2 p-4 border-b">
        <div className="flex items-center gap-2 min-w-0">
          <Button variant="ghost" size="icon" onClick={onClose} data-testid="button-close-detail">
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <h2 className="font-semibold truncate">Audit Event Detail</h2>
        </div>
        <ActionBadge action={event.action} />
      </div>

      <div className="flex-1 overflow-auto p-4 space-y-4">
        <div className="flex items-center gap-2 p-3 rounded-md bg-muted/50 text-sm text-muted-foreground">
          <Lock className="w-4 h-4 flex-shrink-0" />
          <span>Audit records are immutable and append-only.</span>
        </div>

        <div className="space-y-3">
          <DetailRow label="Event ID" value={event.id} mono />
          <DetailRow label="Timestamp" value={formatTimestamp(event.timestamp)} />
          <DetailRow label="Action" value={event.action} />
          <DetailRow label="Actor" value={event.actor} mono />
          <DetailRow label="Resource Type" value={event.resourceType} />
          <DetailRow label="Resource ID" value={event.resourceId} mono />
          <DetailRow label="Status" value={event.status} />
          <DetailRow label="Source Table" value={event.source} />
          {"organizationId" in event.metadata && event.metadata.organizationId ? (
            <DetailRow label="Organization ID" value={String(event.metadata.organizationId)} mono />
          ) : null}
          {"decisionId" in event.metadata && event.metadata.decisionId ? (
            <DetailRow label="Decision ID" value={String(event.metadata.decisionId)} mono />
          ) : null}
          {"confidenceScore" in event.metadata && event.metadata.confidenceScore != null ? (
            <DetailRow label="Confidence Score" value={String(event.metadata.confidenceScore)} />
          ) : null}
          {"ipAddress" in event.metadata && event.metadata.ipAddress ? (
            <DetailRow label="IP Address" value={String(event.metadata.ipAddress)} />
          ) : null}
          {"bundleHash" in event.metadata && event.metadata.bundleHash ? (
            <DetailRow label="Bundle Hash" value={String(event.metadata.bundleHash)} mono />
          ) : null}
          {"exportType" in event.metadata && event.metadata.exportType ? (
            <DetailRow label="Export Type" value={String(event.metadata.exportType)} />
          ) : null}
          {"exportPurpose" in event.metadata && event.metadata.exportPurpose ? (
            <DetailRow label="Export Purpose" value={String(event.metadata.exportPurpose)} />
          ) : null}
          {"exportFileSize" in event.metadata && event.metadata.exportFileSize != null ? (
            <DetailRow label="Export File Size" value={`${event.metadata.exportFileSize} bytes`} />
          ) : null}
          {"summary" in event.metadata && event.metadata.summary ? (
            <div>
              <p className="text-xs text-muted-foreground mb-1">Summary</p>
              <p className="text-sm">{String(event.metadata.summary)}</p>
            </div>
          ) : null}
        </div>

        <div>
          <p className="text-xs text-muted-foreground mb-2">Full Metadata</p>
          <pre className="text-xs p-3 rounded-md bg-muted/50 overflow-auto max-h-64 whitespace-pre-wrap break-all font-mono" data-testid="text-audit-metadata">
            {JSON.stringify(event.metadata, null, 2)}
          </pre>
        </div>
      </div>
    </div>
  );
}

function DetailRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground mb-0.5">{label}</p>
      <p className={`text-sm break-all ${mono ? "font-mono" : ""}`}>{value}</p>
    </div>
  );
}

export default function AuditPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [actionFilter, setActionFilter] = useState<string>("all");
  const [resourceFilter, setResourceFilter] = useState<string>("all");
  const [selectedEvent, setSelectedEvent] = useState<AuditEvent | null>(null);

  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout>>();
  const handleSearchChange = (val: string) => {
    setSearchQuery(val);
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    searchTimeoutRef.current = setTimeout(() => setDebouncedSearch(val), 300);
  };

  const isUuidLike = (s: string) => /^[0-9a-f]{8}-[0-9a-f]{4}/i.test(s.trim());

  const queryParams = useMemo(() => {
    const params = new URLSearchParams();
    if (actionFilter !== "all") params.set("action", actionFilter);
    if (resourceFilter !== "all") params.set("resourceType", resourceFilter);
    if (debouncedSearch && isUuidLike(debouncedSearch)) {
      params.set("decisionId", debouncedSearch.trim());
    } else if (debouncedSearch) {
      params.set("actor", debouncedSearch.trim());
    }
    params.set("limit", "200");
    return params.toString();
  }, [actionFilter, resourceFilter, debouncedSearch]);

  const { data, isLoading } = useQuery<AuditResponse>({
    queryKey: ["/api/audit", queryParams],
    queryFn: async () => {
      const orgId = getCurrentOrgId();
      const headers: Record<string, string> = {};
      if (orgId) headers["X-Organization-Id"] = orgId;
      const res = await fetch(`/api/audit?${queryParams}`, {
        credentials: "include",
        headers,
      });
      if (!res.ok) throw new Error("Failed to fetch audit trail");
      return res.json();
    },
  });

  const events = data?.events || [];

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <div>
          <Skeleton className="h-8 w-40 mb-2" />
          <Skeleton className="h-4 w-64" />
        </div>
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Shield className="w-5 h-5 text-muted-foreground" />
          <h1 className="text-2xl font-bold tracking-tight" data-testid="text-audit-title">Audit Trail</h1>
        </div>
        <p className="text-muted-foreground">Immutable record of all system actions and decisions</p>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3 flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by actor, ID, or summary..."
                value={searchQuery}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="pl-9"
                data-testid="input-audit-search"
              />
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <Filter className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              <Select value={actionFilter} onValueChange={setActionFilter}>
                <SelectTrigger className="w-[140px]" data-testid="select-action-filter">
                  <SelectValue placeholder="All Actions" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Actions</SelectItem>
                  <SelectItem value="created">Created</SelectItem>
                  <SelectItem value="evaluated">Evaluated</SelectItem>
                  <SelectItem value="logged">Logged</SelectItem>
                  <SelectItem value="access">Accessed</SelectItem>
                  <SelectItem value="export">Exported</SelectItem>
                </SelectContent>
              </Select>
              <Select value={resourceFilter} onValueChange={setResourceFilter}>
                <SelectTrigger className="w-[160px]" data-testid="select-resource-filter">
                  <SelectValue placeholder="All Resources" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Resources</SelectItem>
                  <SelectItem value="decision">Decision</SelectItem>
                  <SelectItem value="export">Export</SelectItem>
                </SelectContent>
              </Select>
              {(actionFilter !== "all" || resourceFilter !== "all" || searchQuery) && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setActionFilter("all");
                    setResourceFilter("all");
                    handleSearchChange("");
                  }}
                  data-testid="button-clear-filters"
                >
                  <X className="w-3 h-3 mr-1" />
                  Clear
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          {events.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <Shield className="w-10 h-10 mb-3 opacity-40" />
              <p className="text-sm font-medium">No audit events found</p>
              <p className="text-xs mt-1">Adjust filters or create decisions to generate audit records</p>
            </div>
          ) : (
            <div className="overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[180px]">Timestamp</TableHead>
                    <TableHead className="w-[100px]">Action</TableHead>
                    <TableHead>Actor</TableHead>
                    <TableHead>Resource</TableHead>
                    <TableHead className="w-[160px]">Resource ID</TableHead>
                    <TableHead className="w-[90px]">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {events.map((event) => (
                    <TableRow
                      key={event.id}
                      className="cursor-pointer hover-elevate"
                      onClick={() => setSelectedEvent(event)}
                      data-testid={`row-audit-${event.id}`}
                    >
                      <TableCell className="text-sm">
                        <div className="flex items-center gap-2">
                          <Clock className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                          <span className="whitespace-nowrap">{formatTimestamp(event.timestamp)}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <ActionBadge action={event.action} />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <User className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                          <span className="font-mono text-sm truncate max-w-[140px]" title={event.actor}>
                            {truncateId(event.actor)}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <SourceIcon source={event.source} />
                          <span className="text-sm capitalize">{event.resourceType}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="font-mono text-sm text-muted-foreground" title={event.resourceId}>
                          {truncateId(event.resourceId)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">{event.status}</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Lock className="w-3 h-3" />
        <span>
          Showing {events.length} of {data?.total || events.length} events.
          Audit records are immutable and append-only.
        </span>
      </div>

      {selectedEvent && (
        <>
          <div
            className="fixed inset-0 bg-black/30 z-40"
            onClick={() => setSelectedEvent(null)}
          />
          <DetailPanel event={selectedEvent} onClose={() => setSelectedEvent(null)} />
        </>
      )}
    </div>
  );
}
