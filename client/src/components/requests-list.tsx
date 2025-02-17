import { useQuery } from "@tanstack/react-query";
import { ItemRequest } from "@shared/schema";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";

interface RequestsListProps {
  itemId: number;
}

export default function RequestsList({ itemId }: RequestsListProps) {
  const { data: requests } = useQuery<ItemRequest[]>({
    queryKey: [`/api/items/${itemId}/requests`],
  });

  if (!requests?.length) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>No Requests</CardTitle>
          <CardDescription>
            No one has requested this item yet.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {requests.map((request) => (
        <Card key={request.id}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Request from User {request.requesterId}</CardTitle>
                <CardDescription>
                  {formatDistanceToNow(new Date(request.createdAt), {
                    addSuffix: true,
                  })}
                </CardDescription>
              </div>
              <Badge>{request.status}</Badge>
            </div>
          </CardHeader>
          {request.message && (
            <CardContent>
              <p className="text-sm text-muted-foreground">{request.message}</p>
            </CardContent>
          )}
        </Card>
      ))}
    </div>
  );
}