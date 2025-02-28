import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { useAuth } from "@/features/auth/hooks/use-auth";
import { FaRecycle } from "react-icons/fa";

export default function LandingPage() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-background">
      <nav className="container py-4">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <FaRecycle className="h-6 w-6 text-primary" />
            <span className="text-xl font-bold">Corcles</span>
          </div>
          {!user && (
            <Button variant="ghost" asChild>
              <Link href="/auth">Sign In</Link>
            </Button>
          )}
        </div>
      </nav>

      <main className="container py-24">
        <div className="max-w-3xl mx-auto text-center space-y-8">
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight">
            Your Neighborhood's
            <span className="text-primary"> Sustainable</span> Marketplace
          </h1>
          <p className="text-xl text-muted-foreground">
            Join your local community in reducing waste and sharing resources.
            Give items a second life while connecting with neighbors.
          </p>
          <div className="flex justify-center gap-4">
            <Button size="lg" asChild>
              <Link href="/auth?mode=signup">Get Started</Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link href="/auth">Sign In</Link>
            </Button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-16">
            <div className="p-6 rounded-lg border bg-card">
              <h3 className="text-lg font-semibold mb-2">Share Locally</h3>
              <p className="text-muted-foreground">
                Connect with neighbors and share items within your community
              </p>
            </div>
            <div className="p-6 rounded-lg border bg-card">
              <h3 className="text-lg font-semibold mb-2">Reduce Waste</h3>
              <p className="text-muted-foreground">
                Give items a second life instead of sending them to landfills
              </p>
            </div>
            <div className="p-6 rounded-lg border bg-card">
              <h3 className="text-lg font-semibold mb-2">Build Community</h3>
              <p className="text-muted-foreground">
                Create stronger neighborhood bonds through sustainable sharing
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
