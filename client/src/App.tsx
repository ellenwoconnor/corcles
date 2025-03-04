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
import { AddressCompletionDialog } from "./components/address-completion-dialog"; // Added import

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

// This component handles rendering the address dialog when needed
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

      {/* Render address collection dialog when needed */}
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
  // Get client ID from window.env in production or import.meta.env in development
  const clientId = typeof window !== 'undefined' && window.env?.GOOGLE_CLIENT_ID 
    ? window.env.GOOGLE_CLIENT_ID 
    : import.meta.env.GOOGLE_CLIENT_ID || '';
  
  // Log environment information for debugging
  console.log("Environment Check:", {
    isDevelopment: import.meta.env.DEV,
    isProduction: import.meta.env.PROD,
    mode: import.meta.env.MODE,
    hasClientId: Boolean(clientId),
    clientIdLength: clientId.length,
    clientIdSource: typeof window !== 'undefined' && window.env?.GOOGLE_CLIENT_ID ? 'window.env' : 'import.meta.env',
    envKeys: Object.keys(import.meta.env)
  });
  
  if (!clientId) {
    console.error("Google OAuth Client ID is missing", {
      env: import.meta.env.MODE,
      availableEnvVars: Object.keys(import.meta.env).join(', ')
    });
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