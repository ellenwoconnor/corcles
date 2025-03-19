import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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

  const relevantOffers = allItems.filter(item => {
    if (!wishlist || !currentUserId) return false;

    if (currentUserId === wishlist.userId) {
      return item.wishlistId === wishlist.id;
    }
    return item.wishlistId === wishlist.id && item.userId === currentUserId;
  });

  if (!wishlist) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-xl">{wishlist.title}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <div className="text-sm text-muted-foreground">
              Posted by {wishlist.userName} in {wishlist.communityName} • {formatTimeAgo(wishlist.createdAt)}
            </div>
          </div>
          <div>
            <p className="text-base">
              {wishlist.description || "No description provided"}
            </p>
          </div>
          {isLoading ? (
            <div className="flex justify-center">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : (
            <>
              <div className="space-y-2">
                <h3 className="font-medium">Offers</h3>
                {relevantOffers.length > 0 ? (
                  <ul className="space-y-2">
                    {relevantOffers.map(item => (
                      <li key={item.id} className="text-sm">
                        {item.title}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-muted-foreground">No offers yet</p>
                )}
              </div>
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