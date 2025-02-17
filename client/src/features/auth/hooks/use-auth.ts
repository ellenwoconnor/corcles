import { create } from "zustand";
import { ReactNode } from "react";

interface User {
  id: number;
  email: string;
}

interface AuthState {
  user: User | null;
  login: (credentials: { email: string; password: string }) => Promise<void>;
  logout: () => void;
}

export const useAuth = create<AuthState>((set) => ({
  user: null,
  login: async (credentials) => {
    // Implement login logic here
    set({ user: { id: 1, email: credentials.email } });
  },
  logout: () => {
    set({ user: null });
  },
}));

// Add AuthProvider component for context
interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  return children;
}