import { useAuth } from "@/features/auth/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { type Wishlist, type ItemRequest } from "@shared/schema";
import Navbar from "@/components/navbar";
import {
  getRequestStatusVariant,
  formatRequestStatus,
} from "@/lib/request-utils";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import CreateWishlistDialog from "@/components/create-wishlist-dialog";
import { Loader2, Lock, Eye, Gift, ExternalLink } from "lucide-react";
import { useLocation } from "wouter";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ListChecks, Tag } from "lucide-react";
import WishlistDetailsDialog from "@/components/wishlist-details-dialog";

// Format time ago function
function formatTimeAgo(date: Date): string {
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) {
    return "just now";
  }

  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) {
    return `${diffInMinutes} ${diffInMinutes === 1 ? "minute" : "minutes"} ago`;
  }

  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) {
    return `${diffInHours} ${diffInHours === 1 ? "hour" : "hours"} ago`;
  }

  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 30) {
    return `${diffInDays} ${diffInDays === 1 ? "day" : "days"} ago`;
  }

  const diffInMonths = Math.floor(diffInDays / 30);
  if (diffInMonths < 12) {
    return `${diffInMonths} ${diffInMonths === 1 ? "month" : "months"} ago`;
  }

  const diffInYears = Math.floor(diffInMonths / 12);
  return `${diffInYears} ${diffInYears === 1 ? "year" : "years"} ago`;
}

