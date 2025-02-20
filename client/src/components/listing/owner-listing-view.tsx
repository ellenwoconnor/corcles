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
import { useState } from "react";
import { CancelButton } from "@/components/cancel-button";

interface PickupWindow {
  start: string;
  end: string;
}

interface OwnerListingViewProps {
  item: Item & { 
    userHasFavorited?: boolean;
    proposedPickupWindows?: PickupWindow[];
  };
  requests: (ItemRequest & { userId?: number })[];
  bids?: any[];
  currentUserId: number;
}

export default function OwnerListingView({ 
  item, 
  requests, 
  bids, 
  currentUserId 
}: OwnerListingViewProps) {
  const [messageDialogOpen, setMessageDialogOpen] = useState(false);
  const activeRequest = requests.find(r => 
    ["pending", "accepted", "awaiting_pickup_confirmation", "scheduled"].includes(r.status)
  );

  const showPickupScheduler = ['requested', 'scheduling'].includes(item.status || '');
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
        <div className="border-t border-border pt-4">
          <p className="text-muted-foreground whitespace-pre-wrap">
            {item.description}
          </p>
        </div>

        {/* Show confirmed pickup time if it exists */}
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

        {/* Pickup Scheduling Section */}
        {item.isGift && showPickupScheduler && activeRequest && (
          <div className="border-t border-border pt-4 space-y-4">
            <h3 className="text-base font-medium">Pickup Scheduling</h3>
            
            {/* Show proposed pickup windows if they exist */}
            {item.proposedPickupWindows && item.proposedPickupWindows.length > 0 && (
              <div className="mb-4">
                <h4 className="text-sm font-medium mb-2">Proposed Pickup Times</h4>
                <div className="space-y-2">
                  {item.proposedPickupWindows.map((window: PickupWindow, index: number) => (
                    <div key={index} className="p-2 bg-secondary/50 rounded-md border border-border text-sm">
                      <div className="flex items-center gap-2">
                        <Clock className="w-3.5 h-3.5" />
                        <span>
                          {format(new Date(window.start), "EEE, MMM d")} at{" "}
                          {format(new Date(window.start), "h:mm a")} -{" "}
                          {format(new Date(window.end), "h:mm a")}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            <PickupSchedulingContainer
              item={item}
              requestId={activeRequest.id}
              requesterId={activeRequest.userId ?? 0}
            />
          </div>
        )}

        {/* Message and Cancel Section */}
        {item.isGift && showMessageAndCancel && (
          <div className="border-t border-border pt-4">
            <div className="flex items-center gap-4">
              <CancelButton 
                itemId={item.id}
                requestId={activeRequest.id}
                variant="outline"
              />
              <MessageDialog
                requestId={activeRequest.id}
                currentUserId={currentUserId}
                otherPartyId={activeRequest.userId ?? 0}
                recipientId={activeRequest.userId ?? 0}
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
      </div>
    </div>
  );
}