import { formatDistanceToNow } from "date-fns";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ItemBid } from "@shared/schema";

export function getBidStatusVariant(status: string) {
  switch (status) {
    case "pending":
      return "secondary";
    case "accepted":
      return "default";
    default:
      return "destructive";
  }
}

interface BidsListProps {
  bids: ItemBid[];
}

export default function BidsList({ bids }: BidsListProps) {
  if (!bids?.length) {
    return <p className="text-muted-foreground">No bids yet.</p>;
  }

  return bids.map((bid) => (
    <Card key={bid.id} className="p-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <p className="font-medium text-sm">Anonymous · ${bid.amount}</p>
            <span className="text-xs text-muted-foreground">
              {formatDistanceToNow(new Date(bid.createdAt), {
                addSuffix: true,
              })}
            </span>
          </div>
          <p className="text-sm text-muted-foreground">{bid.message}</p>
        </div>
        <Badge
          variant={getBidStatusVariant(bid.status)}
          className="text-xs"
        >
          {bid.status}
        </Badge>
      </div>
    </Card>
  ));
}
