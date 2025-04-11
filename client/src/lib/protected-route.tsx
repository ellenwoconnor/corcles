import { useAuth } from "@/features/auth/hooks/use-auth";
import { Loader2 } from "lucide-react";
import { Redirect, Route } from "wouter";

export function ProtectedRoute({
  path,
  component: Component,
}: {
  path: string;
  component: () => JSX.Element;
}) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <Route path={path}>
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="h-8 w-8 animate-spin text-border" />
        </div>
      </Route>
    );
  }

  if (!user) {
    return (
      <Route path={path}>
        <Redirect to="/auth" />
      </Route>
    );
  }
  
  // If user has no address or zip code, redirect to welcome page to collect it
  if (path !== '/welcome' && (!user.address || !user.zipCode)) {
    console.log('User missing address info, redirecting to welcome page');
    return (
      <Route path={path}>
        <Redirect to="/welcome" />
      </Route>
    );
  }

  return <Route path={path} component={Component} />;
}