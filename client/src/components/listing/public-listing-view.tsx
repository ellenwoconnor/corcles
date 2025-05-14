import { Item, ItemBid } from "@shared/schema";
import { useLocation } from "wouter";
import { useAuth } from "@/features/auth/hooks/use-auth";
import RequestForm from "@/components/request-form";
import BidForm from "@/components/bid-form";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import BaseListingView from "./base-listing-view";

interface PublicListingViewProps {
  item: Item & { userHasFavorited?: boolean };
  currentUserId: number;
  hasRequested?: boolean;
  hasBid?: boolean;
  isAuthenticated: boolean; // Added authentication status
}

export function getBidStatusVariant(status: string) {
  switch (status) {
    case "pending":
      return "secondary";
    case "accepted":
      return "default";
    default:
      return "destructive";
  }
}

export default function PublicListingView({
  item,
  currentUserId,
  hasRequested = false,
  hasBid = false,
  isAuthenticated = false,
}: PublicListingViewProps) {
  const { user } = useAuth();
  const [requestDialogOpen, setRequestDialogOpen] = useState(false);
  const [, navigate] = useLocation();

  // Don't show request/bid buttons if the user is the owner
  const isOwner = currentUserId === item.userId;
  const isWishlistFulfillment = item.wishlistId;
  
  // Check if user is a member of the item's community
  const userHasCommunityAccess = isAuthenticated && 
    user?.communityIds && 
    Array.isArray(user.communityIds) && 
    user.communityIds.includes(item.communityId);
  
  // Fetch user's bids for this item
  const { data: userBids = [] } = useQuery<ItemBid[]>({
    queryKey: [`/api/items/${item.id}/my-bids`],
    enabled: isAuthenticated && !isOwner && !item.isGift,
  });

  // Always allow user to bid, but show their existing bids
  const showBidForm = isAuthenticated && userHasCommunityAccess && !item.isGift;
  
  return (
    <BaseListingView item={item} isOwner={isOwner}>
      {!isOwner && (
        <>
          {/* Show existing bids if any */}
          {userBids.length > 0 && (
            <Card className="mb-4">
              <CardContent className="pt-6">
                <h3 className="text-lg font-medium mb-3">Your Bids</h3>
                <div className="space-y-3">
                  {userBids.map((bid) => (
                    <div key={bid.id} className="p-3 border rounded-md flex items-center justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-medium">${bid.amount}</p>
                          <span className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(bid.createdAt), {
                              addSuffix: true,
                            })}
                          </span>
                        </div>
                        {bid.message && (
                          <p className="text-sm text-muted-foreground">{bid.message}</p>
                        )}
                      </div>
                      <Badge variant={getBidStatusVariant(bid.status)}>
                        {bid.status.charAt(0).toUpperCase() + bid.status.slice(1)}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Action Button */}
          <div className="flex gap-4">
            {!isAuthenticated ? (
              <Button
                className="w-full"
                onClick={() => navigate("/auth")}
              >
                Sign in to Request/Bid
              </Button>
            ) : !userHasCommunityAccess ? (
              <Button className="w-full" disabled>
                Join {item.communityName || 'this community'} to request this item
              </Button>
            ) : item.isGift ? (
              <RequestForm
                itemId={item.id}
                itemOwnerId={item.userId}
                hasRequested={hasRequested}
                isOpen={requestDialogOpen}
                onOpenChange={setRequestDialogOpen}
              />
            ) : (
              <BidForm
                itemId={item.id}
                hasBid={false} // Always allow new bids
                isOpen={requestDialogOpen}
                onOpenChange={setRequestDialogOpen}
              />
            )}
          </div>
        </>
      )}
      
      {isWishlistFulfillment && (
        <div className="border rounded-md p-4 bg-primary bg-opacity-30 mb-4">
          <h2 className="text-lg font-medium mb-2 flex items-center gap-2">
            <span>Wishlist Offer</span>
          </h2>
          <p className="text-sm mb-3">
            This item was offered to you privately. Request to initiate pickup.
          </p>
        </div>
      )}
    </BaseListingView>
  );
}
