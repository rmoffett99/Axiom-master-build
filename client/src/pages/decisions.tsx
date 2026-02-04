import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
  Plus, 
  Search, 
  Filter,
  ChevronRight,
  FileText,
  Clock,
  User
} from "lucide-react";
import { useState } from "react";
import type { DecisionWithDetails } from "@shared/schema";

function DecisionStatusBadge({ status }: { status: string }) {
  const variants: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
    draft: "outline",
    published: "default",
    superseded: "secondary",
  };

  return (
    <Badge variant={variants[status] || "outline"}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </Badge>
  );
}

function DebtScoreBadge({ score }: { score: number }) {
  const getVariant = (s: number): "default" | "secondary" | "outline" | "destructive" => {
    if (s >= 70) return "destructive";
    if (s >= 40) return "secondary";
    return "outline";
  };

  return (
    <Badge variant={getVariant(score)}>
      {score}
    </Badge>
  );
}

export default function DecisionsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  
  const { data: decisions, isLoading } = useQuery<DecisionWithDetails[]>({
    queryKey: ["/api/decisions"],
  });

  const filteredDecisions = decisions?.filter(d => {
    const matchesSearch = d.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || d.status === statusFilter;
    return matchesSearch && matchesStatus;
  }) || [];

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-9 w-36" />
        </div>
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Decisions</h1>
          <p className="text-muted-foreground">Manage your organization's decision records</p>
        </div>
        <Link href="/decisions/new">
          <Button data-testid="button-new-decision-page">
            <Plus className="w-4 h-4 mr-2" />
            New Decision
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="py-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search decisions..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
                data-testid="input-search-decisions"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-40" data-testid="select-status-filter">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="published">Published</SelectItem>
                <SelectItem value="superseded">Superseded</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Decisions Table */}
      <Card>
        <CardContent className="p-0">
          {filteredDecisions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-4">
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                <FileText className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold mb-2">No decisions found</h3>
              <p className="text-muted-foreground text-center max-w-sm mb-4">
                {searchQuery || statusFilter !== "all" 
                  ? "Try adjusting your filters or search query."
                  : "Get started by creating your first decision record."}
              </p>
              <Link href="/decisions/new">
                <Button data-testid="button-create-first-decision">
                  <Plus className="w-4 h-4 mr-2" />
                  Create Decision
                </Button>
              </Link>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Decision</TableHead>
                  <TableHead className="hidden md:table-cell">Owner</TableHead>
                  <TableHead className="hidden sm:table-cell">Status</TableHead>
                  <TableHead>Debt Score</TableHead>
                  <TableHead className="hidden lg:table-cell">Review By</TableHead>
                  <TableHead className="w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredDecisions.map((decision) => (
                  <TableRow key={decision.id} className="cursor-pointer hover-elevate" data-testid={`row-decision-${decision.id}`}>
                    <TableCell>
                      <Link href={`/decisions/${decision.id}`}>
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-md bg-primary/10 flex items-center justify-center flex-shrink-0">
                            <FileText className="w-4 h-4 text-primary" />
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium truncate">{decision.title}</p>
                            <p className="text-xs text-muted-foreground truncate md:hidden">
                              {decision.owner?.displayName || "Unknown owner"}
                            </p>
                          </div>
                        </div>
                      </Link>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <div className="flex items-center gap-2">
                        <User className="w-3 h-3 text-muted-foreground" />
                        <span className="text-sm">{decision.owner?.displayName || "Unknown"}</span>
                      </div>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      <DecisionStatusBadge status={decision.status} />
                    </TableCell>
                    <TableCell>
                      <DebtScoreBadge score={decision.debtScore || 0} />
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      {decision.reviewByDate ? (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Clock className="w-3 h-3" />
                          {new Date(decision.reviewByDate).toLocaleDateString()}
                        </div>
                      ) : (
                        <span className="text-sm text-muted-foreground">Not set</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Link href={`/decisions/${decision.id}`}>
                        <Button variant="ghost" size="icon" data-testid={`button-view-decision-${decision.id}`}>
                          <ChevronRight className="w-4 h-4" />
                        </Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
