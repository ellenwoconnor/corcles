import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

const requestSchema = z.object({
  message: z.string().optional(),
});

type RequestForm = z.infer<typeof requestSchema>;

interface RequestFormProps {
  itemId: number;
  hasRequested: boolean;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function RequestForm({ itemId, hasRequested, isOpen, onOpenChange }: RequestFormProps) {
  const { toast } = useToast();
  const form = useForm<RequestForm>({
    resolver: zodResolver(requestSchema),
    defaultValues: {
      message: "",
    },
  });

  const requestMutation = useMutation({
    mutationFn: async (values: RequestForm) => {
      const response = await apiRequest(
        "POST", 
        `/api/items/${itemId}/request`,
        values
      );
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to submit request");
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Request submitted",
        description: "Your request has been sent to the item owner.",
      });
      onOpenChange(false);
      form.reset();
      queryClient.invalidateQueries({ queryKey: [`/api/items/${itemId}`] });
      queryClient.invalidateQueries({ queryKey: [`/api/items/${itemId}/my-requests`] });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to submit request",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (values: RequestForm) => {
    requestMutation.mutate(values);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button disabled={hasRequested}>
          {hasRequested ? "Already Requested" : "Request Item"}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Request Item</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="message"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <Textarea
                      placeholder="Add a message to the owner (optional)"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button 
              type="submit"
              disabled={requestMutation.isPending}
            >
              Submit Request
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
