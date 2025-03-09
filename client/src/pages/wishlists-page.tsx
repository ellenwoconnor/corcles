import { useAuth } from "@/features/auth/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { type Wishlist } from "@shared/schema";
import Navbar from "@/components/navbar";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import CreateWishlistDialog from "@/components/create-wishlist-dialog";
import { Loader2, Lock, Eye, Gift, ExternalLink } from "lucide-react";
import { useLocation } from "wouter";

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
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function WishlistsPage() {
  const { user } = useAuth();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [, setLocation] = useLocation();

  const { data: userWishlists = [], isLoading: isLoadingUserWishlists } =
    useQuery<Wishlist[]>({
      queryKey: ["/api/user/wishlists"],
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
      const response = await fetch(`/api/items?communities=${communityIds}`);
      if (!response.ok) return [];
      return response.json();
    },
  });

  // Filter items that were created to fulfill user's wishlists
  const getFulfillmentItemsForWishlist = (wishlistId: number) => {
    // First, check if the wishlist creator is a recipient of any items
    // This is a temporary solution until wishlist-specific tracking is implemented
    const wishlist = userWishlists.find((w) => w.id === wishlistId);
    if (!wishlist) return [];

    return allItems.filter(
      (item) =>
        // Check if this item is being given to the wishlist creator
        item.recipientId === wishlist.userId,
    );
  };

  // Navigate to the listing that fulfills the wishlist
  const viewFulfillmentListing = (wishlistId: number) => {
    const fulfillmentItems = getFulfillmentItemsForWishlist(wishlistId);
    console.log("?", fulfillmentItems);
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
            <h1 className="text-4xl font-bold tracking-tight">Wishlists</h1>
            <p className="text-muted-foreground">
              Post items you're looking for
            </p>
          </div>
          <div>
            <Button onClick={() => setDialogOpen(true)}>Add Item</Button>
          </div>
        </div>

        {isLoadingUserWishlists ? (
          <div className="flex items-center justify-center min-h-[200px]">
            <Loader2 className="h-8 w-8 animate-spin text-border" />
          </div>
        ) : userWishlists.length === 0 ? (
          <div className="text-center py-12">
            <h2 className="text-xl font-semibold mb-2">No wishlists yet</h2>
            <p className="text-muted-foreground">
              Create your first wishlist to keep track of items you want
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {userWishlists.map((wishlist) => (
              <Card key={wishlist.id}>
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
                    {getFulfillmentItemsForWishlist(wishlist.id).length > 0 && (
                      <Badge
                        variant="outline"
                        className="bg-green-50 text-green-700 border-green-200 flex items-center gap-1"
                      >
                        <Gift className="h-3 w-3" />
                        Fulfilled
                      </Badge>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Posted {formatTimeAgo(new Date(wishlist.createdAt))}
                  </div>

                  {/* Show view button for fulfilled wishlists */}
                  {getFulfillmentItemsForWishlist(wishlist.id).length > 0 && (
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
        )}

        <CreateWishlistDialog open={dialogOpen} onOpenChange={setDialogOpen} />
      </main>
    </div>
  );
}
