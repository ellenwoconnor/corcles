import { useAuth } from "@/features/auth/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { Item, ItemRequest, ItemBid } from "@shared/schema";
import Navbar from "@/components/navbar";
import ItemGrid from "@/components/item-grid";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Loader2, Package, Gift, Tag, Clock } from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import { Link } from "wouter";

export default function ProfilePage() {
  const { user } = useAuth();

  const { data: userItems, isLoading: itemsLoading } = useQuery<Item[]>({
    queryKey: ["/api/user/items", user?.id],
    enabled: !!user,
  });

  const { data: userRequests, isLoading: requestsLoading } = useQuery<(ItemRequest & { item: Item })[]>({
    queryKey: ["/api/user/requests", user?.id],
    enabled: !!user,
  });

  const { data: userBids, isLoading: bidsLoading } = useQuery<(ItemBid & { item: Item })[]>({
    queryKey: ["/api/user/bids", user?.id],
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
          <div className="space-y-4">
            <div>
              <h1 className="text-3xl font-bold tracking-tight mb-2">{user.username}</h1>
              <div className="flex items-center gap-x-6 text-sm">
                <div>
                  <span className="font-medium">Address: </span>
                  <span className="text-muted-foreground">{user.address}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-medium">Home Community: </span>
                  <span className="text-muted-foreground">{user.community}</span>
                  <Badge variant="secondary" className="ml-1">
                    {communityCount} {communityCount === 1 ? 'member' : 'members'}
                  </Badge>
                </div>
              </div>
            </div>
          </div>
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
            <div className="grid gap-4">
              {userItems?.some(item => item.recipientId && !item.pickupStart) && (
                <Alert className="mb-4">
                  <Clock className="h-4 w-4" />
                  <AlertTitle>Action Needed</AlertTitle>
                  <AlertDescription>
                    You have items that need pickup windows scheduled
                  </AlertDescription>
                </Alert>
              )}
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
                <div className="grid gap-4">
                  {userItems?.map((item) => (
                    <Card key={item.id}>
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div>
                            <CardTitle>
                              <Link href={`/item/${item.id}`} className="hover:underline">
                                {item.title}
                              </Link>
                            </CardTitle>
                            <CardDescription>
                              Listed {formatDistanceToNow(new Date(item.createdAt), {
                                addSuffix: true,
                              })}
                            </CardDescription>
                          </div>
                          <Badge
                            variant={
                              !item.recipientId ? "secondary" :
                              !item.pickupStart ? "default" :
                              "outline"
                            }
                          >
                            {requests?.some(r => r.status === "awaiting_pickup_confirmation") 
                              ? "Pickup Confirmation Pending"
                              : !item.recipientId 
                                ? "Pending Requests" 
                                : !item.pickupStart 
                                  ? "Schedule Pickup" 
                                  : "Pickup Scheduled"}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent>
                        {item.pickupStart && (
                          <p className="text-sm text-muted-foreground">
                            Pickup: {format(new Date(item.pickupStart), "PPP p")} - {format(new Date(item.pickupEnd!), "p")}
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="requests">
            <div className="grid gap-4">
              {userRequests?.some(r => r.status === "awaiting_pickup_confirmation") && (
                <Alert className="mb-4">
                  <Clock className="h-4 w-4" />
                  <AlertTitle>Action Needed</AlertTitle>
                  <AlertDescription>
                    You have pickup windows that need confirmation
                  </AlertDescription>
                </Alert>
              )}
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
                            request.status === "pending" ? "secondary" :
                            request.status === "awaiting_pickup_confirmation" ? "default" :
                            request.status === "accepted" ? "outline" :
                            "destructive"
                          }
                        >
                          {request.status === "awaiting_pickup_confirmation" ? "Confirm Pickup" :
                           request.status === "accepted" ? "Pickup Scheduled" :
                           request.status}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-muted-foreground mb-2">{request.message}</p>
                      {request.item.pickupStart && (
                        <p className="text-sm text-muted-foreground">
                          Pickup: {format(new Date(request.item.pickupStart), "PPP p")} - {format(new Date(request.item.pickupEnd!), "p")}
                        </p>
                      )}
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