import React, { useEffect } from "react";
import { useLocation } from "wouter";
import { AuthForm } from "@/features/auth/components/auth-form";
import { useAuth } from "@/features/auth/hooks/use-auth";

export default function AuthPage() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      setLocation("/");
    }
  }, [user, setLocation]);

  if (user) {
    return null;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center mb-8">
          <div className="flex items-center gap-4">
            <h1 className="text-7xl">
              C<span className="text-[#B2B8A3]">O</span>RCLES
            </h1>
          </div>
          <p className="text-lg text-muted-foreground mt-2">
            sharing made simple
          </p>
        </div>
        <div className="p-6 bg-card rounded-lg shadow-lg">
          <AuthForm />
        </div>
      </div>
    </div>
  );
}
