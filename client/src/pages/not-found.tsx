import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { FileText, ArrowLeft } from "lucide-react";
import { useOrgLink } from "@/lib/use-org-link";

export default function NotFound() {
  const orgLink = useOrgLink();
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background">
      <Card className="w-full max-w-md mx-4">
        <CardContent className="pt-6 text-center">
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
            <FileText className="h-8 w-8 text-muted-foreground" />
          </div>
          <h1 className="text-xl font-semibold mb-2">Page not found</h1>
          <p className="text-sm text-muted-foreground mb-6">
            The page you are looking for does not exist or has been moved.
          </p>
          <Link href={orgLink("/dashboard")}>
            <Button variant="outline" data-testid="button-back-dashboard">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Return to Dashboard
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
