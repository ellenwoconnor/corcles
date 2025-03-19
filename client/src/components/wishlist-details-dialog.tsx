import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { formatDistanceToNow } from "date-fns";
import { useQuery } from "@tanstack/react-query";
import { Loader2, ExternalLink, Users } from "lucide-react";
import type { Wishlist } from "@shared/schema";
import { useLocation } from "wouter";

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
  const [, setLocation] = useLocation();

  // Query for community details
  const { data: communityData } = useQuery({
    queryKey: ["community", wishlist?.communityId],
    enabled: !!wishlist?.communityId,
    queryFn: async () => {
      const response = await fetch(`/api/communities/${wishlist?.communityId}`);
      if (!response.ok) return null;
      return response.json();
    },
  });

  // Query for user details
  const { data: userData } = useQuery({
    queryKey: ["user", wishlist?.userId],
    enabled: !!wishlist?.userId,
    queryFn: async () => {
      const response = await fetch(`/api/users/${wishlist?.userId}`);
      if (!response.ok) return null;
      return response.json();
    },
  });

  // Query for items related to this wishlist
  const { data: allItems = [], isLoading } = useQuery({
    queryKey: ["items", wishlist?.id],
    enabled: !!wishlist,
    queryFn: async () => {
      const response = await fetch(
        `/api/items?communities=${wishlist?.communityId}&includeWithRecipients=true`,
      );
      if (!response.ok) return [];
      return response.json();
    },
  });

  // Filter offers based on wishlist and user role
  const relevantOffers = allItems.filter((item) => {
    if (!wishlist || !currentUserId) return false;

    // Show only if:
    // 1. User is the wishlist owner and this is an offer for their wishlist
    // 2. User is the one who made the offer
    return (
      item.wishlistId === wishlist.id &&
      (currentUserId === wishlist.userId || currentUserId === item.userId)
    );
  });

  if (!wishlist) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">
            {wishlist.title}
          </DialogTitle>
          <div className="flex flex-col gap-1 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              <span>
                Posted by {userData?.displayName || "Anonymous"} in{" "}
                {communityData?.name || "Unknown Community"}
              </span>
              <span>{communityData?.mascot || "🏠"}</span>
            </div>
            <span>
              {formatDistanceToNow(new Date(wishlist.createdAt), {
                addSuffix: true,
              })}
            </span>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* Description */}
          <div className="bg-muted/50 rounded-lg p-4">
            <p className="text-sm leading-relaxed">
              {wishlist.description || "No description provided"}
            </p>
          </div>

          {/* Details */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            {wishlist.budget && (
              <div>
                <span className="text-muted-foreground">Budget:</span>
                <span className="ml-2">${wishlist.budget}</span>
              </div>
            )}
            {wishlist.urgency && (
              <div>
                <span className="text-muted-foreground">Priority:</span>
                <span className="ml-2 capitalize">{wishlist.urgency}</span>
              </div>
            )}
          </div>

          {/* Offers Section */}
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : (
            <>
              {relevantOffers.length > 0 ? (
                <div className="space-y-4">
                  <h3 className="font-medium text-lg">Offers</h3>
                  <div className="space-y-3">
                  {relevantOffers.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center gap-4 p-3 rounded-lg border hover:bg-accent cursor-pointer transition-colors"
                      onClick={() => {
                        onOpenChange?.(false);
                        setLocation(`/item/${item.id}`);
                      }}
                    >
                      {item.imageUrl && (
                        <img
                          src={item.imageUrl}
                          alt={item.title}
                          className="w-16 h-16 rounded-md object-cover"
                        />
                      )}
                      <div className="flex-1">
                        <div className="font-medium">{item.title}</div>
                        <div className="text-sm text-muted-foreground">
                          {currentUserId === wishlist.userId
                            ? `Offered by ${item.userDisplayName}`
                            : "Your offer"}
                        </div>
                      </div>
                      <ExternalLink className="h-4 w-4 text-muted-foreground" />
                    </div>
                  ))}
                </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground py-4">
                  No offers yet
                </p>
              )}
            </>
          )}

          {/* Action Buttons */}
          {showFulfillButton &&
            !userHasOfferedToFulfill?.(currentUserId || 0) && (
              <div className="flex justify-end pt-4">
                <Button onClick={onFulfill} className="w-full sm:w-auto">
                  Fulfill This Wishlist
                </Button>
              </div>
            )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
