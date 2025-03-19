import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatTimeAgo } from "@/lib/utils";
import { useQuery } from '@tanstack/react-query';
import { Loader2 } from "lucide-react";
import type { Wishlist } from "@shared/schema";

interface WishlistDetailsDialogProps {
  wishlist: Wishlist | null;
  open: boolean;
  onOpenChange?: (open: boolean) => void;
  onClose?: () => void;
  showFulfillButton?: boolean;
  onFulfill?: () => void;
  userHasOfferedToFulfill?: (userId: number) => boolean;
  currentUserId?: number;
}

export default function WishlistDetailsDialog({
  wishlist,
  open,
  onOpenChange,
  showFulfillButton,
  onFulfill,
  userHasOfferedToFulfill,
  currentUserId,
}: WishlistDetailsDialogProps) {
  const { data: allItems = [], isLoading } = useQuery<any[]>({
    queryKey: ["items", wishlist?.id],
    enabled: !!wishlist,
    queryFn: async () => {
      const response = await fetch(`/api/items?communities=${wishlist?.communityId}&includeWithRecipients=true`);
      if (!response.ok) return [];
      return response.json();
    }
  });

  // Filter offers based on wishlist and user role
  const relevantOffers = allItems.filter(item => {
    if (!wishlist || !currentUserId) return false;

    // If current user is wishlist owner, show all offers
    if (currentUserId === wishlist.userId) {
      return item.wishlistId === wishlist.id;
    }

    // If current user is offering, show only their offers
    return item.wishlistId === wishlist.id && item.userId === currentUserId;
  });

  if (!wishlist) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{wishlist.title}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            {wishlist.description && (
              <p className="text-sm text-muted-foreground mt-2">{wishlist.description}</p>
            )}
            <div className="flex gap-2 mt-3">
              {wishlist.budget && (
                <Badge variant="secondary">Budget: ${wishlist.budget}</Badge>
              )}
              <Badge variant="secondary">Added {formatTimeAgo(new Date(wishlist.createdAt))}</Badge>
            </div>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-4">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : (
            <>
              {relevantOffers.length > 0 && (
                <div className="border-t pt-4">
                  <h4 className="font-medium mb-2">
                    {currentUserId === wishlist.userId ? 'Offers Received' : 'Your Offers'}
                  </h4>
                  <div className="space-y-2">
                    {relevantOffers.map((offer) => (
                      <div key={offer.id} className="flex items-center gap-3 p-3 rounded-lg border">
                        <img src={offer.imageUrl} alt={offer.title} className="w-16 h-16 rounded object-cover" />
                        <div className="flex-1">
                          <div className="font-medium">{offer.title}</div>
                          <div className="text-sm text-muted-foreground">
                            {currentUserId === wishlist.userId ? 
                              `Offered by ${offer.userDisplayName}` : 
                              'Your offer'}
                          </div>
                          {offer.pickupStart && (
                            <div className="text-xs text-muted-foreground mt-1">
                              Pickup scheduled for {new Date(offer.pickupStart).toLocaleDateString()}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {showFulfillButton && !userHasOfferedToFulfill?.(currentUserId || 0) && (
                <div className="flex justify-end pt-4">
                  <Button onClick={onFulfill}>Fulfill This Wishlist</Button>
                </div>
              )}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}