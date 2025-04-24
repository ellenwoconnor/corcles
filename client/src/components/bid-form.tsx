import { z } from "zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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

  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [pendingBid, setPendingBid] = useState<z.infer<
    typeof bidSchema
  > | null>(null);

  // Get user's previous bid
  const { data: previousBid } = useQuery({
    queryKey: [`/api/items/${itemId}/bid`],
    enabled: hasBid,
    queryFn: async () => {
      const response = await fetch(`/api/items/${itemId}/bid`);
      if (!response.ok) return null;
      return response.json();
    }
  });

  const bidMutation = useMutation({
    mutationFn: async (data: z.infer<typeof bidSchema>) => {
      if (hasBid && !showConfirmDialog) {
        setPendingBid(data);
        setShowConfirmDialog(true);
        return;
      }
      setPendingBid(null);
      setShowConfirmDialog(false);

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
    onSuccess: () => {
      toast({
        title: "Bid placed!",
        description: "The owner will be notified of your bid.",
      });
      form.reset();
      onOpenChange(false);
      queryClient.invalidateQueries({
        queryKey: [`/api/items/${itemId}/my-bids`, "/api/user/bids"],
      });
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
    <>
      <Dialog open={isOpen} onOpenChange={onOpenChange}>
        <DialogTrigger asChild>
          <Button className="flex-1" disabled={hasBid}>
            {hasBid ? "Bid Pending" : "Place Bid"}
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Place a Bid</DialogTitle>
            <DialogDescription>Make an offer for this item.</DialogDescription>
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
              <Button
                type="submit"
                className="w-full"
                disabled={bidMutation.isPending}
              >
                Place Bid
              </Button>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm New Bid</AlertDialogTitle>
            <AlertDialogDescription>
              You already have a pending bid of ${previousBid?.amount} on this
              item. Are you sure you want to place a new bid of $
              {pendingBid?.amount}?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setPendingBid(null)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (pendingBid) {
                  bidMutation.mutate(pendingBid);
                }
              }}
            >
              Confirm New Bid
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
