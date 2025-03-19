
import { type ItemRequest } from "@shared/schema";

export function getRequestStatusVariant(status: string) {
  switch (status) {
    case "pending":
      return "secondary";
    case "ready_for_drawing":
    case "accepted":
      return "default";
    case "awaiting_pickup_confirmation":
      return "default";
    case "completed":
      return "outline";
    case "backup":
      return "secondary";
    default:
      return "destructive";
  }
}

export function formatRequestStatus(status: string) {
  switch (status) {
    case "ready_for_drawing":
      return "Ready for Drawing";
    case "awaiting_pickup_confirmation":
      return "Awaiting Confirmation";
    case "accepted":
      return "Pickup Scheduled";
    case "completed":
      return "Pickup Complete";
    default:
      return status.charAt(0).toUpperCase() + status.slice(1);
  }
}
