import { Item, ItemRequest } from "@shared/schema";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow, format } from "date-fns";
import { Clock } from "lucide-react";
import EditListingDialog from "@/components/edit-listing-dialog";
import RequestsList from "@/components/requests-list";
import BidsList from "@/components/bids-list";
import PickupSchedulingContainer from "@/components/pickup-scheduling-container";
import { MessageDialog } from "@/components/message-dialog";
import { Button } from "@/components/ui/button";
import { Pencil } from "lucide-react";

interface OwnerListingViewProps {
  item: Item & { userHasFavorited?: boolean };
  requests: ItemRequest[];
  bids?: any[];
  currentUserId: number;
}

export default function OwnerListingView({ 
  item, 
  requests, 
  bids, 
  currentUserId 
}: OwnerListingViewProps) {
  const showMessageDialog = ['scheduling', 'scheduled', 'completed'].includes(item?.status || '');
  const showPickupScheduler = ['requested', 'scheduling', 'scheduled'].includes(item?.status || '');

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

        {/* Requests/Bids Section */}
        <div className="border-t border-border pt-3 space-y-4">
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

          <div className="space-y-4">
            {item.isGift ? (
              <>
                <RequestsList
                  requests={requests}
                  currentUserId={currentUserId}
                />
                {showPickupScheduler && requests[0] && (
                  <PickupSchedulingContainer
                    item={item}
                    requestId={requests[0].id}
                    requesterId={requests[0].userId ?? 0}
                    onScheduled={() => {
                      // Handle scheduling completion
                    }}
                  />
                )}
                {showMessageDialog && requests[0] && (
                  <MessageDialog
                    requestId={requests[0].id}
                    currentUserId={currentUserId}
                    otherPartyId={requests[0].userId ?? 0}
                    recipientId={requests[0].userId ?? 0}
                  />
                )}
              </>
            ) : (
              <BidsList bids={bids || []} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
