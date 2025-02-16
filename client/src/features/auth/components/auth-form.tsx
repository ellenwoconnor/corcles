import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { insertUserSchema } from "@shared/schema";
import { useAuth } from "../hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const loginSchema = insertUserSchema.pick({
  username: true,
  password: true,
});

type AuthFormProps = {
  onSuccess?: () => void;
};

export function AuthForm({ onSuccess }: AuthFormProps) {
  const { loginMutation, registerMutation } = useAuth();

  const loginForm = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  const registerForm = useForm<z.infer<typeof insertUserSchema>>({
    resolver: zodResolver(
      insertUserSchema.extend({
        password: z.string().min(6, "Password must be at least 6 characters"),
        address: z.string().min(1, "Address is required"),
        zipCode: z.string().regex(/^\d{5}$/, "ZIP code must be 5 digits"),
        acceptTerms: z.boolean().refine((val) => val === true, {
          message: "You must accept the Terms of Service",
        }),
      })
    ),
    defaultValues: {
      username: "",
      password: "",
      displayName: "",
      address: "",
      zipCode: "",
    },
  });

  return (
    <Tabs defaultValue="login">
      <TabsList className="grid w-full grid-cols-2 mb-6">
        <TabsTrigger value="login">Login</TabsTrigger>
        <TabsTrigger value="register">Register</TabsTrigger>
      </TabsList>

      <TabsContent value="login">
        <Form {...loginForm}>
          <form
            onSubmit={loginForm.handleSubmit(async (data) => {
              try {
                await loginMutation.mutateAsync(data);
                onSuccess?.();
              } catch (error) {
                // Login errors are already handled by the mutation
              }
            })}
            className="space-y-4"
          >
            <FormField
              control={loginForm.control}
              name="username"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Username</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={loginForm.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Password</FormLabel>
                  <FormControl>
                    <Input type="password" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button
              type="submit"
              className="w-full"
              disabled={loginMutation.isPending}
            >
              Login
            </Button>
          </form>
        </Form>
      </TabsContent>

      <TabsContent value="register">
        <Form {...registerForm}>
          <form
            onSubmit={registerForm.handleSubmit(async (data) => {
              try {
                await registerMutation.mutateAsync(data);
                onSuccess?.();
              } catch (error) {
                // Registration errors are handled in the mutation
                if ((error as Error).message.includes("address")) {
                  registerForm.setError("address", {
                    type: "manual",
                    message: "This address is already registered in our system",
                  });
                }
              }
            })}
            className="space-y-4"
          >
            <FormField
              control={registerForm.control}
              name="username"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Username</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={registerForm.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Password</FormLabel>
                  <FormControl>
                    <Input type="password" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={registerForm.control}
              name="displayName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Display Name</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={registerForm.control}
              name="address"
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
              control={registerForm.control}
              name="zipCode"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>ZIP Code</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="00000" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={registerForm.control}
              name="acceptTerms"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>Accept Terms of Service</FormLabel>
                    <FormDescription>
                      I agree to the <Dialog>
                        <DialogTrigger className="text-primary underline">Terms of Service</DialogTrigger>
                        <DialogContent className="max-w-2xl max-h-[80vh]">
                          <DialogHeader>
                            <DialogTitle>Terms of Service</DialogTitle>
                          </DialogHeader>
                          <div className="text-sm overflow-y-auto pr-6" style={{ maxHeight: "60vh" }}>
                            <p className="mb-4">Effective Date: 2/16/25</p>
                            <p className="mb-4">Corcles ("the Platform") is a community-driven marketplace that enables users to buy, sell, give away, and exchange items within their local circles. By accessing or using Corcles, you agree to these Terms of Service ("Terms").</p>
                            <h2 className="text-lg font-semibold mb-2">1. Acceptance of Terms</h2>
                            <p className="mb-4">By using Corcles, you confirm that you are at least 18 years old (or the age of majority in your jurisdiction) and that you agree to abide by these Terms. If you do not agree, please do not use the Platform.</p>
                            <h2 className="text-lg font-semibold mb-2">2. Platform Role & Liability Disclaimer</h2>
                            <p className="mb-4">Corcles is a facilitator of peer-to-peer exchanges and does not own, inspect, verify, or guarantee any item, user, or transaction. By using the Platform, you agree that:</p>
                            <ul className="list-disc pl-6 mb-4">
                              <li className="mb-2">All transactions are solely between users. Corcles is not responsible for any damage, fraud, misrepresentation, safety issues, or disputes that arise.</li>
                              <li className="mb-2">You assume all risks associated with meeting, exchanging items, and interacting with other users. Corcles does not conduct background checks or verify identities.</li>
                              <li className="mb-2">Corcles does not provide payment processing services but may offer third-party payment integrations in the future.</li>
                              <li>You release Corcles and its affiliates from any liability related to items, communications, or transactions on the Platform.</li>
                            </ul>
                            <h2 className="text-lg font-semibold mb-2">3. Allowed & Prohibited Transactions</h2>
                            <p className="mb-2">Allowed Transactions:</p>
                            <ul className="list-disc pl-6 mb-4">
                              <li className="mb-2">Users may list items for sale with a price and complete transactions using cash, digital payments, or other methods agreed upon between parties.</li>
                              <li>Users may offer or request items for free as part of a giveaway or swap.</li>
                            </ul>
                            <p className="mb-2">Prohibited Transactions:</p>
                            <ul className="list-disc pl-6 mb-4">
                              <li className="mb-2">Requesting money for free (e.g., "Send me $10")</li>
                              <li className="mb-2">Offering money for free (e.g., "I'm giving away $100")</li>
                              <li className="mb-2">Monetary exchanges unrelated to physical goods (e.g., loans, gift cards, crypto, investments)</li>
                              <li>Illegal or restricted items (see below)</li>
                            </ul>
                            <h2 className="text-lg font-semibold mb-2">4. Prohibited Items & Activities</h2>
                            <p className="mb-2">You may not list, request, or exchange:</p>
                            <ul className="list-disc pl-6 mb-4">
                              <li className="mb-2">Illegal items (drugs, weapons, counterfeit goods, stolen property)</li>
                              <li className="mb-2">Services or non-physical goods (except as explicitly allowed by Corcles)</li>
                              <li>Hazardous materials (chemicals, recalled items, unsafe electronics)</li>
                            </ul>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </FormDescription>
                  </div>
                </FormItem>
              )}
            />
            <Button
              type="submit"
              className="w-full"
              disabled={registerMutation.isPending}
            >
              Register
            </Button>
          </form>
        </Form>
      </TabsContent>
    </Tabs>
  );
}