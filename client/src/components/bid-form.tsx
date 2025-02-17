import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

const bidSchema = z.object({
  amount: z.number().min(1, "Bid amount must be greater than 0"),
  message: z.string().optional(),
});

type BidForm = z.infer<typeof bidSchema>;

interface BidFormProps {
  itemId: number;
  hasBid: boolean;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function BidForm({ itemId, hasBid, isOpen, onOpenChange }: BidFormProps) {
  const { toast } = useToast();
  const form = useForm<BidForm>({
    resolver: zodResolver(bidSchema),
    defaultValues: {
      amount: 0,
      message: "",
    },
  });

  const bidMutation = useMutation({
    mutationFn: async (values: BidForm) => {
      const response = await apiRequest(
        "POST", 
        `/api/items/${itemId}/bid`,
        values
      );
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to submit bid");
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Bid submitted",
        description: "Your bid has been sent to the item owner.",
      });
      onOpenChange(false);
      form.reset();
      queryClient.invalidateQueries({ queryKey: [`/api/items/${itemId}`] });
      queryClient.invalidateQueries({ queryKey: [`/api/items/${itemId}/my-bids`] });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to submit bid",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (values: BidForm) => {
    bidMutation.mutate(values);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button disabled={hasBid}>
          {hasBid ? "Bid Placed" : "Place Bid"}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Place a Bid</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Bid Amount</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min="1"
                      step="0.01"
                      placeholder="0.00"
                      {...field}
                      onChange={(e) => field.onChange(parseFloat(e.target.value))}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="message"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Message (Optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Add a message to the owner"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button 
              type="submit"
              disabled={bidMutation.isPending}
            >
              Submit Bid
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
