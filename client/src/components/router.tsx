import { Switch, Route } from "wouter";
import { ProtectedRoute } from "@/lib/protected-route";
import NotFound from "@/pages/not-found";
import AuthPage from "@/pages/auth-page";
import HomePage from "@/pages/home-page";
import ListingPage from "@/pages/listing-page";
import ListingsPage from "@/pages/listings-page";
import ProfilePage from "@/pages/profile-page";
import CommunitiesPage from "@/pages/communities-page";
import RequestsPage from "@/pages/requests-page";
import WelcomePage from "@/pages/welcome-page";
import S3TestComponent from "@/components/admin/s3-test";

export function Router() {
  return (
    <Switch>
      <ProtectedRoute path="/" component={HomePage} />
      <ProtectedRoute path="/listings" component={ListingsPage} />
      <Route path="/item/:id" component={ListingPage} />
      <ProtectedRoute path="/profile" component={ProfilePage} />
      <ProtectedRoute path="/communities" component={CommunitiesPage} />
      <ProtectedRoute path="/requests" component={RequestsPage} />
      <Route path="/auth" component={AuthPage} />
      <Route path="/welcome" component={WelcomePage} /> {/* Unprotected welcome route */}
      <ProtectedRoute path="/admin/s3-test" component={S3TestComponent} />
      <Route component={NotFound} />
    </Switch>
  );
}