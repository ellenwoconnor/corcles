import { useState } from "react";
import { Item, PickupWindow } from "@shared/schema";
import { useAuth } from "@/features/auth/hooks/use-auth";
import PickupTimeSelector from "./pickup-time-selector";
import PickupScheduler from "./pickup-scheduler";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Alert } from "@/components/ui/alert";
import { MessageDialog } from "./message-dialog";

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

  // Check if the current user is the owner
  const isOwner = user?.id === item.userId;

  // Determine the other party's ID (owner if viewer is requester, requester if viewer is owner)
  const otherPartyId = isOwner ? requesterId : item.userId;

  // Handler for when scheduling is completed by either party
  const handleSchedulingComplete = () => {
    setSchedulingComplete(true);
    onScheduled?.();
  };

  // Display selected pickup window if one exists
  const showSelectedTime = item.pickupStart && item.pickupEnd;
  // Only show message dialog when scheduling is complete or time is selected
  const showMessageDialog = user && (showSelectedTime || schedulingComplete);
  // Only show time selector when there are proposed windows and no time is selected yet
  const showTimeSelector = !isOwner && !showSelectedTime && item.proposedPickupWindows?.length > 0;
  // Only show scheduler for owner when no windows are proposed and no time is selected
  const showScheduler = isOwner && !showSelectedTime && !item.proposedPickupWindows?.length;

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
            <Badge variant="outline">Pickup Scheduled</Badge>
          </div>
        </Alert>
      )}

      {showScheduler && (
        <PickupScheduler
          itemId={item.id}
          onScheduled={handleSchedulingComplete}
        />
      )}

      {isOwner && !showSelectedTime && item.proposedPickupWindows?.length > 0 && (
        <div className="space-y-2">
          <h3 className="font-medium">Proposed Pickup Windows</h3>
          <div className="space-y-2">
            {item.proposedPickupWindows.map((window: PickupWindow, index: number) => (
              <div key={index} className="p-3 bg-secondary rounded-lg border border-border">
                <p className="text-sm">
                  {format(new Date(window.pickupStart), "EEEE, MMMM d")} at{" "}
                  {format(new Date(window.pickupStart), "h:mm a")} -{" "}
                  {format(new Date(window.pickupEnd), "h:mm a")}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {showTimeSelector && (
        <PickupTimeSelector
          itemId={item.id}
          itemOwnerId={item.userId}
          currentUserId={user.id}
          requestId={requestId}
          windows={item.proposedPickupWindows}
          onSelected={handleSchedulingComplete}
        />
      )}

      {showMessageDialog && (
        <MessageDialog
          requestId={requestId}
          currentUserId={user.id}
          otherPartyId={otherPartyId}
          recipientId={otherPartyId}
        />
      )}
    </div>
  );
}