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

function App() {
  // Enhanced client ID validation
  const clientId = (() => {
    try {
      // Check if window.env exists and has the client ID
      if (typeof window === 'undefined' || !window.env) {
        throw new Error('Environment configuration not found');
      }

      const id = window.env.GOOGLE_CLIENT_ID;
      if (!id) {
        throw new Error('Google Client ID is not configured');
      }

      return id;
    } catch (error) {
      console.error('OAuth Configuration Error:', error);
      return null;
    }
  })();

  // Log configuration status
  console.info('Application Configuration:', {
    hasClientId: !!clientId,
    environment: window.env?.NODE_ENV || process.env.NODE_ENV,
    isProduction: window.env?.NODE_ENV === 'production'
  });

  // Show error UI if client ID is missing
  if (!clientId) {
    return (
      <ConfigurationError 
        message="OAuth configuration is missing. Please ensure the application is properly configured with Google Client ID."
      />
    );
  }

  return (
    <GoogleOAuthProvider clientId={clientId}>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <AppContent />
        </AuthProvider>
      </QueryClientProvider>
    </GoogleOAuthProvider>
  );
}

export default App;