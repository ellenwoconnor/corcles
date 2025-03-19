import { Item, ItemRequest } from "@shared/schema";
import { format } from "date-fns";
import { Clock, Check, MapPin } from "lucide-react";
import PickupTimeSelector from "@/components/pickup-time-selector";
import { MessageDialog } from "@/components/message-dialog";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { CancelButton } from "@/components/cancel-button";
import { useQuery } from "@tanstack/react-query";
import BaseListingView from "./base-listing-view";
import { UserCheck } from "lucide-react";
import { useSearch } from "wouter";

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
  const [search] = useSearch();
  const params = new URLSearchParams(search);
  const showMessages = params.get('showMessages') === 'true';
  const requestIdFromUrl = params.get('requestId');
  const [messageDialogOpen, setMessageDialogOpen] = useState(showMessages && requestIdFromUrl === request?.id.toString());
  const [setSchedulingComplete] = useState(false);

  // Only show pickup scheduler if we have a valid request in the right status
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
              <UserCheck className="h-5 w-5 text-green-600" />
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
          <p className="flex gap-1">
            This item is pending pickup at <MapPin className="h-4 w-4" />
            {item.pickupLocation}.
          </p>
          {/* Select pickup windows or display selected pickup windows */}
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
          ) : (
            <div className="py-4">
              <p className="mb-3">Pickup confirmed for:</p>
              <div className="p-3 bg-secondary rounded-lg border border-border">
                <div className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-500" />
                  <span className="text-sm">
                    {format(new Date(item.pickupStart), "EEE, MMM d")} at{" "}
                    {format(new Date(item.pickupStart), "h:mm a")} -{" "}
                    {format(new Date(item.pickupEnd), "h:mm a")}
                  </span>
                </div>
              </div>
            </div>
          )}

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
    </div>
  );
}