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
  // Get the client ID based on environment
  const clientId = (() => {
    try {
      // In development, use Vite's import.meta.env
      if (import.meta.env.DEV) {
        const devClientId = import.meta.env.GOOGLE_CLIENT_ID;
        if (!devClientId) {
          throw new Error('Google Client ID not found in development environment');
        }
        return devClientId;
      }

      // In production, use window.env
      if (typeof window === 'undefined') {
        throw new Error('Window is undefined');
      }

      // Initialize window.env if it doesn't exist
      if (!window.env) {
        console.warn('window.env is undefined in production. This may happen if:');
        console.warn('1. The HTML injection script hasn\'t run yet');
        console.warn('2. There was an error in the server-side HTML injection');
        window.env = {};
      }

      if (!window.env.GOOGLE_CLIENT_ID) {
        console.error('Google Client ID not found in production environment');
        // Instead of throwing, we could return a fallback or null
        return null; // Will display the configuration error UI
      }

      return window.env.GOOGLE_CLIENT_ID;
    } catch (error) {
      console.error('OAuth Configuration Error:', error);
      return null;
    }
  })();

  // Log configuration status
  console.info('OAuth Configuration Status:', {
    hasClientId: !!clientId,
    clientIdLength: clientId?.length || 0,
    isDevelopment: import.meta.env.DEV,
    isProduction: import.meta.env.PROD,
    devClientId: import.meta.env.DEV ? import.meta.env.GOOGLE_CLIENT_ID : undefined,
    windowEnvClientId: typeof window !== 'undefined' ? window.env?.GOOGLE_CLIENT_ID : undefined
  });

  // Show error UI if client ID is missing
  if (!clientId) {
    return (
      <ConfigurationError 
        message={`OAuth configuration is missing. Please ensure:
1. You are using the Web client ID (not auto-created)
2. JavaScript origins include your domain
3. The client ID is properly set in environment variables`}
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