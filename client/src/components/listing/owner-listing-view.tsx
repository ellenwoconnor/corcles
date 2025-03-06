import { Item, ItemRequest } from "@shared/schema";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow, format } from "date-fns";
import { Clock, Pencil, MapPin } from "lucide-react";
import { EditListingDialog } from "@/components/edit-listing-dialog";
import RequestsList from "@/components/requests-list";
import BidsList from "@/components/bids-list";
import PickupScheduler from "@/components/pickup-scheduler";
import { MessageDialog } from "@/components/message-dialog";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { CancelButton } from "@/components/cancel-button";
import { ExtendedItem } from "@/pages/listing-page";
import { useQueryClient } from "@tanstack/react-query";

interface OwnerListingViewProps {
  item: ExtendedItem;
  requests: (ItemRequest & { userId?: number })[];
  bids?: any[];
  currentUserId: number;
}

interface PickupWindow {
  pickupStart: string;
  pickupEnd: string;
}

const SECTION_CLASS = "border-t border-border pt-4 space-y-4";
const TIME_DISPLAY_CLASS = "p-3 bg-secondary rounded-lg border border-border";

export default function OwnerListingView({
  item,
  requests,
  bids,
  currentUserId
}: OwnerListingViewProps) {
  const [messageDialogOpen, setMessageDialogOpen] = useState(false);
  const queryClient = useQueryClient();

  // Debug log the requests
  console.log('OwnerListingView - Requests:', {
    itemId: item.id,
    requestsCount: requests.length,
    requests: requests.map(r => ({
      id: r.id,
      status: r.status,
      userId: r.userId
    }))
  });

  const activeRequest = requests.find(r =>
    ["pending", "accepted", "awaiting_pickup_confirmation", "scheduled"].includes(r.status)
  );

  console.log('OwnerListingView - Active Request:', {
    requesterId: activeRequest?.userId,
    itemOwner: item.userId,
    currentUser: currentUserId,
    activeRequestStatus: activeRequest?.status
  });

  const showPickupScheduler = item.isGift && ['requested', 'scheduling', 'scheduled'].includes(item.status || '');
  const showMessageAndCancel = ['scheduling', 'scheduled'].includes(item.status || '') && activeRequest;

  return (
    <div className="grid md:grid-cols-2 gap-8">
      {/* Item Image */}
      <div>
        <img
          src={item.imageUrl}
          alt={item.title}
          className="w-full rounded-lg object-cover aspect-square"
        />
      </div>

      {/* Item Details */}
      <div className="space-y-6">
        {/* Header Section */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight mb-2">
            {item.title}
          </h1>
          <div className="flex items-center gap-4">
            {item.isGift ? (
              <div className="inline-block bg-primary text-primary-foreground px-3 py-1 rounded-full text-sm font-medium">
                Free
              </div>
            ) : (
              <p className="text-2xl font-bold text-primary">
                ${item.price}
              </p>
            )}
            <EditListingDialog
              item={item}
              trigger={
                <Button variant="outline" size="sm" className="gap-2">
                  <Pencil className="h-4 w-4" />
                  Edit Listing
                </Button>
              }
            />
          </div>
        </div>

        {/* Description */}
        <div className={SECTION_CLASS}>
          <p className="text-muted-foreground whitespace-pre-wrap">
            {item.description}
          </p>
        </div>

        {/* Requests/Bids Section */}
        <div className={SECTION_CLASS}>
          <div className="flex items-center justify-between">
            <h3 className="text-base font-medium">
              {item.isGift ? "Requests" : "Bids"}
            </h3>
            {item.isGift && requests.length > 0 && (
              <Badge variant="secondary">
                {requests.length} {requests.length === 1 ? "request" : "requests"}
              </Badge>
            )}
          </div>

          <div>
            {item.isGift ? (
              <RequestsList
                requests={requests}
                currentUserId={currentUserId}
              />
            ) : (
              <BidsList bids={bids || []} />
            )}
          </div>
        </div>

        {/* Show confirmed pickup time if it exists */}
        {item.pickupStart && item.pickupEnd && (
          <div className={SECTION_CLASS}>
            <h3 className="font-medium mb-2">Confirmed Pickup Time</h3>
            <div className={TIME_DISPLAY_CLASS}>
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

        {/* Pickup Scheduling Section */}
        {showPickupScheduler && activeRequest && (
          <div className={SECTION_CLASS}>
            <h3 className="text-base font-medium">Pickup Scheduling</h3>

            {item.proposedPickupWindows && item.proposedPickupWindows.length > 0 && (
              <div className="mb-4">
                <h4 className="text-sm font-medium mb-2">Proposed Pickup Times</h4>
                <div className="space-y-2">
                  {(item.proposedPickupWindows as PickupWindow[]).map((window, index) => (
                    <div key={index} className={TIME_DISPLAY_CLASS}>
                      <div className="flex items-center gap-2">
                        <Clock className="w-3.5 h-3.5" />
                        <span className="text-sm">
                          {format(new Date(window.pickupStart), "EEE, MMM d")} at{" "}
                          {format(new Date(window.pickupStart), "h:mm a")} -{" "}
                          {format(new Date(window.pickupEnd), "h:mm a")}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <PickupScheduler
              itemId={item.id}
              itemStatus={item.status || ''}
              onScheduled={() => {
                queryClient.invalidateQueries({ queryKey: [`/api/items/${item.id}`] });
                queryClient.invalidateQueries({ queryKey: [`/api/items/${item.id}/requests`] });
              }}
            />
          </div>
        )}

        {/* Message and Cancel Section */}
        {item.isGift && showMessageAndCancel && activeRequest?.userId && (
          <div className={SECTION_CLASS}>
            <div className="flex items-center gap-4">
              <CancelButton
                itemId={item.id}
                requestId={activeRequest.id}
                variant="outline"
              />
              <MessageDialog
                requestId={activeRequest.id}
                currentUserId={currentUserId}
                otherPartyId={activeRequest.userId}
                recipientId={activeRequest.userId}
                isOpen={messageDialogOpen}
                onOpenChange={setMessageDialogOpen}
                trigger={
                  <Button variant="outline">
                    Message
                  </Button>
                }
              />
            </div>
          </div>
        )}

        {/* Pickup Location */}
        {item.pickupLocation && (
          <div className="mb-4 flex items-center text-sm text-muted-foreground">
            <MapPin className="w-4 h-4 mr-1" />
            <span>Pickup: {item.pickupLocation}</span>
          </div>
        )}
      </div>
    </div>
  );
}