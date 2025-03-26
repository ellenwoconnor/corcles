import React, { createContext, ReactNode, useContext, useState } from "react";
import {
  useQuery,
  useMutation,
  UseMutationResult,
} from "@tanstack/react-query";
import { InsertUser, User as SelectUser } from "@shared/schema";
import { getQueryFn, apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useGoogleLogin } from '@react-oauth/google';

type AuthContextType = {
  user: SelectUser | null;
  isLoading: boolean;
  error: Error | null;
  loginMutation: UseMutationResult<SelectUser, Error, LoginData>;
  logoutMutation: UseMutationResult<void, Error, void>;
  registerMutation: UseMutationResult<SelectUser, Error, InsertUser>;
  googleLogin: () => void;
  needsAddressInfo: boolean;
  pendingGoogleUser: {
    email: string;
    name: string;
    picture: string;
    userId?: number;
    accessToken: string;
  } | null;
  completeGoogleSignup: (address: string, zipCode: string) => Promise<SelectUser | undefined>;
  isGoogleSignupLoading: boolean;
};

export interface LoginData {
  username: string;  // Keep username for backend compatibility
  password: string;
}

export const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }): JSX.Element {
  const { toast } = useToast();
  const [needsAddressInfo, setNeedsAddressInfo] = useState(false);
  const [isGoogleSignupLoading, setIsGoogleSignupLoading] = useState(false);
  const [pendingGoogleUser, setPendingGoogleUser] = useState<{
    email: string;
    name: string;
    picture: string;
    userId?: number;
    accessToken: string;
  } | null>(null);

  const {
    data: user,
    error,
    isLoading,
  } = useQuery<SelectUser | null, Error>({
    queryKey: ["/api/user"],
    queryFn: getQueryFn({ on401: "returnNull" }),
  });

  const loginMutation = useMutation({
    mutationFn: async (credentials: LoginData) => {
      try {
        const response = await apiRequest("POST", "/api/login", credentials);

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || "Login failed");
        }
        return response.json();
      } catch (error) {
        console.error("Login error:", error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      window.location.href = "/";
    },
    onError: (error: Error) => {
      toast({
        title: "Login failed",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  const registerMutation = useMutation({
    mutationFn: async (credentials: InsertUser & { needsAddressInfo?: boolean }) => {
      try {
        if (credentials.needsAddressInfo) {
          // Store initial registration data and indicate address info needed
          setNeedsAddressInfo(true);
          // Return partial registration data without making API call
          return {
            email: credentials.email,
            username: credentials.username,
            displayName: credentials.displayName,
            needsAddressInfo: true
          };
        }

        const res = await apiRequest("POST", "/api/register", credentials);
        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.message || data.error || "Registration failed");
        }

        if (!data) {
          throw new Error("No user data returned from registration");
        }

        return data;
      } catch (error) {
        console.error("Registration error:", error);
        throw error;
      }
    },
    onSuccess: (response: any) => {
      if (response.needsAddressInfo) {
        // Redirect to welcome page for address collection
        window.location.href = "/welcome";
      } else {
        // Normal registration success
        queryClient.setQueryData(["/api/user"], response);
        window.location.href = "/";
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Registration failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/logout");
    },
    onSuccess: () => {
      queryClient.clear();
      queryClient.setQueryData(["/api/user"], null);
    },
    onError: (error: Error) => {
      toast({
        title: "Logout failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const completeGoogleSignup = async (address: string, zipCode: string) => {
    if (!pendingGoogleUser) {
      throw new Error('No pending Google user');
    }

    try {
      setIsGoogleSignupLoading(true);
      const response = await apiRequest("POST", "/api/auth/google", {
        accessToken: pendingGoogleUser.accessToken,
        address,
        zipCode
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to complete signup');
      }

      const user = await response.json();
      queryClient.setQueryData(["/api/user"], user);
      setNeedsAddressInfo(false);
      setPendingGoogleUser(null);
      return user;
    } catch (error) {
      console.error('Completing Google signup error:', error);
      toast({
        title: "Google signup failed",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
      throw error;
    } finally {
      setIsGoogleSignupLoading(false);
    }
  };

  const googleLogin = useGoogleLogin({
    onSuccess: async (response) => {
      try {
        const res = await apiRequest("POST", "/api/auth/google", {
          accessToken: response.access_token
        });

        if (!res.ok) {
          throw new Error('Failed to authenticate with Google');
        }

        const data = await res.json();

        if (data.needsAddressInfo) {
          setNeedsAddressInfo(true);
          setPendingGoogleUser({
            email: data.email,
            name: data.name || '',
            picture: data.picture || '',
            userId: data.userId,
            accessToken: response.access_token
          });
        } else {
          queryClient.setQueryData(["/api/user"], data);
          window.location.href = "/";
        }
      } catch (error) {
        console.error('Google Authentication Error:', error);
        toast({
          title: "Authentication Error",
          description: "Failed to authenticate with Google",
          variant: "destructive",
        });
      }
    },
    onError: (error) => {
      console.error('Google OAuth Error:', error);
      toast({
        title: "Google Sign-In Failed",
        description: "Could not initialize Google Sign-In",
        variant: "destructive",
      });
    }
  });

  return (
    <AuthContext.Provider
      value={{
        user: user ?? null,
        isLoading,
        error,
        loginMutation,
        logoutMutation,
        registerMutation,
        googleLogin,
        needsAddressInfo,
        pendingGoogleUser,
        completeGoogleSignup,
        isGoogleSignupLoading
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}