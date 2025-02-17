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

const requestSchema = z.object({
  message: z.string().optional(),
});

interface RequestFormProps {
  itemId: number;
  hasRequested: boolean;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function RequestForm({ itemId, hasRequested, isOpen, onOpenChange }: RequestFormProps) {
  const { toast } = useToast();
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
        throw new Error(error.message || "Failed to request item");
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Request sent!",
        description: "The owner will be notified of your request.",
      });
      form.reset();
      onOpenChange(false);
      queryClient.invalidateQueries({
        queryKey: [`/api/items/${itemId}/my-requests`],
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to send request",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button className="flex-1" disabled={hasRequested}>
          {hasRequested ? "Request Pending" : "Request Item"}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Request Item</DialogTitle>
          <DialogDescription>
            Let the owner know why you're interested in this item.
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
                  <FormLabel>Message (Optional)</FormLabel>
                  <FormControl>
                    <Textarea {...field} />
                  </FormControl>
                  <FormDescription>
                    Share why you're interested in this item.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button
              type="submit"
              className="w-full"
              disabled={requestMutation.isPending}
            >
              Send Request
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}