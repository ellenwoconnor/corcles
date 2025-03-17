import { Item, ItemRequest } from "@shared/schema";
import { format } from "date-fns";
import { Clock, MapPin } from "lucide-react";
import PickupTimeSelector from "@/components/pickup-time-selector";
import { MessageDialog } from "@/components/message-dialog";
import { Button } from "@/components/ui/button";
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
  const itemInTransaction =
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
  console.log("FO?", isWishlistFulfillment);

  // Get wishlist information if this item is fulfilling a wishlist
  const { data: wishlist } = useQuery({
    queryKey: [`/api/wishlists/${item.wishlistId}`],
    enabled: !!item.wishlistId,
  });

  return (
    <div>
      <BaseListingView item={item} isOwner={false}>
        {
          <div className="border rounded-md p-4 bg-green-50 border-green-200 mb-4">
            <h2 className="text-lg font-medium mb-2 flex items-center gap-2">
              {/* <UserCheck className="h-5 w-5 text-green-600" /> */}
              <span>Request Accepted</span>
            </h2>
            <p className="text-sm mb-3">
              You have been selected as the recipient of this item.
            </p>
          </div>
        }
      </BaseListingView>

      {/* Pickup scheduling Section */}
      {itemInTransaction && (
        <div className="border rounded-md mt-5 p-4 mb-4">
          <h2 className="text-lg font-medium mb-2 flex items-center gap-2">
            Schedule pickup
          </h2>
          <p>
            This item is pending pickup at <b>{item.pickupLocation}</b>.
          </p>
          {item.status === "scheduling" ? (
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
          ) : null}
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
              trigger={<Button variant="outline">Send Message</Button>}
            />
          </div>
        </div>
      )}

      {/* Show confirmed pickup time */}
      {item.pickupStart && item.pickupEnd && (
        <div className="border-t border-border pt-4">
          <h3 className="font-medium mb-2">Confirmed Pickup Time</h3>
          <div className="p-3 bg-secondary rounded-lg border border-border">
            <div className="flex items-center gap-2">
              <Clock className="w-3.5 h-3.5" />
              <span className="text-sm">
                {format(new Date(item.pickupStart), "EEE, MMM d")} at{" "}
                {format(new Date(item.pickupStart), "h:mm a")} -{" "}
                {format(new Date(item.pickupEnd), "h:mm a")}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}