import { Item, ItemRequest } from "@shared/schema";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow, format } from "date-fns";
import { Clock, MapPin } from "lucide-react";
import PickupTimeSelector from "@/components/pickup-time-selector";
import { MessageDialog } from "@/components/message-dialog";
import { Button } from "@/components/ui/button";
import { apiRequest } from "@/lib/queryClient";
import { useState } from "react";
import { CancelButton } from "@/components/cancel-button";
import { useQuery } from "@tanstack/react-query";
import BaseListingView from "./base-listing-view";

interface RecipientListingViewProps {
  item: Item & { userHasFavorited?: boolean };
  request?: ItemRequest & { userId?: number };
  currentUserId: number;
  onScheduled?: () => void;
}

export default function RecipientListingView({
  item,
  request,
  currentUserId,
  onScheduled,
}: RecipientListingViewProps) {
  const [messageDialogOpen, setMessageDialogOpen] = useState(false);
  const [schedulingComplete, setSchedulingComplete] = useState(false);

  // Only show pickup scheduler if we have a valid request in the right status
  const showPickupScheduler =
    request?.status === "awaiting_pickup_confirmation";
  const showCancelAndMessage =
    request && ["scheduling", "scheduled"].includes(item?.status || "");

  if (!request || !item) {
    return (
      <div className="text-center py-8">
        <h2 className="text-xl font-semibold mb-2">Error Loading Details</h2>
        <p className="text-muted-foreground">
          Unable to load item details. Please try again later.
        </p>
      </div>
    );
  }

  // Ensure we have valid IDs for messaging
  const itemOwnerId = item.userId;

  const pickupScheduled = item.pickupStart && item.pickupEnd;

  // Check if this item is a wishlist fulfillment
  const isWishlistFulfillment = item.wishlistId;

  // Get wishlist information if this item is fulfilling a wishlist
  const { data: wishlist } = useQuery({
    queryKey: [`/api/wishlists/${item.wishlistId}`],
    enabled: !!item.wishlistId,
  });

  return (
    <BaseListingView item={item} isOwner={false}>
      {/* Interactions Section */}
      <div className="border-t border-border pt-4">
          {/* Only show pickup scheduler if pickup time is not already confirmed */}
          {showPickupScheduler && !item.pickupStart && !item.pickupEnd && (
            <div className="space-y-4">
              <PickupTimeSelector
                itemId={item.id}
                itemOwnerId={itemOwnerId}
                currentUserId={currentUserId}
                requestId={request.id}
                windows={item.proposedPickupWindows}
                onSelected={() => {
                  setSchedulingComplete(true);
                  onScheduled?.();
                }}
              />
            </div>
          )}

          {/* Show cancel and message buttons for scheduling/scheduled status */}
          {showCancelAndMessage && (
            <div className="flex items-center gap-4">
              <CancelButton
                itemId={item.id}
                requestId={request.id}
                variant="outline"
              />
              <MessageDialog
                requestId={request.id}
                currentUserId={currentUserId}
                recipientId={itemOwnerId}
                isOpen={messageDialogOpen}
                onOpenChange={setMessageDialogOpen}
                trigger={<Button variant="outline">Message</Button>}
              />
            </div>
          )}
        </div>
    </BaseListingView>
  );
}