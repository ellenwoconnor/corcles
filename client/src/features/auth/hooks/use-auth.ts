
import { createContext, ReactNode, useContext, useState } from "react";
import {
  useQuery,
  useMutation,
  UseMutationResult,
} from "@tanstack/react-query";
import { insertUserSchema, User as SelectUser, InsertUser } from "@shared/schema";
import { getQueryFn, apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useGoogleLogin } from '@react-oauth/google';

interface LoginData {
  email: string;
  password: string;
}

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
  updateUserProfile: (data: { address: string; zipCode: string }) => Promise<void>;
};

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
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
    refetch: refetchUser
  } = useQuery<SelectUser | null, Error>({
    queryKey: ["/api/user"],
    queryFn: getQueryFn({ on401: "returnNull" }),
  });

  const loginMutation = useMutation({
    mutationFn: async (credentials: LoginData) => {
      const response = await apiRequest("POST", "/api/login", credentials);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Login failed");
      }
      return response.json();
    },
    onSuccess: async () => {
      const userData = await refetchUser();
      if (userData?.data && (!userData.data.address || !userData.data.zipCode)) {
        window.location.href = "/welcome";
      } else {
        window.location.href = "/";
      }
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
      const res = await apiRequest("POST", "/api/register", credentials);
      return res.json();
    },
    onSuccess: async () => {
      const userData = await refetchUser();
      if (userData?.data && (!userData.data.address || !userData.data.zipCode)) {
        window.location.href = "/welcome";
      } else {
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
      window.location.href = "/auth";
    },
    onError: (error: Error) => {
      toast({
        title: "Logout failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const googleAuthMutation = useMutation({
    mutationFn: async (accessToken: string) => {
      const res = await apiRequest("POST", "/api/auth/google", { accessToken });
      return res.json();
    },
    onSuccess: async (user: SelectUser) => {
      queryClient.setQueryData(["/api/user"], user);
      if (!user.address || !user.zipCode) {
        window.location.href = "/welcome";
      } else {
        window.location.href = "/";
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Google login failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateUserProfile = async (data: { address: string; zipCode: string }) => {
    try {
      const response = await apiRequest("PUT", "/api/user", data);
      if (!response.ok) {
        throw new Error("Failed to update profile");
      }
      await refetchUser();
      window.location.href = "/";
    } catch (error) {
      toast({
        title: "Profile update failed",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
      throw error;
    }
  };

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
        await googleAuthMutation.mutateAsync(response.access_token);
      } catch (error) {
        console.error('Google login error:', error);
      }
    },
    onError: (error) => {
      console.error('Google OAuth error:', error);
      toast({
        title: "Google login failed",
        description: "Could not authenticate with Google",
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
        isGoogleSignupLoading,
        updateUserProfile
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

export type { LoginData, AuthContextType };