export default function RequestsPage() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [selectedWishlist, setSelectedWishlist] = useState<any>(null);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);

  // Handle clicking on a wishlist
  const handleWishlistClick = (wishlist: any) => {
    setSelectedWishlist(wishlist);
    setDetailsDialogOpen(true);
  };

  const { data: userWishlists = [], isLoading: isLoadingUserWishlists } =
    useQuery<Wishlist[]>({
      queryKey: ["/api/user/wishlists"],
      enabled: !!user,
    });

  const { data: userRequests = [] } = useQuery<(ItemRequest & { item: any })[]>(
    {
      queryKey: ["/api/user/requests"],
      enabled: !!user,
    },
  );

  const { data: userBids = [] } = useQuery<any[]>({
    queryKey: ["/api/user/bids"],
    enabled: !!user,
  });

  // Get communities first to properly fetch items
  const { data: userCommunities = [] } = useQuery({
    queryKey: ["/api/user/communities"],
    enabled: !!user,
  });

  // Get user items to check if any fulfill the user's wishlists
  const { data: allItems = [] } = useQuery<any[]>({
    queryKey: ["/api/items", userCommunities],
    enabled: !!user && userCommunities.length > 0,
    queryFn: async () => {
      if (!userCommunities.length) return [];
      const communityIds = userCommunities.map((c) => c.id).join(",");
      // Add includeWithRecipients=true parameter to include items that have recipients
      const response = await fetch(
        `/api/items?communities=${communityIds}&includeWithRecipients=true`,
      );
      if (!response.ok) return [];
      return response.json();
    },
  });

  // Filter items that were created to fulfill user's wishlists
  const getFulfillmentItemsForWishlist = (wishlistId: number) => {
    // Return items that specifically fulfill this wishlist ID
    const filtered = allItems.filter(
      (item) =>
        // Check if this item is explicitly linked to this wishlist
        item.wishlistId === wishlistId &&
        // And check if the current user is the recipient
        item.recipientId === user?.id,
    );

    // Find items with wishlist ID 3 (for debugging)
    const wishlistItems = allItems.filter(
      (item) => item.wishlistId === wishlistId,
    );

    console.log(`Filtering for wishlist ${wishlistId}:`, {
      totalItems: allItems.length,
      itemsWithWishlistId: wishlistItems.length,
      itemsWithUserAsRecipient: allItems.filter(
        (item) => item.recipientId === user?.id,
      ).length,
      matchingBoth: filtered.length,
      userId: user?.id,
    });

    // Log details of items with this wishlist ID
    if (wishlistId === 3) {
      console.log(
        `Items with wishlistId ${wishlistId}:`,
        wishlistItems.map((item) => ({
          id: item.id,
          title: item.title,
          recipientId: item.recipientId,
          userId: item.userId,
        })),
      );
    }

    return filtered;
  };

  // Navigate to the listing that fulfills the wishlist
  const viewFulfillmentListing = (wishlistId: number) => {
    const fulfillmentItems = getFulfillmentItemsForWishlist(wishlistId);
    if (fulfillmentItems.length > 0) {
      setLocation(`/item/${fulfillmentItems[0].id}`);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container py-12 px-8">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-8">
          <div>
            <h1 className="text-2xl tracking-tight">My Requests</h1>
          </div>
        </div>

        {isLoadingUserWishlists ? (
          <div className="flex items-center justify-center min-h-[200px]">
            <Loader2 className="h-8 w-8 animate-spin text-border" />
          </div>
        ) : userWishlists.length === 0 ? (
          <Card>
            <CardHeader>
              <CardTitle>No wishlists yet</CardTitle>
              <CardDescription>
                Create your first wishlist to keep track of items you're looking
                for!
              </CardDescription>
            </CardHeader>
          </Card>
        ) : (
          <Tabs defaultValue="wishlists">
            <TabsList className="mb-4">
              <TabsTrigger
                value="wishlists"
                className="flex items-center gap-2"
              >
                <ListChecks className="h-4 w-4" />
                Wishlists
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

            <TabsContent value="wishlists">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {userWishlists.map((wishlist) => (
                  <Card
                    key={wishlist.id}
                    className="cursor-pointer hover:ring-1 hover:ring-primary/20 transition-all"
                    onClick={() => handleWishlistClick(wishlist)}
                  >
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        {wishlist.title}
                        {wishlist.isPrivate && (
                          <Lock className="h-4 w-4 text-muted-foreground" />
                        )}
                      </CardTitle>
                      <CardDescription>{wishlist.description}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-wrap gap-2 mb-2">
                        {wishlist.budget && (
                          <Badge variant="secondary">
                            Budget: ${wishlist.budget}
                          </Badge>
                        )}

                        {/* Check if this wishlist has fulfillment offers */}
                        {getFulfillmentItemsForWishlist(wishlist.id).length >
                          0 && (
                          <Badge
                            variant="outline"
                            className="bg-green-50 text-green-700 border-green-200 flex items-center gap-1"
                          >
                            <Gift className="h-3 w-3" />
                            Offers Available
                          </Badge>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Posted {formatTimeAgo(new Date(wishlist.createdAt))}
                      </div>

                      {/* Show view button for fulfilled wishlists */}
                      {getFulfillmentItemsForWishlist(wishlist.id).length >
                        0 && (
                        <div className="mt-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-xs flex items-center gap-1"
                            onClick={() => viewFulfillmentListing(wishlist.id)}
                          >
                            <ExternalLink className="h-3 w-3" />
                            View Offered Item
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="requests">
              <div className="space-y-4">
                {!userRequests || userRequests.length === 0 ? (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">No Requests</CardTitle>
                      <CardDescription>
                        You haven't requested any items yet.
                      </CardDescription>
                    </CardHeader>
                  </Card>
                ) : (
                  userRequests.map((request) => (
                    <Card
                      key={request.id}
                      className="cursor-pointer hover:ring-1 hover:ring-primary/20 transition-all"
                      onClick={() =>
                        (window.location.href = `/item/${request.item.id}`)
                      }
                    >
                      <CardHeader className="py-3">
                        <div className="flex items-center gap-3">
                          <img
                            src={request.item.imageUrl}
                            alt={request.item.title}
                            className="w-12 h-12 rounded object-cover"
                          />
                          <div>
                            <h3 className="font-medium text-sm">
                              {request.item.title}
                            </h3>
                            <p className="text-sm text-muted-foreground">
                              {formatTimeAgo(new Date(request.createdAt))}
                            </p>
                          </div>
                          <Badge
                            variant={getRequestStatusVariant(request.status)}
                            className="ml-auto"
                          >
                            {formatRequestStatus(request.status)}
                          </Badge>
                        </div>
                      </CardHeader>
                    </Card>
                  ))
                )}
              </div>
            </TabsContent>

            <TabsContent value="bids">
              <div className="space-y-4">
                {!userBids || userBids.length === 0 ? (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">No Bids</CardTitle>
                      <CardDescription>
                        You haven't placed any bids yet.
                      </CardDescription>
                    </CardHeader>
                  </Card>
                ) : (
                  userBids.map((bid) => (
                    <Card
                      key={bid.id}
                      className="cursor-pointer hover:ring-1 hover:ring-primary/20 transition-all"
                      onClick={() =>
                        (window.location.href = `/item/${bid.item.id}`)
                      }
                    >
                      <CardHeader className="py-3">
                        <div className="flex items-center gap-3">
                          <img
                            src={bid.item.imageUrl}
                            alt={bid.item.title}
                            className="w-12 h-12 rounded object-cover"
                          />
                          <div>
                            <h3 className="font-medium text-sm">
                              {bid.item.title}
                            </h3>
                            <p className="text-sm text-muted-foreground">
                              Bid amount: ${bid.amount}
                            </p>
                          </div>
                          <Badge
                            variant={
                              bid.status === "accepted"
                                ? "success"
                                : "secondary"
                            }
                            className="ml-auto"
                          >
                            {bid.status.charAt(0).toUpperCase() +
                              bid.status.slice(1)}
                          </Badge>
                        </div>
                      </CardHeader>
                    </Card>
                  ))
                )}
              </div>
            </TabsContent>
          </Tabs>
        )}
      </main>
      <WishlistDetailsDialog
        open={detailsDialogOpen}
        onOpenChange={setDetailsDialogOpen}
        wishlist={selectedWishlist}
        showFulfillButton={false}
        currentUserId={user?.id}
      />
    </div>
  );
}