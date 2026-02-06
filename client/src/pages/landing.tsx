import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";

export default function LandingPage() {
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
              <Link href="/dashboard">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="text-zinc-400"
                  data-testid="button-login"
                >
                  Enter
                </Button>
              </Link>
              <Link href="/dashboard">
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
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-semibold tracking-tight mb-16 text-zinc-100 leading-tight">
            The system of record for how decisions are made.
          </h1>
          
          <div className="space-y-4 mb-16">
            <p className="text-xl sm:text-2xl text-zinc-400">
              Most companies track data.
            </p>
            <p className="text-xl sm:text-2xl text-zinc-400">
              Very few track decisions.
            </p>
            <p className="text-xl sm:text-2xl text-zinc-100 font-medium">
              That's where risk hides.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 mb-12">
            <Link href="/dashboard">
              <Button 
                size="lg" 
                className="bg-zinc-100 text-zinc-900 border-zinc-100 text-base font-medium px-8"
                data-testid="button-briefing"
              >
                Enter Platform
              </Button>
            </Link>
            <Link href="/dashboard">
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

          <p className="text-sm text-zinc-500">
            AI-ready decision intelligence — with human accountability at the center.
          </p>
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
