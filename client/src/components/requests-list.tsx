import { formatDistanceToNow } from "date-fns";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ItemRequest } from "@shared/schema";

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

interface RequestsListProps {
  requests: ItemRequest[];
  currentUserId?: number;
}

export default function RequestsList({ requests, currentUserId }: RequestsListProps) {
  if (!requests?.length) {
    return (
      <Card className="p-4">
        <p className="text-sm text-muted-foreground">No requests yet</p>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {requests.map((request) => (
        <Card key={request.id} className="p-4">
          <div className="flex items-start justify-between gap-2">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <p className="font-medium text-sm">Anonymous Requester</p>
                <span className="text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(request.createdAt), {
                    addSuffix: true,
                  })}
                </span>
              </div>
              {request.message && (
                <p className="text-sm text-muted-foreground">{request.message}</p>
              )}
            </div>
            <Badge
              variant={getRequestStatusVariant(request.status)}
              className="text-xs capitalize"
            >
              {formatRequestStatus(request.status)}
            </Badge>
          </div>
        </Card>
      ))}
    </div>
  );
}