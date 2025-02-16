import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { Item, ItemRequest, ItemBid } from "@shared/schema";
import Navbar from "@/components/navbar";
import ItemGrid from "@/components/item-grid";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Package, Gift, Tag } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export default function ProfilePage() {
  const { user } = useAuth();

  const { data: userItems, isLoading: itemsLoading } = useQuery<Item[]>({
    queryKey: ["/api/user/items"],
    enabled: !!user,
  });

  const { data: userRequests, isLoading: requestsLoading } = useQuery<(ItemRequest & { item: Item })[]>({
    queryKey: ["/api/user/requests"],
    enabled: !!user,
  });

  const { data: userBids, isLoading: bidsLoading } = useQuery<(ItemBid & { item: Item })[]>({
    queryKey: ["/api/user/bids"],
    enabled: !!user,
  });

  const { data: communityData, isLoading: communityLoading } = useQuery({
    queryKey: ["/api/community", user?.community],
    queryFn: async () => {
      const response = await fetch(`/api/community/${user?.community}/count`);
      if (!response.ok) throw new Error('Failed to fetch community count');
      return response.json();
    },
    enabled: !!user?.community,
  });

  const communityCount = communityData?.count || 0;

  if (!user || itemsLoading || requestsLoading || bidsLoading || communityLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-border" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container py-12">
        <div className="mb-8 space-y-4">
          <div>
            <h1 className="text-4xl font-bold tracking-tight">{user.username}</h1>
          </div>
          
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-2">
                <div>
                  <p className="font-medium">Address</p>
                  <p className="text-muted-foreground">{user.address}</p>
                </div>
                <div>
                  <p className="font-medium">Home Community</p>
                  <div className="flex items-center gap-2">
                    <p className="text-muted-foreground">{user.community}</p>
                    <Badge variant="secondary">
                      {communityCount} {communityCount === 1 ? 'member' : 'members'}
                    </Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="listings">
          <TabsList className="mb-4">
            <TabsTrigger value="listings" className="flex items-center gap-2">
              <Package className="h-4 w-4" />
              My Listings
            </TabsTrigger>
            <TabsTrigger value="requests" className="flex items-center gap-2">
              <Gift className="h-4 w-4" />
              My Requests
            </TabsTrigger>
            <TabsTrigger value="bids" className="flex items-center gap-2">
              <Tag className="h-4 w-4" />
              My Bids
            </TabsTrigger>
          </TabsList>

          <TabsContent value="listings">
            {userItems?.length === 0 ? (
              <Card>
                <CardHeader>
                  <CardTitle>No Listings</CardTitle>
                  <CardDescription>
                    You haven't listed any items yet.
                  </CardDescription>
                </CardHeader>
              </Card>
            ) : (
              <ItemGrid items={userItems ?? []} />
            )}
          </TabsContent>

          <TabsContent value="requests">
            <div className="grid gap-4">
              {userRequests?.length === 0 ? (
                <Card>
                  <CardHeader>
                    <CardTitle>No Requests</CardTitle>
                    <CardDescription>
                      You haven't requested any items yet.
                    </CardDescription>
                  </CardHeader>
                </Card>
              ) : (
                userRequests?.map((request) => (
                  <Card key={request.id}>
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle>{request.item.title}</CardTitle>
                          <CardDescription>
                            Requested{" "}
                            {formatDistanceToNow(new Date(request.createdAt), {
                              addSuffix: true,
                            })}
                          </CardDescription>
                        </div>
                        <Badge
                          variant={
                            request.status === "pending"
                              ? "secondary"
                              : request.status === "accepted"
                              ? "default"
                              : "destructive"
                          }
                        >
                          {request.status}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-muted-foreground">{request.message}</p>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>

          <TabsContent value="bids">
            <div className="grid gap-4">
              {userBids?.length === 0 ? (
                <Card>
                  <CardHeader>
                    <CardTitle>No Bids</CardTitle>
                    <CardDescription>
                      You haven't placed any bids yet.
                    </CardDescription>
                  </CardHeader>
                </Card>
              ) : (
                userBids?.map((bid) => (
                  <Card key={bid.id}>
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle>{bid.item.title}</CardTitle>
                          <CardDescription>
                            Bid placed{" "}
                            {formatDistanceToNow(new Date(bid.createdAt), {
                              addSuffix: true,
                            })}
                          </CardDescription>
                        </div>
                        <Badge
                          variant={
                            bid.status === "pending"
                              ? "secondary"
                              : bid.status === "accepted"
                              ? "default"
                              : "destructive"
                          }
                        >
                          {bid.status}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="font-medium mb-2">${bid.amount}</p>
                      <p className="text-muted-foreground">{bid.message}</p>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
