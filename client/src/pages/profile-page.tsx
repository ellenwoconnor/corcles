import { useAuth } from "@/features/auth/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { Item, ItemRequest, ItemBid, Wishlist } from "@shared/schema";
import Navbar from "@/components/navbar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Loader2, Package, Gift, Tag, Clock, ListChecks } from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import WishlistFulfillmentView from "@/components/wishlist-fulfillment-view";

export default function ProfilePage() {
  const { user } = useAuth();

  const { data: userItems, isLoading: itemsLoading } = useQuery<Item[]>({
    queryKey: ["/api/user/items"],
    enabled: !!user,
  });

  const { data: userRequests, isLoading: requestsLoading } = useQuery<
    (ItemRequest & { item: Item })[]
  >({
    queryKey: ["/api/user/requests"],
    enabled: !!user,
  });

  const { data: userBids, isLoading: bidsLoading } = useQuery<
    (ItemBid & { item: Item })[]
  >({
    queryKey: ["/api/user/bids"],
    enabled: !!user,
  });

  // Fetch user's wishlists
  const { data: userWishlists = [], isLoading: wishlistsLoading } = useQuery<
    Wishlist[]
  >({
    queryKey: ["/api/user/wishlists"],
    enabled: !!user,
  });

  // Get communities to properly fetch items
  const { data: userCommunities = [] } = useQuery({
    queryKey: ["/api/user/communities"],
    enabled: !!user,
  });

  // Get items with community filter to avoid the 400 error
  const { data: allItems = [] } = useQuery<Item[]>({
    queryKey: ["/api/items", userCommunities],
    enabled: !!user && userCommunities.length > 0,
    queryFn: async () => {
      if (!userCommunities.length) return [];
      const communityIds = userCommunities.map((c) => c.id).join(",");
      const response = await fetch(`/api/items?communities=${communityIds}`);
      if (!response.ok) return [];
      return response.json();
    },
  });

  const pendingConfirmations =
    userRequests?.filter((r) => r.status === "awaiting_pickup_confirmation") ||
    [];

  const requestedItems = userItems?.filter(
    (item) => item.status === "requested" && !item.pickupStart,
  );

  // Function to get fulfillment items for a wishlist
  const getFulfillmentItemsForWishlist = (wishlistId: number) => {
    return allItems.filter(
      (item) =>
        // Check if this item is assigned to this specific wishlist
        item.wishlistId === wishlistId && item.recipientId === user?.id,
    );
  };

  const statusText = {
    completed: "Pickup Complete",
    scheduled: "Pickup Scheduled",
    scheduling: "Setting Pickup Time",
    requested: "Requests Received",
    available: "Available",
    delisted: "Delisted",
    pending_pickup: "Pending Pickup",
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="container py-12">
          <div className="text-center">
            <h2 className="text-2xl font-bold mb-2">Please Sign In</h2>
            <p className="text-muted-foreground">
              You need to be signed in to view your profile.
            </p>
          </div>
        </main>
      </div>
    );
  }

  if (itemsLoading || requestsLoading || bidsLoading) {
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
              <h1 className="text-2xl tracking-tight mb-2">{user.username}</h1>
              <div className="text-sm">
                <span className="font-medium">Address: </span>
                <span className="text-muted-foreground">{user.address}</span>
              </div>
            </div>
          </div>
        </div>

        <Tabs defaultValue="requests">
          <TabsList className="mb-4">
            <TabsTrigger value="requests" className="flex items-center gap-2">
              <Gift className="h-4 w-4" />
              My Requests{" "}
              {pendingConfirmations.length > 0 && (
                <Badge variant="default" className="ml-2">
                  {pendingConfirmations.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="bids" className="flex items-center gap-2">
              <Tag className="h-4 w-4" />
              My Bids
            </TabsTrigger>
            <TabsTrigger value="wishlists" className="flex items-center gap-2">
              <ListChecks className="h-4 w-4" />
              My Wishlist
            </TabsTrigger>
          </TabsList>

          <TabsContent value="requests">
            <div className="grid gap-4">
              {pendingConfirmations.length > 0 && (
                <div className="mb-4 px-3 py-2 bg-primary/5 border border-primary/10 rounded-md">
                  <div className="flex items-center gap-2 text-sm text-primary">
                    <Clock className="h-3.5 w-3.5" />
                    <span>
                      {pendingConfirmations.length} pickup{" "}
                      {pendingConfirmations.length === 1 ? "time" : "times"} to
                      confirm
                    </span>
                  </div>
                </div>
              )}
              {!userRequests || userRequests.length === 0 ? (
                <Card>
                  <CardHeader className="py-3">
                    <CardTitle className="text-base">No Requests</CardTitle>
                    <CardDescription>
                      You haven't requested any items yet.
                    </CardDescription>
                  </CardHeader>
                </Card>
              ) : (
                userRequests.map((request) => (
                  <Card key={request.id}>
                    <CardHeader className="py-3">
                      <div className="flex items-center gap-3">
                        <img
                          src={request.item.imageUrl}
                          alt={request.item.title}
                          className="w-12 h-12 rounded object-cover"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <CardTitle className="text-base truncate">
                              <Link
                                href={`/item/${request.item.id}`}
                                className="hover:underline"
                              >
                                {request.item.title}
                              </Link>
                            </CardTitle>
                            <Badge
                              variant={
                                request.item.status === "delisted"
                                  ? "outline"
                                  : request.status ===
                                      "awaiting_pickup_confirmation"
                                    ? "default"
                                    : request.status === "accepted"
                                      ? "secondary"
                                      : request.status === "pending"
                                        ? "secondary"
                                        : "destructive"
                              }
                              className={
                                request.status === "accepted"
                                  ? "bg-background text-foreground border"
                                  : ""
                              }
                            >
                              {request.item.status === "delisted"
                                ? "Delisted"
                                : request.status ===
                                    "awaiting_pickup_confirmation"
                                  ? "Confirm Pickup"
                                  : request.status === "accepted"
                                    ? "Pickup Scheduled"
                                    : request.status}
                            </Badge>
                          </div>
                          <CardDescription className="text-sm">
                            Requested{" "}
                            {formatDistanceToNow(new Date(request.createdAt), {
                              addSuffix: true,
                            })}
                          </CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {request.item.status === "delisted" ? (
                        <div className="p-4 bg-muted rounded-lg border border-muted-foreground/20">
                          <h3 className="font-medium mb-2 text-muted-foreground">
                            This item has been delisted
                          </h3>
                          <p className="text-sm text-muted-foreground">
                            Delisted items cannot be edited or requested by
                            users.
                          </p>
                        </div>
                      ) : request.status === "awaiting_pickup_confirmation" ? (
                        <div className="mt-2">
                          <Link
                            href={`/item/${request.item.id}`}
                            className="inline-block"
                          >
                            <div className="text-sm text-primary hover:text-primary/90 flex items-center gap-1.5 font-medium">
                              <Clock className="h-3.5 w-3.5" />
                              Select pickup time
                            </div>
                          </Link>
                        </div>
                      ) : (
                        request.status === "accepted" &&
                        request.item.pickupStart && (
                          <div className="p-4 bg-primary/5 rounded-lg border border-primary/10">
                            <h3 className="font-medium mb-2">
                              Pickup Scheduled
                            </h3>
                            <p className="text-sm text-muted-foreground">
                              {format(
                                new Date(request.item.pickupStart),
                                "EEEE, MMMM d",
                              )}{" "}
                              at{" "}
                              {format(
                                new Date(request.item.pickupStart),
                                "h:mm a",
                              )}{" "}
                              -{" "}
                              {format(
                                new Date(request.item.pickupEnd!),
                                "h:mm a",
                              )}
                            </p>
                          </div>
                        )
                      )}
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>

          <TabsContent value="bids">
            <div className="grid gap-4">
              {!userBids || userBids.length === 0 ? (
                <Card>
                  <CardHeader className="py-3">
                    <CardTitle className="text-base">No Bids</CardTitle>
                    <CardDescription>
                      You haven't placed any bids yet.
                    </CardDescription>
                  </CardHeader>
                </Card>
              ) : (
                userBids.map((bid) => (
                  <Card key={bid.id}>
                    <CardHeader className="py-3">
                      <div className="flex items-center gap-3">
                        <img
                          src={bid.item.imageUrl}
                          alt={bid.item.title}
                          className="w-12 h-12 rounded object-cover"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <CardTitle className="text-base truncate">
                              <Link
                                href={`/item/${bid.item.id}`}
                                className="hover:underline"
                              >
                                {bid.item.title}
                              </Link>
                            </CardTitle>
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
                          <CardDescription className="text-sm">
                            Bid placed{" "}
                            {formatDistanceToNow(new Date(bid.createdAt), {
                              addSuffix: true,
                            })}
                          </CardDescription>
                          <div className="mt-1 font-medium text-sm">
                            ${bid.amount}
                          </div>
                        </div>
                      </div>
                    </CardHeader>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>

          <TabsContent value="wishlists">
            <div className="grid gap-4">
              {!userWishlists || userWishlists.length === 0 ? (
                <Card>
                  <CardHeader className="py-3">
                    <CardTitle className="text-base">No Wishlists</CardTitle>
                    <CardDescription>
                      You haven't created any wishlists yet.
                    </CardDescription>
                  </CardHeader>
                </Card>
              ) : (
                userWishlists.map((wishlist) => {
                  const fulfillmentItems = getFulfillmentItemsForWishlist(
                    wishlist.id,
                  );

                  return (
                    <Card key={wishlist.id}>
                      <CardHeader className="py-3">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-base">
                            {wishlist.title}
                          </CardTitle>
                          {fulfillmentItems.length > 0 && (
                            <Badge
                              variant="outline"
                              className="bg-green-50 text-green-700 border-green-200 flex items-center gap-1"
                            >
                              <Gift className="h-3 w-3" />
                              Offers Available
                            </Badge>
                          )}
                        </div>
                        <CardDescription className="text-sm">
                          Created{" "}
                          {formatDistanceToNow(new Date(wishlist.createdAt), {
                            addSuffix: true,
                          })}
                        </CardDescription>
                        {wishlist.description && (
                          <p className="text-sm mt-2 text-muted-foreground">
                            {wishlist.description}
                          </p>
                        )}
                      </CardHeader>
                      <CardContent>
                        {/* Show fulfillment items if any */}
                        <WishlistFulfillmentView
                          wishlistId={wishlist.id}
                          fulfillmentItems={fulfillmentItems}
                        />

                        {/* Link to create more wishlist items */}
                        <div className="mt-3">
                          <Link href="/wishlists">
                            <Button variant="outline" size="sm">
                              Manage Wishlists
                            </Button>
                          </Link>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })
              )}
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
