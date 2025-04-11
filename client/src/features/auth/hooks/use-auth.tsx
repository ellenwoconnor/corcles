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
  completeRegistration: (data: { address: string; zipCode: string }) => Promise<void>;
};

export interface LoginData {
  username: string;  // Keep username for backend compatibility
  password: string;
  email?: string;    // Added for form compatibility
}

export const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }): JSX.Element {
  const { toast } = useToast();

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
    mutationFn: async (credentials: InsertUser) => {
      try {
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
      // Always redirect to welcome for address collection after registration
      queryClient.setQueryData(["/api/user"], response);
      window.location.href = "/welcome";
    },
    onError: (error: Error) => {
      toast({
        title: "Registration failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const completeRegistration = async (data: { address: string; zipCode: string }) => {
    try {
      const response = await apiRequest("POST", "/api/register/complete", data);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to complete registration");
      }

      const userData = await response.json();
      queryClient.setQueryData(["/api/user"], userData);
      window.location.href = "/";
    } catch (error) {
      console.error("Error completing registration:", error);
      toast({
        title: "Registration completion failed",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
      throw error;
    }
  };

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
        queryClient.setQueryData(["/api/user"], data);
        window.location.href = "/welcome";
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
        completeRegistration,
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