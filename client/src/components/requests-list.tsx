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
    case "awaiting_pickup_confirmation":
      return "default";
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
    default:
      return status;
  }
}

interface RequestsListProps {
  requests: ItemRequest[];
}

export default function RequestsList({ requests }: RequestsListProps) {
  if (!requests?.length) {
    return <p className="text-muted-foreground">No requests yet.</p>;
  }

  return requests.map((request) => (
    <Card key={request.id} className="p-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <p className="font-medium text-sm">Anonymous</p>
            <span className="text-xs text-muted-foreground">
              {formatDistanceToNow(new Date(request.createdAt), {
                addSuffix: true,
              })}
            </span>
          </div>
          <p className="text-sm text-muted-foreground">{request.message}</p>
        </div>
        <Badge
          variant={getRequestStatusVariant(request.status)}
          className="text-xs"
        >
          {formatRequestStatus(request.status)}
        </Badge>
      </div>
    </Card>
  ));
}