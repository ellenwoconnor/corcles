import { useState } from "react";
import { useAuth } from "@/features/auth/hooks/use-auth";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { ListingForm } from "./listing/listing-form";

interface FulfillWishlistDialogProps {
  open: boolean;
  onClose: () => void;
  wishlist: any;
}

export default function FulfillWishlistDialog({
  open,
  onClose,
  wishlist,
}: FulfillWishlistDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: userCommunities = [] } = useQuery<any[]>({
    queryKey: ["/api/user/communities"],
    enabled: !!user,
  });

  // Mutation to set a recipient for an item
  const setRecipient = useMutation({
    mutationFn: async ({ itemId, recipientId }: { itemId: number; recipientId: number }) => {
      const res = await apiRequest("POST", `/api/items/${itemId}/set-recipient`, {
        recipientId,
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to fulfill wishlist");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/items"] });
      toast({
        title: "Wishlist fulfilled",
        description: "You've successfully fulfilled this wishlist item.",
      });
      onClose();
    },
    onError: (error: Error) => {
      toast({
        title: "Error fulfilling wishlist",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // This handles when a new item is created
  const handleItemCreated = (newItemId: number) => {
    if (wishlist && wishlist.userId) {
      setRecipient.mutate({
        itemId: newItemId,
        recipientId: wishlist.userId,
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Item for Wishlist</DialogTitle>
          <DialogDescription>
            Create an item to fulfill "{wishlist?.title}"
          </DialogDescription>
        </DialogHeader>
        <ListingForm
          mode="create"
          communities={userCommunities}
          onSuccess={(newItem) => {
            // Get the newly created item ID and set the recipient
            if (newItem && newItem.id) {
              handleItemCreated(newItem.id);
            } else {
              console.error("Item creation returned invalid data");
              toast({
                title: "Error creating item",
                description: "Could not create the item properly",
                variant: "destructive",
              });
              onClose();
            }
          }}
          buttonText="Create Item"
        />
      </DialogContent>
    </Dialog>
  );
}