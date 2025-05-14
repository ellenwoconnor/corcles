import { z } from "zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { ItemBid } from "@shared/schema";

const bidSchema = z.object({
  amount: z.number().min(1, "Bid amount must be greater than 0"),
  message: z.string().optional(),
});

interface BidFormProps {
  itemId: number;
  hasBid: boolean;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function BidForm({
  itemId,
  hasBid,
  isOpen,
  onOpenChange,
}: BidFormProps) {
  const { toast } = useToast();
  const form = useForm<z.infer<typeof bidSchema>>({
    resolver: zodResolver(bidSchema),
    defaultValues: {
      amount: 0,
      message: "",
    },
  });

  // Get user's bids for this item
  const { data: userBids = [], refetch: refetchBids } = useQuery<ItemBid[]>({
    queryKey: [`/api/items/${itemId}/my-bids`],
    enabled: isOpen,
  });

  // We don't need to check hasBid anymore since we allow multiple bids
  const bidMutation = useMutation({
    mutationFn: async (data: z.infer<typeof bidSchema>) => {
      const response = await apiRequest(
        "POST",
        `/api/items/${itemId}/bid`,
        data,
      );
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to place bid");
      }
      return response.json();
    },
    onSuccess: async () => {
      // Immediately refetch to update the UI
      await Promise.all([
        refetchBids(),
        queryClient.invalidateQueries({
          queryKey: [`/api/items/${itemId}/my-bids`, "/api/user/bids"],
        })
      ]);
      
      toast({
        title: "Bid placed!",
        description: "The owner will be notified of your bid.",
      });
      
      form.reset();
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to place bid",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button className="flex-1">
          {userBids.length > 0 ? "Place Another Bid" : "Place Bid"}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Place a Bid</DialogTitle>
          <DialogDescription>
            {userBids.length > 0 
              ? "You already have bids on this item. You can place additional bids if you'd like to change your offer."
              : "Make an offer for this item."}
          </DialogDescription>
        </DialogHeader>
        
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit((data) => {
              bidMutation.mutate(data);
            })}
            className="space-y-4"
          >
            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Bid Amount ($)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      placeholder="Enter bid amount"
                      {...field}
                      value={field.value || ""}
                      onChange={(e) =>
                        field.onChange(
                          e.target.value ? Number(e.target.value) : "",
                        )
                      }
                    />
                  </FormControl>
                  <FormDescription>
                    Enter your bid amount in dollars.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
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
                    Include any additional information about your bid.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <DialogFooter>
              <Button
                type="submit"
                className="w-full"
                disabled={bidMutation.isPending}
              >
                {bidMutation.isPending ? "Submitting..." : "Place Bid"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
