import { Item } from "@shared/schema";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";
import { useLocation } from "wouter";
import { useAuth } from "@/features/auth/hooks/use-auth";

import RequestForm from "@/components/request-form";
import BidForm from "@/components/bid-form";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import BaseListingView from "./base-listing-view";

interface PublicListingViewProps {
  item: Item & { userHasFavorited?: boolean };
  currentUserId: number;
  hasRequested?: boolean;
  hasBid?: boolean;
  isAuthenticated: boolean; // Added authentication status
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
  const isCommunityMember = user?.communityIds?.includes(item.communityId);
  
  return (
    <BaseListingView item={item} isOwner={isOwner}>
      {/* Action Button */}
      {!isOwner && (
        <div className="flex gap-4">
          {!isAuthenticated ? (
            <Button
              className="w-full"
              onClick={() => navigate("/auth")}
            >
              Sign in to Request/Bid
            </Button>
          ) : !isCommunityMember ? (
            <Button className="w-full" disabled>
              Join community {item.communityName || 'to request'}
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
              hasBid={hasBid}
              isOpen={requestDialogOpen}
              onOpenChange={setRequestDialogOpen}
            />
          )}
        </div>
      )}
      {isWishlistFulfillment && (
        <div className="border rounded-md p-4 bg-primary bg-opacity-30 mb-4">
          <h2 className="text-lg font-medium mb-2 flex items-center gap-2">
            {/* <UserCheck className="h-5 w-5 text-green-600" /> */}
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
