import { useState } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ThemeToggle } from "@/components/theme-toggle";
import { useOrgLink } from "@/lib/use-org-link";
import { useToast } from "@/hooks/use-toast";
import {
  ClipboardCheck,
  Activity,
  AlertTriangle,
  Shield,
  BarChart3,
  Lock,
  FileCheck,
  Database,
  ArrowRight,
} from "lucide-react";

export default function LandingPage() {
  const orgLink = useOrgLink();
  const { toast } = useToast();
  const [formData, setFormData] = useState({ name: "", email: "", company: "", message: "" });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleDemoRequest = (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!formData.email.trim()) {
      toast({ title: "Please enter your email address", variant: "destructive" });
      return;
    }

    setIsSubmitting(true);

    const subject = encodeURIComponent("AXIOM Demo Request");
    const body = encodeURIComponent(
      `Name: ${formData.name}\nEmail: ${formData.email}\nCompany: ${formData.company}\n\n${formData.message || "I'd like to schedule a demo of AXIOM."}`
    );
    window.location.href = `mailto:hello@axiomdecisionlayer.com?subject=${subject}&body=${body}`;

    setTimeout(() => {
      setIsSubmitting(false);
      toast({ title: "Opening your email client", description: "If it doesn't open, email us directly at hello@axiomdecisionlayer.com" });
    }, 1000);
  };

  const scrollToDemo = (e: React.MouseEvent) => {
    e.preventDefault();
    document.getElementById("request-demo")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <nav className="fixed top-0 left-0 right-0 z-50 bg-zinc-950/90 backdrop-blur-sm border-b border-zinc-800/50">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 gap-4">
            <div className="flex items-center gap-1">
              <span className="font-semibold text-lg tracking-tight text-zinc-100">AXIOM</span>
              <span className="text-xs text-zinc-500 font-medium">&trade;</span>
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
              <Button
                variant="outline"
                size="sm"
                className="border-zinc-700 text-zinc-300"
                data-testid="button-demo-nav"
                onClick={scrollToDemo}
              >
                Request Demo
              </Button>
            </div>
          </div>
        </div>
      </nav>

      <section className="min-h-screen flex flex-col justify-center px-6 lg:px-8 pt-16">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-semibold tracking-tight mb-6 text-zinc-100 leading-tight" data-testid="text-hero-headline">
            Every decision recorded. Every assumption tracked. Every audit answered.
          </h1>

          <p className="text-xl sm:text-2xl text-zinc-400 mb-16" data-testid="text-hero-subheadline">
            AXIOM is the system of record for how your organization makes decisions — who owned them, what was assumed, and whether those assumptions still hold.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 mb-12">
            <Button
              size="lg"
              className="bg-zinc-100 text-zinc-900 border-zinc-100 text-base font-medium"
              data-testid="button-request-demo"
              onClick={scrollToDemo}
            >
              Request a Demo
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
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

      <section className="px-6 lg:px-8 py-16 border-t border-zinc-800/50" data-testid="section-problem">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-semibold text-zinc-100 mb-4">The Problem</h2>
          <p className="text-lg text-zinc-400 mb-8 max-w-3xl">
            Decisions are ephemeral and degrade silently, creating massive hidden risk. Important decisions are made every day, but they are rarely captured properly.
          </p>
          <div className="grid sm:grid-cols-2 gap-6">
            <div className="border border-zinc-800/60 rounded-lg p-5" data-testid="pain-institutional-amnesia">
              <h3 className="text-sm font-medium text-zinc-300 mb-2">Institutional Amnesia</h3>
              <p className="text-sm text-zinc-500">Only the final outcome is noted. The full context — rationale, assumptions, ownership, and evidence — is lost over time.</p>
            </div>
            <div className="border border-zinc-800/60 rounded-lg p-5" data-testid="pain-silent-degradation">
              <h3 className="text-sm font-medium text-zinc-300 mb-2">Silent Degradation</h3>
              <p className="text-sm text-zinc-500">Assumptions change, expire, or become invalid. Without visibility, decisions degrade without anyone noticing until a crisis.</p>
            </div>
            <div className="border border-zinc-800/60 rounded-lg p-5" data-testid="pain-decision-debt">
              <h3 className="text-sm font-medium text-zinc-300 mb-2">Invisible Decision Debt</h3>
              <p className="text-sm text-zinc-500">Departed owners, overdue reviews, forgotten context — creating real organizational risk that surfaces only during audits or post-mortems.</p>
            </div>
            <div className="border border-zinc-800/60 rounded-lg p-5" data-testid="pain-no-audit-trail">
              <h3 className="text-sm font-medium text-zinc-300 mb-2">No Defensible Record</h3>
              <p className="text-sm text-zinc-500">Decision records scattered across emails, Slack, and memory — failing audits, regulatory scrutiny, legal discovery, and board questions.</p>
            </div>
          </div>
        </div>
      </section>

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

      <section className="px-6 lg:px-8 py-16 border-t border-zinc-800/50" data-testid="section-trust">
        <div className="max-w-4xl mx-auto">
          <div className="grid sm:grid-cols-3 gap-8">
            <div className="flex gap-3 items-start" data-testid="trust-immutable">
              <Lock className="w-5 h-5 text-zinc-500 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="text-sm font-medium text-zinc-300">Append-Only Records</h4>
                <p className="text-xs text-zinc-500">Every decision entry is permanent. No edits, no deletions — only new versions.</p>
              </div>
            </div>
            <div className="flex gap-3 items-start" data-testid="trust-audit">
              <FileCheck className="w-5 h-5 text-zinc-500 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="text-sm font-medium text-zinc-300">Compliance-Ready</h4>
                <p className="text-xs text-zinc-500">Built for regulatory audits, legal discovery, and board-level scrutiny from day one.</p>
              </div>
            </div>
            <div className="flex gap-3 items-start" data-testid="trust-isolation">
              <Database className="w-5 h-5 text-zinc-500 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="text-sm font-medium text-zinc-300">Data Isolation</h4>
                <p className="text-xs text-zinc-500">Organization-scoped data with row-level security. Your decisions stay yours.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

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

      <section id="request-demo" className="px-6 lg:px-8 py-24 border-t border-zinc-800/50" data-testid="section-request-demo">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-semibold text-zinc-100 mb-3">Request a Demo</h2>
          <p className="text-zinc-400 mb-8">
            See how AXIOM captures decisions, tracks assumptions, and surfaces decision debt — in a live walkthrough tailored to your organization.
          </p>

          <form onSubmit={handleDemoRequest} data-testid="form-demo-request">
            <div className="space-y-4 mb-6">
              <div>
                <label htmlFor="demo-name" className="block text-sm font-medium text-zinc-300 mb-1.5">Name</label>
                <Input
                  id="demo-name"
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Your name"
                  className="bg-zinc-900 border-zinc-800 text-zinc-100 placeholder:text-zinc-600"
                  data-testid="input-demo-name"
                />
              </div>
              <div>
                <label htmlFor="demo-email" className="block text-sm font-medium text-zinc-300 mb-1.5">Work Email <span className="text-zinc-500">*</span></label>
                <Input
                  id="demo-email"
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="you@company.com"
                  className="bg-zinc-900 border-zinc-800 text-zinc-100 placeholder:text-zinc-600"
                  data-testid="input-demo-email"
                />
              </div>
              <div>
                <label htmlFor="demo-company" className="block text-sm font-medium text-zinc-300 mb-1.5">Company</label>
                <Input
                  id="demo-company"
                  type="text"
                  value={formData.company}
                  onChange={(e) => setFormData(prev => ({ ...prev, company: e.target.value }))}
                  placeholder="Company name"
                  className="bg-zinc-900 border-zinc-800 text-zinc-100 placeholder:text-zinc-600"
                  data-testid="input-demo-company"
                />
              </div>
              <div>
                <label htmlFor="demo-message" className="block text-sm font-medium text-zinc-300 mb-1.5">What are you looking to solve?</label>
                <Textarea
                  id="demo-message"
                  rows={3}
                  value={formData.message}
                  onChange={(e) => setFormData(prev => ({ ...prev, message: e.target.value }))}
                  placeholder="Tell us about your decision tracking challenges (optional)"
                  className="bg-zinc-900 border-zinc-800 text-zinc-100 placeholder:text-zinc-600 resize-none"
                  data-testid="input-demo-message"
                />
              </div>
            </div>
            <Button
              type="submit"
              size="lg"
              disabled={isSubmitting}
              className="w-full sm:w-auto bg-zinc-100 text-zinc-900 text-base font-medium"
              data-testid="button-submit-demo"
            >
              {isSubmitting ? "Opening Email..." : "Request Demo"}
            </Button>
            <p className="text-xs text-zinc-600 mt-3">
              Or email us directly at{" "}
              <a href="mailto:hello@axiomdecisionlayer.com" className="text-zinc-400 hover:underline" data-testid="link-contact-email">
                hello@axiomdecisionlayer.com
              </a>
            </p>
          </form>
        </div>
      </section>

      <footer className="py-8 px-6 lg:px-8 border-t border-zinc-800/50">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-1">
              <span className="font-medium text-sm text-zinc-400">AXIOM</span>
              <span className="text-xs text-zinc-600">&trade;</span>
            </div>
            <p className="text-sm text-zinc-600">
              &copy; 2026 Axiom Systems
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
