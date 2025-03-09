import React, { useState } from "react";
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

  // Validate wishlist on mount
  React.useEffect(() => {
    if (open && (!wishlist || !wishlist.userId)) {
      console.error("Invalid wishlist or missing userId:", wishlist);
      toast({
        title: "Error",
        description: "Invalid wishlist data",
        variant: "destructive",
      });
    }
  }, [open, wishlist, toast]);

  const { data: userCommunities = [] } = useQuery<any[]>({
    queryKey: ["/api/user/communities"],
    enabled: !!user,
  });

  // Mutation to set a recipient for an item
  const setRecipient = useMutation({
    mutationFn: async ({ itemId, recipientId, wishlistId }: { itemId: number; recipientId: number; wishlistId: number }) => {
      const res = await apiRequest("POST", `/api/items/${itemId}/set-recipient`, {
        recipientId,
        wishlistId,
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
    try {
      if (!newItemId || typeof newItemId !== 'number') {
        throw new Error(`Invalid item ID: ${newItemId}`);
      }

      if (!wishlist) {
        throw new Error("Wishlist data is missing");
      }

      if (!wishlist.userId || typeof wishlist.userId !== 'number') {
        throw new Error(`Invalid wishlist user ID: ${wishlist?.userId}`);
      }

      console.log("Setting recipient:", { itemId: newItemId, recipientId: wishlist.userId });
      setRecipient.mutate({
        itemId: newItemId,
        recipientId: wishlist.userId,
        wishlistId: wishlist.id
      });
    } catch (error) {
      console.error("Error setting recipient:", error);
      toast({
        title: "Error fulfilling wishlist",
        description: error.message || "Could not set recipient for the created item",
        variant: "destructive",
      });
      onClose(); // Close dialog even if we can't set recipient
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
            try {
              console.log("Item creation response:", newItem);

              if (!newItem) {
                throw new Error("No item data returned");
              }

              if (typeof newItem !== 'object') {
                throw new Error(`Invalid item data type: ${typeof newItem}`);
              }

              if (!newItem.id || typeof newItem.id !== 'number') {
                throw new Error(`Invalid item ID: ${JSON.stringify(newItem)}`);
              }

              console.log("Item created successfully with ID:", newItem.id);
              handleItemCreated(newItem.id);
            } catch (error) {
              console.error("Error processing created item:", error);
              toast({
                title: "Error creating item",
                description: error.message || "Could not process the created item properly",
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