import { useForm } from "react-hook-form";
import { useLocation } from "wouter";
import { useAuth } from "@/features/auth/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Loader2 } from "lucide-react";
import { apiRequest } from "@/lib/queryClient"; // Corrected import path

interface AddressData {
  address: string;
  zipCode: string;
}

export default function WelcomePage() {
  const {
    user,
    pendingGoogleUser,
    completeGoogleSignup,
    completeRegistration,
  } = useAuth();
  const [, setLocation] = useLocation();
  const form = useForm<AddressData>();

  const onSubmit = form.handleSubmit(async (data) => {
    try {
      if (pendingGoogleUser) {
        await completeGoogleSignup(data.address, data.zipCode);
      } else {
        const response = await apiRequest("PATCH", "/api/user", data);
        if (!response.ok) {
          throw new Error("Failed to update profile");
        }
        const updatedUser = await response.json();
        queryClient.setQueryData(["/api/user"], updatedUser);
      }
      setLocation("/"); // Only redirect on success
    } catch (error) {
      console.error("Failed to update profile:", error);
    }
  });

  // Only redirect if user has address and it wasn't just registered
  if (user?.address && user?.zipCode && !form.formState.isSubmitting) {
    setLocation("/");
    return null;
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-10">
      <div className="max-w-[600px] w-full space-y-8">
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold">
            welcome to{" "}
            <span className="uppercase tracking-wide">
              C<span className="text-[#B2B8A3]">O</span>RCLES
            </span>
          </h1>
          <p className="text-muted-foreground py-6">
            A smarter way to give, get & swap in your neighborhood.
          </p>
          <h1 className="text-muted-foreground">Let's find your community!</h1>
        </div>

        <Form {...form}>
          <form onSubmit={onSubmit} className="space-y-6">
            <FormField
              control={form.control}
              name="address"
              rules={{
                required: "Address is required",
                minLength: {
                  value: 5,
                  message: "Address must be at least 5 characters",
                },
                validate: (value) => {
                  const hasNumberAndStreet = /\d+.*\s+.*/.test(value);
                  if (!hasNumberAndStreet) {
                    return "Address must contain both numbers and street name";
                  }
                  return true;
                },
              }}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Street Address</FormLabel>
                  <FormControl>
                    <Input placeholder="123 Main St" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="zipCode"
              rules={{
                required: "Zip code is required",
                minLength: {
                  value: 5,
                  message: "Zip code must be 5 digits",
                },
                validate: (value) => {
                  if (!/^\d{5}$/.test(value)) {
                    return "Zip code must be exactly 5 digits";
                  }
                  return true;
                },
              }}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Zip Code</FormLabel>
                  <FormControl>
                    <Input placeholder="12345" maxLength={5} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button
              type="submit"
              className="w-full"
              disabled={form.formState.isSubmitting}
            >
              {form.formState.isSubmitting && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Continue
            </Button>
          </form>
        </Form>
      </div>
    </div>
  );
}
