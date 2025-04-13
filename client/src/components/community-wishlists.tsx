import React, { useState, useEffect } from "react";
import { useAuth } from "@/features/auth/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { type Wishlist } from "@shared/schema";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { Check, Clock, User, Lock } from "lucide-react";
import FulfillWishlistDialog from "./fulfill-wishlist-dialog";
import { motion } from "framer-motion"; //Import Framer Motion
import WishlistDetailsDialog from "./wishlist-details-dialog"; // Import the shared component

const FadeIn = ({ children, delay }) => {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1, transition: { duration: 0.5, delay } }}
    >
      {children}
    </motion.div>
  );
};

export default function CommunityWishlists() {
  const { user } = useAuth();
  const currentUserId = user?.id;
  const [selectedWishlist, setSelectedWishlist] = useState<
    Wishlist | undefined
  >(undefined);
  const [fulfilledWishlistUsers, setFulfilledWishlistUsers] = useState<
    number[]
  >([]);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [createItemDialogOpen, setCreateItemDialogOpen] = useState(false);

  const { data: communityWishlists = [], isLoading } = useQuery<
    (Wishlist & { communityName?: string; communityMascot?: string })[]
  >({
    queryKey: ["/api/communities/wishlists"],
    enabled: !!user,
  });

  const { data: communities = [] } = useQuery<any[]>({
    queryKey: ["/api/user/communities"],
    enabled: !!user,
  });
  console.log("community wishlists", communityWishlists);
  // Get user items to check if they've already fulfilled wishlists
  const { data: userItems = [] } = useQuery<any[]>({
    queryKey: ["/api/user/items"],
    enabled: !!user,
  });

  const { data: allItems = [] } = useQuery<any[]>({
    queryKey: ["/api/items", communities],
    enabled: !!user && communities.length > 0,
    queryFn: async () => {
      if (!communities.length) return [];
      const communityIds = communities.map((c) => c.id).join(",");
      const response = await fetch(
        `/api/items?communities=${communityIds}&includeWithRecipients=true`,
      );
      if (!response.ok) return [];
      return response.json();
    },
  });

  // Function to get fulfillment items for a specific wishlist
  const getFulfillmentItemsForWishlist = (wishlistId: number) => {
    return allItems.filter(
      (item) => item.wishlistId === wishlistId && item.recipientId === user?.id,
    );
  };

  // Associate community names with wishlists
  const wishlistsWithCommunityNames = communityWishlists.map((wishlist) => {
    const community = communities.find((c) => c.id === wishlist.communityId);
    return {
      ...wishlist,
      communityName: community?.name || "Unknown Community",
    };
  });

  // Check if wishlist has already been fulfilled by the current user
  const userHasOfferedToFulfill = (wishlist: Wishlist) => {
    // Filter items that were created to fulfill wishlists
    const wishlistOffers = userItems.filter((item) => item.wishlistId);

    // Check if any item fulfills this specific wishlist
    return wishlistOffers.some((item) => item.wishlistId === wishlist.id);
  };

  const onFulfillWishlist = async (wishlist: Wishlist) => {
    try {
      // Simulate API call to fulfill wishlist.  Replace with actual API call
      await new Promise((resolve) => setTimeout(resolve, 500)); // Simulate delay
      setFulfilledWishlistUsers([...fulfilledWishlistUsers, wishlist.userId]);
      setSelectedWishlist(wishlist);
      setCreateItemDialogOpen(true);
    } catch (error) {
      console.error("Error fulfilling wishlist:", error);
      // Add error handling as needed
    }
  };

  // Format date to readable format
  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return "Unknown date";
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      return "Invalid date";
    }
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(date);
  };

  // View wishlist details
  const viewWishlistDetails = (wishlist: Wishlist) => {
    setSelectedWishlist(wishlist);
    setDetailsDialogOpen(true);
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center p-8">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (communityWishlists.length === 0) {
    return (
      <Card className="p-6 text-center border-none">
        <p>No wishlist items found in your communities.</p>
      </Card>
    );
  }

  // Determine urgency color
  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case "high":
        return "bg-red-100 text-red-800 border-red-200";
      case "normal":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "low":
        return "bg-green-100 text-green-800 border-green-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {wishlistsWithCommunityNames.map((wishlist, index) => (
          <FadeIn key={wishlist.id} delay={index * 0.1}>
            <Card
              className="overflow-hidden flex flex-col h-full cursor-pointer hover:ring-1 hover:ring-primary/20 hover:shadow-md transition-all p-1 focus:outline-none focus:ring-2 focus:ring-primary"
              onClick={() => viewWishlistDetails(wishlist)}
              onKeyDown={(e) =>
                e.key === "Enter" && viewWishlistDetails(wishlist)
              }
              role="button"
              tabIndex={0}
              aria-label={`View wishlist: ${wishlist.title}`}
            >
              <CardHeader className="pb-4 pt-4">
                <CardTitle className="font-semibold text-base mb-1 flex items-center gap-2">
                  {wishlist.title}
                  {wishlist.isPrivate && (
                    <Lock className="h-4 w-4 text-muted-foreground" />
                  )}
                </CardTitle>
                <CardDescription>
                  <div className="flex items-center gap-2">
                    <span>{wishlist.communityMascot || "🏠"}</span>
                    <span>Requested on {formatDate(wishlist.createdAt)}</span>
                  </div>
                </CardDescription>
              </CardHeader>

              <CardFooter className="pt-3 pb-3 flex items-center justify-between text-xs text-muted-foreground">
                {userHasOfferedToFulfill(wishlist.userId) && (
                  <Badge variant="outline" className="text-xs">
                    <Check className="h-3 w-3 mr-1" />
                    Offer sent
                  </Badge>
                )}
              </CardFooter>
            </Card>
          </FadeIn>
        ))}
      </div>

      {/* Wishlist Details Dialog */}
      <WishlistDetailsDialog
        wishlist={selectedWishlist}
        open={detailsDialogOpen}
        onOpenChange={setDetailsDialogOpen}
        showFulfillButton={true}
        onFulfill={() =>
          selectedWishlist && onFulfillWishlist(selectedWishlist)
        }
        userHasOfferedToFulfill={userHasOfferedToFulfill}
        currentUserId={currentUserId}
      />

      {/* Fulfill Wishlist Dialog */}
      <FulfillWishlistDialog
        open={createItemDialogOpen}
        onClose={() => setCreateItemDialogOpen(false)}
        wishlist={selectedWishlist}
      />
    </div>
  );
}
