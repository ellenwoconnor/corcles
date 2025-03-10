import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { MessageDialog } from "./message-dialog";
import { useAuth } from "@/features/auth/hooks/use-auth";

const requestSchema = z.object({
  message: z.string().optional(),
});

interface RequestFormProps {
  itemId: number;
  itemOwnerId: number;
  hasRequested: boolean;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  currentRequest?: {
    id: number;
    status: string;
  };
}

export default function RequestForm({ 
  itemId, 
  itemOwnerId,
  hasRequested, 
  isOpen, 
  onOpenChange,
  currentRequest 
}: RequestFormProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const form = useForm<z.infer<typeof requestSchema>>({
    resolver: zodResolver(requestSchema),
    defaultValues: {
      message: "",
    },
  });

  const requestMutation = useMutation({
    mutationFn: async (data: z.infer<typeof requestSchema>) => {
      const response = await apiRequest("POST", `/api/items/${itemId}/request`, data);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to send request");
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Request sent!",
        description: "The owner will be notified of your request.",
      });
      form.reset();
      queryClient.invalidateQueries({ queryKey: [`/api/items/${itemId}/my-requests`] });
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to send request",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Only show messages if there's an existing request and a logged in user
  const showMessages = currentRequest && user;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button className="flex-1" disabled={hasRequested}>
          {hasRequested ? "Requested" : "Request Item"}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Request Item</DialogTitle>
          <DialogDescription>
            Send a message to the owner explaining why you'd like this item.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit((data) => {
              requestMutation.mutate(data);
            })}
            className="space-y-4"
          >
            <FormField
              control={form.control}
              name="message"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Message</FormLabel>
                  <FormControl>
                    <Textarea {...field} />
                  </FormControl>
                  <FormDescription>
                    Be clear about why you're interested and how you'll use the item.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="flex gap-2">
              <Button
                type="submit"
                className="flex-1"
                disabled={requestMutation.isPending}
              >
                Send Request
              </Button>
              {showMessages && (
                <MessageDialog
                  recipientId={itemOwnerId}
                  requestId={currentRequest.id}
                  currentUserId={user.id}
                />
              )}
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}