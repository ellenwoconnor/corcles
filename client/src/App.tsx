import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider, useAuth } from "@/features/auth/hooks/use-auth";
import { ProtectedRoute } from "./lib/protected-route";
import NotFound from "@/pages/not-found";
import AuthPage from "@/pages/auth-page";
import HomePage from "@/pages/home-page";
import ListingPage from "@/pages/listing-page";
import ProfilePage from "@/pages/profile-page";
import CommunitiesPage from "@/pages/communities-page";
import WishlistsPage from "@/pages/wishlists-page";
import S3TestComponent from "@/components/admin/s3-test";
import { GoogleOAuthProvider } from "@react-oauth/google";
import { AddressCompletionDialog } from "./components/address-completion-dialog";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { useState, useEffect } from "react";
import { NotificationCenter } from "@/components/notification-center"; // Assuming this component exists

// Configuration error component
function ConfigurationError({ message }: { message: string }) {
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Alert variant="destructive" className="max-w-md">
        <AlertTitle>Configuration Error</AlertTitle>
        <AlertDescription>{message}</AlertDescription>
      </Alert>
    </div>
  );
}

function Router() {
  return (
    <Switch>
      <ProtectedRoute path="/" component={HomePage} />
      <ProtectedRoute path="/item/:id" component={ListingPage} />
      <ProtectedRoute path="/profile" component={ProfilePage} />
      <ProtectedRoute path="/communities" component={CommunitiesPage} />
      <ProtectedRoute path="/wishlists" component={WishlistsPage} />
      <Route path="/auth" component={AuthPage} />
      <ProtectedRoute path="/admin/s3-test" component={S3TestComponent} />
      <Route component={NotFound} />
    </Switch>
  );
}

function AppContent() {
  const { needsAddressInfo, pendingGoogleUser, completeGoogleSignup } = useAuth();

  return (
    <>
      <Router />
      <Toaster />
      <NotificationCenter /> {/* Added NotificationCenter here */}
      {needsAddressInfo && pendingGoogleUser && (
        <AddressCompletionDialog
          open={needsAddressInfo}
          onComplete={completeGoogleSignup}
          email={pendingGoogleUser.email}
        />
      )}
    </>
  );
}

// Added useClientConfig hook -  ASSUMPTIONS MADE ABOUT API ENDPOINT AND RESPONSE
const useClientConfig = () => {
  const [config, setConfig] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const response = await fetch('/api/config');
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        setConfig(data);
      } catch (err) {
        setError(err);
      } finally {
        setLoading(false);
      }
    };

    fetchConfig();
  }, []);

  return { config, error, loading };
};


function App() {
  const { config, error, loading } = useClientConfig();

  // Show loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
      </div>
    );
  }

  // Show error if config fetch failed
  if (error) {
    return (
      <ConfigurationError message={`Failed to load application configuration: ${error}`} />
    );
  }

  // Check if Google OAuth config is available
  if (!config?.googleClientId) {
    return (
      <ConfigurationError message="Google OAuth Client ID is missing. Please check your server configuration." />
    );
  }

  return (
    <GoogleOAuthProvider clientId={config.googleClientId}>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <AppContent />
        </AuthProvider>
      </QueryClientProvider>
    </GoogleOAuthProvider>
  );
}

export default App;