import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Item, PickupWindow } from "@shared/schema";
import { useAuth } from "@/features/auth/hooks/use-auth";
import PickupTimeSelector from "./pickup-time-selector";
import PickupScheduler from "./pickup-scheduler";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Alert } from "@/components/ui/alert";

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

  const { data: pickupWindows = [] } = useQuery<PickupWindow[]>({
    queryKey: [`/api/items/${item.id}/pickup-windows`],
    queryFn: async () => {
      const response = await fetch(`/api/items/${item.id}/pickup-windows`);
      if (!response.ok) {
        throw new Error("Failed to fetch pickup windows");
      }
      return response.json();
    },
    enabled: !!item.id,
  });

  // Handler for when scheduling is completed by either party
  const handleSchedulingComplete = () => {
    setSchedulingComplete(true);
    onScheduled?.();
  };

  // Display selected pickup window if one exists
  const showSelectedTime = item.pickupStart && item.pickupEnd;

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

      {isOwner ? (
        // Owner view - show scheduler to propose times
        <PickupScheduler
          itemId={item.id}
          onScheduled={handleSchedulingComplete}
        />
      ) : (
        // Requester view - show time selector to pick from proposed times
        <PickupTimeSelector
          itemId={item.id}
          itemOwnerId={item.userId}
          currentUserId={user.id}
          requestId={requestId}
          windows={pickupWindows}
          onSelected={handleSchedulingComplete}
        />
      )}
    </div>
  );
}