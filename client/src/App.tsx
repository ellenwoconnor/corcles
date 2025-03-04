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

// Get Google Client ID from either dev or prod environment
const getGoogleClientId = () => {
  // Try import.meta.env first (development)
  const devClientId = import.meta.env.GOOGLE_CLIENT_ID;
  if (devClientId) {
    console.debug('Using development Google Client ID');
    return devClientId;
  }

  // Fallback to window.env (production)
  const prodClientId = window.env?.GOOGLE_CLIENT_ID;
  console.debug('Using production Google Client ID:', Boolean(prodClientId));
  return prodClientId;
};

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
  const googleClientId = getGoogleClientId();

  if (!googleClientId) {
    console.error('Google Client ID is not configured', {
      hasDevClientId: Boolean(import.meta.env.GOOGLE_CLIENT_ID),
      hasWindowEnv: Boolean(window.env),
      hasWindowEnvClientId: Boolean(window.env?.GOOGLE_CLIENT_ID)
    });
  }

  return (
    <GoogleOAuthProvider clientId={googleClientId || ''}>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <AppContent />
        </AuthProvider>
      </QueryClientProvider>
    </GoogleOAuthProvider>
  );
}

export default App;