
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
  DialogFooter,
} from "./ui/dialog";
import { Button } from "./ui/button";
import CreateWishlistDialog from "./create-wishlist-dialog";
import { Loader2 } from "lucide-react";

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
  const [createItemDialogOpen, setCreateItemDialogOpen] = useState(false);

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

  // When the user confirms they want to fulfill the wishlist
  const handleFulfill = () => {
    // We'll open the CreateWishlistDialog to create a new item that will fulfill the wishlist
    setCreateItemDialogOpen(true);
  };

  // This is just a placeholder - in a real implementation, you'd need to get the selected item ID
  // after the user creates a new item, and then set the recipient
  const handleItemCreated = (newItemId: number) => {
    if (wishlist && wishlist.userId) {
      setRecipient.mutate({
        itemId: newItemId,
        recipientId: wishlist.userId,
      });
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Fulfill Wishlist</DialogTitle>
            <DialogDescription>
              Do you want to fulfill this wishlist item?
              {wishlist && (
                <div className="mt-2">
                  <strong>{wishlist.title}</strong>
                  <p className="text-sm text-muted-foreground">{wishlist.description}</p>
                </div>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handleFulfill} disabled={setRecipient.isPending}>
              {setRecipient.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Fulfilling...
                </>
              ) : (
                "Create Item"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* This is a placeholder - in real implementation, you'd create a more specialized dialog */}
      <CreateWishlistDialog 
        open={createItemDialogOpen}
        onOpenChange={setCreateItemDialogOpen}
      />
    </>
  );
}
