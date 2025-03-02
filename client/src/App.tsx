import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider } from "@/features/auth/hooks/use-auth";
import { ProtectedRoute } from "./lib/protected-route";
import NotFound from "@/pages/not-found";
import AuthPage from "@/pages/auth-page";
import HomePage from "@/pages/home-page";
import ListingPage from "@/pages/listing-page";
import ProfilePage from "@/pages/profile-page";
import CommunitiesPage from "@/pages/communities-page";
import WishlistsPage from "@/pages/wishlists-page";
// Placeholder components - replace with actual components

import MyListingsPage from "@/pages/my-listings-page";
import FavoritesPage from "@/pages/favorites-page";
import S3TestPage from "@/pages/s3-test-page"; // Placeholder component
import RequireAuth from "@/components/require-auth"; // Placeholder component


function Router() {
  return (
    <Switch>
      <ProtectedRoute path="/" component={HomePage} />
      <ProtectedRoute path="/item/:id" component={ListingPage} />
      <ProtectedRoute path="/profile" component={ProfilePage} />
      <ProtectedRoute path="/communities" component={CommunitiesPage} />
      <ProtectedRoute path="/wishlists" component={WishlistsPage} />
      <Route path="/auth" component={AuthPage} />
      {/* About page route removed */}
      <Route path="/my-listings" element={<RequireAuth><MyListingsPage /></RequireAuth>} />
      <Route path="/favorites" element={<RequireAuth><FavoritesPage /></RequireAuth>} />
      <Route path="/admin/s3-test" element={<RequireAuth><S3TestPage /></RequireAuth>} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Router />
        <Toaster />
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;