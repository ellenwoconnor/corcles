import { useQuery } from "@tanstack/react-query";
import { ItemBid } from "@shared/schema";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";

interface BidsListProps {
  itemId: number;
}

export default function BidsList({ itemId }: BidsListProps) {
  const { data: bids } = useQuery<ItemBid[]>({
    queryKey: [`/api/items/${itemId}/bids`],
  });

  if (!bids?.length) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>No Bids</CardTitle>
          <CardDescription>
            No bids have been placed on this item yet.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {bids.map((bid) => (
        <Card key={bid.id}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Bid from User {bid.bidderId}</CardTitle>
                <CardDescription>
                  {formatDistanceToNow(new Date(bid.createdAt), {
                    addSuffix: true,
                  })}
                </CardDescription>
              </div>
              <Badge>{bid.status}</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <p className="font-medium">${bid.amount}</p>
            {bid.message && (
              <p className="text-sm text-muted-foreground mt-2">{bid.message}</p>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}