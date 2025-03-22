
import { useState } from "react";
import { useForm } from "react-hook-form";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/features/auth/hooks/use-auth";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Loader2 } from "lucide-react";

interface WelcomeDialogProps {
  communities?: (Community & { role: string })[];
}

interface AddressData {
  address: string;
  zipCode: string;
}

export function WelcomeDialog({ communities }: WelcomeDialogProps) {
  const { user, updateUserProfile } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const form = useForm<AddressData>();

  const onSubmit = form.handleSubmit(async (data) => {
    setIsSubmitting(true);
    try {
      await updateUserProfile(data);
    } finally {
      setIsSubmitting(false);
    }
  });

  const needsAddress = !user?.address || !user?.zipCode;

  return (
    <Dialog open={needsAddress} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="text-2xl py-4">
            Welcome to <span className="uppercase tracking-wide">C<span className="text-[#B2B8A3]">O</span>RCLES</span>!
          </DialogTitle>
          <DialogDescription className="text-base space-y-4 pt-4">
            <p>
              Say goodbye to waste -- Corcles is a smarter way to share and shop
              sustainably in your neighborhood.
            </p>
            <p>
              To get started, please provide your address and zip code to join your local corcle.
            </p>
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={onSubmit} className="space-y-4">
            <FormField
              control={form.control}
              name="address"
              rules={{ required: "Address is required" }}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Address</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="123 Main St" />
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
                pattern: {
                  value: /^\d{5}$/,
                  message: "Please enter a valid 5-digit zip code"
                }
              }}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Zip Code</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="12345" maxLength={5} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Join My Corcle
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
