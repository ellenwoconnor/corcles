import { Item, ItemRequest } from "@shared/schema";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow, format } from "date-fns";
import { Clock } from "lucide-react";
import PickupSchedulingContainer from "@/components/pickup-scheduling-container";
import { MessageDialog } from "@/components/message-dialog";

interface RecipientListingViewProps {
  item: Item & { userHasFavorited?: boolean };
  request: ItemRequest & { userId?: number };
  currentUserId: number;
}

export default function RecipientListingView({ 
  item, 
  request, 
  currentUserId 
}: RecipientListingViewProps) {
  const showPickupScheduler = request?.status === "awaiting_pickup_confirmation";
  const showMessageDialog = ['scheduling', 'scheduled', 'completed'].includes(item?.status || '') && !showPickupScheduler;

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
          </div>
        </div>

        {/* User Info */}
        <div>
          <p className="font-medium">
            Listed by {item.userDisplayName || "Anonymous"}
          </p>
          <p className="text-sm text-muted-foreground">
            {formatDistanceToNow(new Date(item.createdAt), {
              addSuffix: true,
            })}
          </p>
        </div>

        {/* Description */}
        <div className="border-t border-border pt-4">
          <p className="text-muted-foreground whitespace-pre-wrap">
            {item.description}
          </p>
        </div>

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

        {/* Interaction Section */}
        <div className="border-t border-border pt-4 space-y-4">
          {/* Pickup Scheduling */}
          {showPickupScheduler && (
            <PickupSchedulingContainer
              item={item}
              requestId={request.id}
              requesterId={currentUserId}
              onScheduled={() => {
                // Handle scheduling completion
              }}
            />
          )}

          {/* Messaging */}
          {showMessageDialog && (
            <div className="mt-4">
              <MessageDialog
                requestId={request.id}
                currentUserId={currentUserId}
                otherPartyId={item.userId}
                recipientId={currentUserId}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}