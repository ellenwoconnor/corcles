import { useState } from "react";
import { Item, PickupWindow } from "@shared/schema";
import { useAuth } from "@/features/auth/hooks/use-auth";
import PickupTimeSelector from "./pickup-time-selector";
import PickupScheduler from "./pickup-scheduler";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Alert } from "@/components/ui/alert";
import { CancelButton } from "./cancel-button";

interface PickupSchedulingContainerProps {
  item: Item;
  requestId: number;
  requesterId: number;
  onScheduled?: () => void;
}

export default function PickupSchedulingContainer({
  item,
  requestId,
  requesterId,
  onScheduled,
}: PickupSchedulingContainerProps) {
  const { user } = useAuth();
  const [schedulingComplete, setSchedulingComplete] = useState(false);

  // Check if the current user is the owner or recipient
  const isOwner = user?.id === item.userId;
  const isRecipient = user?.id === requesterId;

  // Handler for when scheduling is completed by either party
  const handleSchedulingComplete = () => {
    setSchedulingComplete(true);
    onScheduled?.();
  };

  // Display selected pickup window if one exists
  const showSelectedTime = item.pickupStart && item.pickupEnd;

  // Show cancel button only if there's a selected time and user is owner or recipient
  const showCancelButton = showSelectedTime && (isOwner || isRecipient);

  // Show scheduler for owner based on item status
  const showScheduler = isOwner && ['requested', 'scheduling', 'scheduled'].includes(item.status);

  if (!user) return null;

  return (
    <div className="space-y-4">
      {showSelectedTime && (
        <Alert>
          <div className="space-y-2">
            <h3 className="font-medium">Selected Pickup Time</h3>
            <p className="text-sm text-muted-foreground">
              {format(new Date(item.pickupStart!), "EEEE, MMMM d")} at{" "}
              {format(new Date(item.pickupStart!), "h:mm a")} -{" "}
              {format(new Date(item.pickupEnd!), "h:mm a")}
            </p>
            <div className="flex items-center justify-between">
              <Badge variant="outline">Pickup Scheduled</Badge>
              {showCancelButton && (
                <CancelButton 
                  itemId={item.id}
                  onCanceled={handleSchedulingComplete}
                />
              )}
            </div>
          </div>
        </Alert>
      )}

      {isOwner ? (
        // Owner view - show scheduler based on item status
        showScheduler && (
          <PickupScheduler
            itemId={item.id}
            itemStatus={item.status}
            onScheduled={handleSchedulingComplete}
          />
        )
      ) : (
        // Requester view - show time selector to pick from proposed times if no time is selected yet
        !showSelectedTime && 
        item.proposedPickupWindows && 
        item.proposedPickupWindows.length > 0 && (
          <PickupTimeSelector
            itemId={item.id}
            itemOwnerId={item.userId}
            currentUserId={user.id}
            requestId={requestId}
            windows={item.proposedPickupWindows}
            onSelected={handleSchedulingComplete}
          />
        )
      )}
    </div>
  );
}