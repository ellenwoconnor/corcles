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
  const showScheduler =
    isOwner && ["requested", "scheduling", "scheduled"].includes(item.status);

  console.log("Pickup scheduler visibility:", {
    isOwner,
    itemStatus: item.status,
    showScheduler,
    userId: user?.id,
    itemUserId: item.userId
  });

  if (!user) return null;

  return (
    <div className="space-y-4">
      {isOwner && showScheduler && (
        <PickupScheduler
          itemId={item.id}
          itemStatus={item.status}
          onScheduled={handleSchedulingComplete}
        />
      )}
    </div>
  );
}
