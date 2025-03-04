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
  const { 
    needsAddressInfo, 
    pendingGoogleUser, 
    completeGoogleSignup 
  } = useAuth();

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
  const clientId = import.meta.env.VITE_GOOGLE_OAUTH_CLIENT_ID;

  // Log environment details on app initialization
  console.log('Environment Check:', {
    isDevelopment: import.meta.env.DEV,
    isProduction: import.meta.env.PROD,
    mode: import.meta.env.MODE,
    hasClientId: Boolean(clientId),
    clientIdLength: clientId?.length || 0,
    envKeys: Object.keys(import.meta.env).filter(key => key.startsWith('VITE_'))
  });

  if (!clientId) {
    console.error('Google OAuth Client ID is missing', {
      env: import.meta.env.MODE,
      availableEnvVars: Object.keys(import.meta.env)
        .filter(key => key.startsWith('VITE_'))
        .join(', ')
    });
  }

  return (
    <GoogleOAuthProvider clientId={clientId || ''}>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <AppContent />
        </AuthProvider>
      </QueryClientProvider>
    </GoogleOAuthProvider>
  );
}

export default App;