
import { Item, ItemRequest, PickupWindow } from "@shared/schema";
import PickupScheduler from "./pickup-scheduler";
import PickupTimeSelector from "./pickup-time-selector";
import PickupConfirmation from "./pickup-confirmation";
import { format } from "date-fns";
import { Badge } from "./ui/badge";
import MessageDialog from "./message-dialog";
import { useUser } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";

interface PickupCoordinatorProps {
  item: Item;
  requests?: ItemRequest[];
  className?: string;
}

export default function PickupCoordinator({ item, requests, className }: PickupCoordinatorProps) {
  const { user } = useUser();
  const isOwner = user?.id === item.userId;
  const isRecipient = user?.id === item.recipientId;
  const userRequest = requests?.find(r => r.requesterId === user?.id);

  // Helper functions to determine state
  const hasAcceptedOrCompletedRequest = requests?.some(r => 
    r.status === "accepted" || r.status === "completed"
  );
  const hasAwaitingConfirmationRequest = requests?.some(r => 
    r.status === "awaiting_pickup_confirmation"
  );
  const hasPendingRequests = requests?.some(r => r.status === "pending");

  if (!requests || !user) return null;

  return (
    <div className={cn("space-y-4", className)}>
      {/* Scheduled Pickup Display */}
      {hasAcceptedOrCompletedRequest && (
        <div className="p-4 bg-primary/10 rounded-lg border border-primary">
          <h3 className="font-medium mb-2">Pickup Scheduled</h3>
          <p className="text-sm text-muted-foreground">
            {format(new Date(item.pickupStart!), "EEEE, MMMM d")} at{" "}
            {format(new Date(item.pickupStart!), "h:mm a")} -{" "}
            {format(new Date(item.pickupEnd!), "h:mm a")}
          </p>
          <Badge variant="outline" className="mt-2">
            {requests.some(r => r.status === "completed") ? "Pickup Complete" : "Pickup Scheduled"}
          </Badge>
          {(isOwner || isRecipient) && userRequest && (
            <div className="mt-4">
              <MessageDialog
                requestId={userRequest.id}
                currentUserId={user.id}
                otherPartyId={isOwner ? item.recipientId! : item.userId}
              />
            </div>
          )}
        </div>
      )}

      {/* Owner Scheduling Interface */}
      {isOwner && hasPendingRequests && !item.proposedPickupWindows?.length && (
        <PickupScheduler
          itemId={item.id}
          onScheduled={() => {}}
        />
      )}

      {/* Recipient Time Selection Interface */}
      {!isOwner && hasAwaitingConfirmationRequest && item.proposedPickupWindows && (
        <div className="space-y-2">
          <h3 className="font-medium">Available Pickup Times</h3>
          <p className="text-sm text-muted-foreground">
            Please select a time that works for you
          </p>
          <PickupTimeSelector
            itemId={item.id}
            windows={item.proposedPickupWindows as PickupWindow[]}
            onSelected={() => {}}
          />
        </div>
      )}

      {/* Pickup Confirmation Interface */}
      {!isOwner && userRequest && (
        <PickupConfirmation
          item={item}
          request={userRequest}
        />
      )}
    </div>
  );
}
