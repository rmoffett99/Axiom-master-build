import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ThemeToggle } from "@/components/theme-toggle";
import { 
  BookOpen, 
  TrendingDown, 
  Bell, 
  Eye,
  ArrowRight,
  Shield,
  Clock,
  Users,
  ChevronRight
} from "lucide-react";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 gap-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-md bg-primary flex items-center justify-center">
                <span className="text-primary-foreground font-bold text-sm">A</span>
              </div>
              <span className="font-semibold text-lg tracking-tight">AXIOM</span>
              <span className="text-xs text-muted-foreground font-medium ml-1">™</span>
            </div>
            <div className="flex items-center gap-2">
              <ThemeToggle />
              <Link href="/dashboard">
                <Button variant="outline" size="sm" data-testid="button-login">
                  Sign In
                </Button>
              </Link>
              <Button size="sm" data-testid="button-demo">
                Request Demo
                <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6">
            <Shield className="w-4 h-4" />
            Enterprise Decision Intelligence
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight mb-6 text-foreground">
            The system of record for how{" "}
            <span className="text-primary">decisions</span> are made.
          </h1>
          <p className="text-xl text-muted-foreground mb-4 max-w-2xl mx-auto leading-relaxed">
            Most companies track data.
          </p>
          <p className="text-xl text-muted-foreground mb-4 max-w-2xl mx-auto leading-relaxed">
            Very few track decisions.
          </p>
          <p className="text-xl font-medium text-foreground mb-8 max-w-2xl mx-auto">
            That's where risk hides.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" className="text-base" data-testid="button-briefing">
              Request Executive Briefing
              <ChevronRight className="w-5 h-5 ml-1" />
            </Button>
            <Link href="/dashboard">
              <Button size="lg" variant="outline" className="text-base w-full sm:w-auto" data-testid="button-explore">
                Explore Platform
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Problem Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-card">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4 text-foreground">
              The Hidden Risk in Every Organization
            </h2>
          </div>
          <div className="space-y-6 text-lg text-muted-foreground">
            <p className="flex items-start gap-3">
              <Clock className="w-6 h-6 text-destructive flex-shrink-0 mt-1" />
              <span>Critical decisions outlive the people who made them.</span>
            </p>
            <p className="flex items-start gap-3">
              <TrendingDown className="w-6 h-6 text-destructive flex-shrink-0 mt-1" />
              <span>Assumptions quietly expire.</span>
            </p>
            <p className="flex items-start gap-3">
              <Bell className="w-6 h-6 text-destructive flex-shrink-0 mt-1" />
              <span>Strategy drifts without alarms.</span>
            </p>
          </div>
          <p className="mt-8 text-xl text-center font-medium text-foreground">
            By the time failure shows up in metrics, it's already too late.
          </p>
        </div>
      </section>

      {/* Solution Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-6 text-foreground">
            Track the Decisions That Matter
          </h2>
          <p className="text-lg text-muted-foreground mb-12 max-w-2xl mx-auto">
            AXIOM™ captures why decisions were made, what assumptions justified them, 
            who owns them, and when they must be reviewed — and continuously checks 
            whether reality still agrees.
          </p>
          <div className="grid grid-cols-2 gap-4 max-w-lg mx-auto text-left">
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-primary" />
              <span className="text-muted-foreground">Why decisions were made</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-primary" />
              <span className="text-muted-foreground">What assumptions justify them</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-primary" />
              <span className="text-muted-foreground">Who owns them</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-primary" />
              <span className="text-muted-foreground">When to review them</span>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-card">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4 text-foreground">
              Built for Enterprise Governance
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Every feature designed to satisfy general counsel, board members, and external auditors.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="hover-elevate">
              <CardContent className="pt-6">
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                  <BookOpen className="w-6 h-6 text-primary" />
                </div>
                <h3 className="font-semibold text-lg mb-2 text-foreground">Decision Ledger</h3>
                <p className="text-muted-foreground text-sm">
                  Append-only, owner-assigned decision records with complete version history.
                </p>
              </CardContent>
            </Card>
            <Card className="hover-elevate">
              <CardContent className="pt-6">
                <div className="w-12 h-12 rounded-lg bg-destructive/10 flex items-center justify-center mb-4">
                  <TrendingDown className="w-6 h-6 text-destructive" />
                </div>
                <h3 className="font-semibold text-lg mb-2 text-foreground">Decision Debt™</h3>
                <p className="text-muted-foreground text-sm">
                  A quantified measure of unresolved decision risk across your organization.
                </p>
              </CardContent>
            </Card>
            <Card className="hover-elevate">
              <CardContent className="pt-6">
                <div className="w-12 h-12 rounded-lg bg-chart-2/10 flex items-center justify-center mb-4">
                  <Bell className="w-6 h-6 text-chart-2" />
                </div>
                <h3 className="font-semibold text-lg mb-2 text-foreground">Drift Detection</h3>
                <p className="text-muted-foreground text-sm">
                  Early warnings when assumptions break or decisions require review.
                </p>
              </CardContent>
            </Card>
            <Card className="hover-elevate">
              <CardContent className="pt-6">
                <div className="w-12 h-12 rounded-lg bg-chart-3/10 flex items-center justify-center mb-4">
                  <Eye className="w-6 h-6 text-chart-3" />
                </div>
                <h3 className="font-semibold text-lg mb-2 text-foreground">Board Mode</h3>
                <p className="text-muted-foreground text-sm">
                  A strategic continuity view built for leadership oversight.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Trust Indicators */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <div className="grid sm:grid-cols-3 gap-8 text-center">
            <div>
              <div className="flex items-center justify-center gap-2 mb-2">
                <Shield className="w-5 h-5 text-primary" />
                <span className="font-semibold text-foreground">Audit-Safe</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Append-only records meet compliance requirements
              </p>
            </div>
            <div>
              <div className="flex items-center justify-center gap-2 mb-2">
                <Users className="w-5 h-5 text-primary" />
                <span className="font-semibold text-foreground">Board-Visible</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Executive dashboards for strategic oversight
              </p>
            </div>
            <div>
              <div className="flex items-center justify-center gap-2 mb-2">
                <Clock className="w-5 h-5 text-primary" />
                <span className="font-semibold text-foreground">Turnover-Proof</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Institutional knowledge survives leadership changes
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-primary">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4 text-primary-foreground">
            One bad decision costs more than this platform.
          </h2>
          <p className="text-lg text-primary-foreground/80 mb-8 max-w-2xl mx-auto">
            See how AXIOM™ can protect your organization's strategic integrity.
          </p>
          <Button size="lg" variant="secondary" className="text-base" data-testid="button-schedule-demo">
            Schedule a Demo
            <ArrowRight className="w-5 h-5 ml-2" />
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-4 sm:px-6 lg:px-8 border-t">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-md bg-primary flex items-center justify-center">
                <span className="text-primary-foreground font-bold text-xs">A</span>
              </div>
              <span className="font-semibold text-sm">AXIOM™</span>
              <span className="text-xs text-muted-foreground">by Axiom Systems</span>
            </div>
            <p className="text-sm text-muted-foreground">
              © 2024 Axiom Systems. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
