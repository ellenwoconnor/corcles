import { useState, useEffect } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider, useAuth } from "@/features/auth/hooks/use-auth";
import { GoogleOAuthProvider } from "@react-oauth/google";
import { useLocation } from "wouter";
import { AddressCompletionDialog } from "./components/address-completion-dialog";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Router } from "@/components/router";
import { queryClient } from "./lib/queryClient";
import { ThemeProvider } from "@/components/theme-provider";
import WelcomePage from "@/pages/welcome-page"; // Added import for WelcomePage

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

function AppContent() {
  const { user, needsAddressInfo } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (user && needsAddressInfo) {
      setLocation('/welcome');
    } else if (user) {
      setLocation('/');
    }
  }, [user, needsAddressInfo, setLocation]);

  return (
    <>
      <Router />
      <Toaster />
    </>
  );
}

const useClientConfig = () => {
  const [config, setConfig] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const response = await fetch("/api/config");
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

export default function App() {
  const { config, error, loading } = useClientConfig();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
      </div>
    );
  }

  if (error) {
    return (
      <ConfigurationError
        message={`Failed to load application configuration: ${error}`}
      />
    );
  }

  if (!config?.googleClientId) {
    return (
      <ConfigurationError message="Google OAuth Client ID is missing. Please check your server configuration." />
    );
  }

  return (
    <ThemeProvider defaultTheme="light" storageKey="vite-ui-theme">
      <GoogleOAuthProvider clientId={config.googleClientId}>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <AppContent />
          </AuthProvider>
        </QueryClientProvider>
      </GoogleOAuthProvider>
    </ThemeProvider>
  );
}