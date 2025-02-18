
import { Item, ItemRequest, PickupWindow } from "@shared/schema";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Clock } from "lucide-react";
import PickupConfirmation from "./pickup-confirmation";
import PickupScheduler from "./pickup-scheduler";
import PickupTimeSelector from "./pickup-time-selector";
import MessageDialog from "./message-dialog";

interface PickupSchedulingProps {
  item: Item;
  requests?: ItemRequest[];
  isOwner: boolean;
  userId?: number;
  onScheduled?: () => void;
}

export default function PickupScheduling({
  item,
  requests,
  isOwner,
  userId,
  onScheduled,
}: PickupSchedulingProps) {
  const hasPendingRequests = requests?.some(r => r.status === "pending");
  const hasReadyForDrawing = requests?.some(r => r.status === "ready_for_drawing");
  const hasAwaitingConfirmation = requests?.some(r => r.status === "awaiting_pickup_confirmation");
  const hasAccepted = requests?.some(r => r.status === "accepted");

  // Owner view
  if (isOwner) {
    return (
      <div className="space-y-4">
        {/* Show scheduler when there are pending requests but no windows */}
        {hasPendingRequests && !item.proposedPickupWindows?.length && (
          <div className="space-y-2">
            <h3 className="font-medium">Schedule Pickup</h3>
            <p className="text-sm text-muted-foreground mb-4">
              First, set time windows for item pickup. Then you can select a recipient.
            </p>
            <PickupScheduler itemId={item.id} onScheduled={onScheduled} />
          </div>
        )}

        {/* Show proposed windows if they exist */}
        {item.proposedPickupWindows && item.proposedPickupWindows.length > 0 && (
          <div className="space-y-2">
            <h3 className="font-medium">Proposed Pickup Windows</h3>
            <div className="space-y-2">
              {item.proposedPickupWindows.map((window: PickupWindow, index: number) => {
                const isSelectedWindow = item.pickupStart &&
                  new Date(window.pickupStart).getTime() === new Date(item.pickupStart).getTime() &&
                  new Date(window.pickupEnd).getTime() === new Date(item.pickupEnd).getTime();

                return (
                  <div
                    key={index}
                    className={`p-3 rounded-lg border ${
                      isSelectedWindow
                        ? "bg-primary/10 border-primary"
                        : "bg-secondary border-border"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <p className="text-sm">
                        {format(new Date(window.pickupStart), "EEEE, MMMM d")} at{" "}
                        {format(new Date(window.pickupStart), "h:mm a")} -{" "}
                        {format(new Date(window.pickupEnd), "h:mm a")}
                      </p>
                      {isSelectedWindow && (
                        <Badge variant="outline">Selected Time</Badge>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Show messaging if there's a recipient */}
        {item.recipientId && userId && (
          <MessageDialog
            requestId={requests?.[0]?.id || 0}
            currentUserId={userId}
            otherPartyId={item.recipientId}
          />
        )}
      </div>
    );
  }

  // Recipient view
  return (
    <div className="space-y-4 border-t border-border pt-4">
      {hasAccepted || item.pickupStart ? (
        <div className="space-y-2">
          <div className="p-4 bg-primary/10 rounded-lg border border-primary">
            <h3 className="font-medium mb-2">Pickup Scheduled</h3>
            <p className="text-sm text-muted-foreground">
              {format(new Date(item.pickupStart!), "EEEE, MMMM d")} at{" "}
              {format(new Date(item.pickupStart!), "h:mm a")} -{" "}
              {format(new Date(item.pickupEnd!), "h:mm a")}
            </p>
          </div>
          {userId && (
            <MessageDialog
              requestId={requests?.[0]?.id || 0}
              currentUserId={userId}
              otherPartyId={item.userId}
            />
          )}
        </div>
      ) : hasAwaitingConfirmation ? (
        <div className="space-y-2">
          <h3 className="font-medium">Available Pickup Times</h3>
          <p className="text-sm text-muted-foreground">
            Please select a time that works for you
          </p>
          <PickupTimeSelector
            itemId={item.id}
            windows={item.proposedPickupWindows as PickupWindow[]}
            onSelected={onScheduled}
          />
        </div>
      ) : hasPendingRequests ? (
        <div className="space-y-2">
          <h3 className="font-medium">Request Pending</h3>
          <p className="text-sm text-muted-foreground">
            Waiting for the owner to schedule pickup windows.
          </p>
          <Badge variant="secondary">Pending</Badge>
        </div>
      ) : null}
    </div>
  );
}
