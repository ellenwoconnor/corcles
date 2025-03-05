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

type LoginData = Pick<InsertUser, "username" | "password">;

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { toast } = useToast();
  const [needsAddressInfo, setNeedsAddressInfo] = useState(false);
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
      const res = await apiRequest("POST", "/api/login", credentials);
      return await res.json();
    },
    onSuccess: (user: SelectUser) => {
      queryClient.setQueryData(["/api/user"], user);
    },
    onError: (error: Error) => {
      toast({
        title: "Login failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const registerMutation = useMutation({
    mutationFn: async (credentials: InsertUser) => {
      const res = await apiRequest("POST", "/api/register", credentials);
      return await res.json();
    },
    onSuccess: (user: SelectUser) => {
      queryClient.setQueryData(["/api/user"], user);
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

  const googleAuthMutation = useMutation({
    mutationFn: async (accessToken: string) => {
      const res = await apiRequest("POST", "/api/auth/google", { accessToken });
      return await res.json();
    },
    onSuccess: async (user: SelectUser) => {
      queryClient.setQueryData(["/api/user"], user);
    },
    onError: (error: Error) => {
      toast({
        title: "Google login failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const [isGoogleSignupLoading, setIsLoading] = useState(false);

  const completeGoogleSignup = async (address: string, zipCode: string) => {
    if (!pendingGoogleUser) {
      throw new Error('No pending Google user');
    }

    try {
      setIsLoading(true);
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
        description: error.message,
        variant: "destructive",
      });
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const googleLogin = useGoogleLogin({
    onSuccess: async (response) => {
      try {
        // Log OAuth response for debugging
        console.info('Google OAuth Success:', {
          hasAccessToken: !!response.access_token,
          tokenLength: response.access_token.length,
          origin: window.location.origin
        });

        const res = await googleAuthMutation.mutateAsync(response.access_token);

        // Better type checking for the response
        if (res && 'needsAddressInfo' in res) {
          setNeedsAddressInfo(true);
          setPendingGoogleUser({
            email: res.email,
            name: res.name || '',
            picture: res.picture || '',
            userId: res.userId,
            accessToken: response.access_token
          });
        }
      } catch (error) {
        console.error('Google Authentication Error:', {
          error,
          origin: window.location.origin,
          isDevelopment: import.meta.env.DEV,
          clientIdSource: import.meta.env.DEV ? 'development' : 'production'
        });

        toast({
          title: "Authentication Error",
          description: "Failed to authenticate. Please ensure you're using the Web client ID with correct domain configuration.",
          variant: "destructive",
        });
      }
    },
    onError: (error) => {
      console.error('Google OAuth Error:', {
        error,
        origin: window.location.origin,
        isDevelopment: import.meta.env.DEV
      });

      toast({
        title: "Google Sign-In Failed",
        description: "Could not initialize Google Sign-In. Please check the client configuration.",
        variant: "destructive",
      });
    },
    flow: 'implicit',
    scope: 'email profile'
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

export type { LoginData };
export { AuthContext };