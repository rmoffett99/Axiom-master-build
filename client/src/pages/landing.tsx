import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { useOrgLink } from "@/lib/use-org-link";
import {
  ClipboardCheck,
  Activity,
  AlertTriangle,
  Shield,
  BarChart3,
} from "lucide-react";

export default function LandingPage() {
  const orgLink = useOrgLink();
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-zinc-950/90 backdrop-blur-sm border-b border-zinc-800/50">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 gap-4">
            <div className="flex items-center gap-1">
              <span className="font-semibold text-lg tracking-tight text-zinc-100">AXIOM</span>
              <span className="text-xs text-zinc-500 font-medium">™</span>
            </div>
            <div className="flex items-center gap-3">
              <ThemeToggle />
              <Link href={orgLink("/dashboard")}>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="text-zinc-400"
                  data-testid="button-login"
                >
                  Enter
                </Button>
              </Link>
              <Link href={orgLink("/dashboard")}>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="border-zinc-700 text-zinc-300"
                  data-testid="button-demo"
                >
                  View Demo
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="min-h-screen flex flex-col justify-center px-6 lg:px-8 pt-16">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-semibold tracking-tight mb-6 text-zinc-100 leading-tight" data-testid="text-hero-headline">
            Every decision recorded. Every assumption tracked. Every audit answered.
          </h1>

          <p className="text-xl sm:text-2xl text-zinc-400 mb-16" data-testid="text-hero-subheadline">
            AXIOM is the system of record for how your organization makes decisions — who owned them, what was assumed, and whether those assumptions still hold.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 mb-12">
            <Link href={orgLink("/dashboard")}>
              <Button 
                size="lg" 
                className="bg-zinc-100 text-zinc-900 border-zinc-100 text-base font-medium px-8"
                data-testid="button-briefing"
              >
                Enter Platform
              </Button>
            </Link>
            <Link href={orgLink("/dashboard")}>
              <Button 
                size="lg" 
                variant="ghost" 
                className="text-zinc-400 text-base w-full sm:w-auto"
                data-testid="button-explore"
              >
                Explore Platform
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Product Overview */}
      <section className="px-6 lg:px-8 py-24 border-t border-zinc-800/50" data-testid="section-product-overview">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-semibold text-zinc-100 mb-4">What AXIOM Does</h2>
          <p className="text-zinc-400 mb-12 max-w-2xl">
            A structured record of every significant decision — with the context, ownership, and assumptions preserved for as long as they matter.
          </p>

          <div className="space-y-8">
            <div className="flex gap-4" data-testid="feature-capture">
              <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-zinc-800/80 flex items-center justify-center">
                <ClipboardCheck className="w-5 h-5 text-zinc-300" />
              </div>
              <div>
                <h3 className="text-base font-medium text-zinc-100 mb-1">Capture decisions with full context</h3>
                <p className="text-sm text-zinc-400">Each decision is recorded with its rationale, assumptions, owner, and supporting evidence — not just the outcome.</p>
              </div>
            </div>

            <div className="flex gap-4" data-testid="feature-assumptions">
              <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-zinc-800/80 flex items-center justify-center">
                <Activity className="w-5 h-5 text-zinc-300" />
              </div>
              <div>
                <h3 className="text-base font-medium text-zinc-100 mb-1">Track assumptions over time</h3>
                <p className="text-sm text-zinc-400">Every decision rests on assumptions. AXIOM tracks whether those assumptions are still valid, expired, or disproven — so nothing degrades silently.</p>
              </div>
            </div>

            <div className="flex gap-4" data-testid="feature-debt">
              <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-zinc-800/80 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-zinc-300" />
              </div>
              <div>
                <h3 className="text-base font-medium text-zinc-100 mb-1">Detect decision debt before it becomes risk</h3>
                <p className="text-sm text-zinc-400">Decisions degrade when assumptions change, owners leave, or reviews are overdue. AXIOM scores each decision's health and flags what needs attention.</p>
              </div>
            </div>

            <div className="flex gap-4" data-testid="feature-audit">
              <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-zinc-800/80 flex items-center justify-center">
                <Shield className="w-5 h-5 text-zinc-300" />
              </div>
              <div>
                <h3 className="text-base font-medium text-zinc-100 mb-1">Maintain a tamper-proof audit trail</h3>
                <p className="text-sm text-zinc-400">Every action is recorded immutably at the moment it occurs. Records cannot be changed or deleted — built for compliance, legal review, and regulatory audits.</p>
              </div>
            </div>

            <div className="flex gap-4" data-testid="feature-board">
              <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-zinc-800/80 flex items-center justify-center">
                <BarChart3 className="w-5 h-5 text-zinc-300" />
              </div>
              <div>
                <h3 className="text-base font-medium text-zinc-100 mb-1">Provide board-ready executive visibility</h3>
                <p className="text-sm text-zinc-400">Leadership and board members get a read-only summary of decision health, risks, and accountability — without needing to dig into operational details.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Who It's For */}
      <section className="px-6 lg:px-8 py-24 border-t border-zinc-800/50" data-testid="section-who-its-for">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-semibold text-zinc-100 mb-4">Who It's For</h2>
          <p className="text-zinc-400 mb-12 max-w-2xl">
            Built for the people accountable when things go wrong — and the organizations that want to make sure they don't.
          </p>

          <div className="grid sm:grid-cols-3 gap-8">
            <div className="space-y-2" data-testid="audience-gc">
              <h3 className="text-base font-medium text-zinc-100">General Counsel</h3>
              <p className="text-sm text-zinc-400">Know exactly who decided what, when, and why — with an immutable record that holds up under scrutiny.</p>
            </div>

            <div className="space-y-2" data-testid="audience-compliance">
              <h3 className="text-base font-medium text-zinc-100">Compliance & Risk Leaders</h3>
              <p className="text-sm text-zinc-400">Monitor assumption health, flag degraded decisions, and maintain audit-ready documentation at all times.</p>
            </div>

            <div className="space-y-2" data-testid="audience-executives">
              <h3 className="text-base font-medium text-zinc-100">Executives & Boards</h3>
              <p className="text-sm text-zinc-400">See the full picture of organizational decision health without losing institutional memory when leadership changes.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Closing Statement */}
      <section className="px-6 lg:px-8 py-24 border-t border-zinc-800/50" data-testid="section-closing">
        <div className="max-w-4xl mx-auto text-center">
          <p className="text-xl sm:text-2xl text-zinc-300 font-medium mb-2" data-testid="text-closing-statement">
            The why behind every important decision — never lost, always accountable, permanently on record.
          </p>
          <p className="text-zinc-500">
            AXIOM ensures that when assumptions change, someone is accountable for reviewing what needs to change with them.
          </p>
        </div>
      </section>

      {/* Contact */}
      <section className="px-6 lg:px-8 py-16 border-t border-zinc-800/50">
        <div className="max-w-4xl mx-auto">
          <h3 className="text-xl font-semibold text-zinc-100 mb-2" data-testid="text-contact-heading">Contact Axiom</h3>
          <p className="text-zinc-400 mb-4">
            Questions, access, or demos — reach us at{" "}
            <a
              href="mailto:hello@axiomdecisionlayer.com"
              className="text-blue-400 font-medium hover:underline"
              data-testid="link-contact-email"
            >
              hello@axiomdecisionlayer.com
            </a>
          </p>
          <a
            href="mailto:hello@axiomdecisionlayer.com"
            className="inline-block px-5 py-2.5 bg-blue-600 text-white rounded-md font-medium hover:bg-blue-700 transition-colors"
            data-testid="button-contact"
          >
            Contact Axiom
          </a>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-6 lg:px-8 border-t border-zinc-800/50">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-1">
              <span className="font-medium text-sm text-zinc-400">AXIOM</span>
              <span className="text-xs text-zinc-600">™</span>
            </div>
            <p className="text-sm text-zinc-600">
              © 2026 Axiom Systems
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
