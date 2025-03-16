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
import { Gift, Clock, User, Lock } from "lucide-react";
import FulfillWishlistDialog from "./fulfill-wishlist-dialog";
import { motion } from "framer-motion"; //Import Framer Motion

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

  // Get user items to check if they've already fulfilled wishlists
  const { data: userItems = [] } = useQuery<any[]>({
    queryKey: ["/api/user/items"],
    enabled: !!user,
  });

  // Filter items that were created to fulfill wishlists (those with recipients)
  const fulfilledWishlistItems = userItems.filter((item) => item.recipientId);

  // Associate community names with wishlists
  const wishlistsWithCommunityNames = communityWishlists.map((wishlist) => {
    const community = communities.find((c) => c.id === wishlist.communityId);
    return {
      ...wishlist,
      communityName: community?.name || "Unknown Community",
    };
  });

  // Check if wishlist has already been fulfilled by the current user
  const hasUserFulfilledWishlist = (wishlistUserId: number) => {
    // Check local state first
    if (fulfilledWishlistUsers.includes(wishlistUserId)) {
      return true;
    }
    return fulfilledWishlistItems.some(
      (item) => item.recipientId === wishlistUserId,
    );
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
              className="overflow-hidden flex flex-col h-full cursor-pointer hover:ring-1 hover:ring-primary/20 transition-all p-1"
              onClick={() => viewWishlistDetails(wishlist)}
            >
              <CardHeader className="pb-4 pt-4">
                <CardTitle className="text-lg flex items-center gap-2">
                  {wishlist.title}
                  {wishlist.isPrivate && (
                    <Lock className="h-4 w-4 text-muted-foreground" />
                  )}
                </CardTitle>
                <CardDescription className="flex items-center gap-1 text-xs">
                  <User className="h-3 w-3" />
                  <span>
                    {wishlist.userDisplayName || "Anonymous"} in{" "}
                    {wishlist.communityName} {wishlist.communityMascot || "🏠"}
                  </span>
                </CardDescription>
              </CardHeader>

              <CardFooter className="pt-3 pb-3 flex items-center justify-between text-xs text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {formatDate(wishlist.createdAt)}
                </div>

                {hasUserFulfilledWishlist(wishlist.userId) && (
                  <Badge variant="outline" className="text-xs">
                    <Gift className="h-3 w-3 mr-1" />
                    Fulfilled
                  </Badge>
                )}
              </CardFooter>
            </Card>
          </FadeIn>
        ))}
      </div>

      {/* Wishlist Details Dialog */}
      <Dialog open={detailsDialogOpen} onOpenChange={setDetailsDialogOpen}>
        <DialogContent className="sm:max-w-[525px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedWishlist?.title}
              {selectedWishlist?.isPrivate && (
                <Lock className="h-4 w-4 text-muted-foreground" />
              )}
            </DialogTitle>
            <DialogDescription>
              By {selectedWishlist?.userName || "Anonymous"} in{" "}
              {selectedWishlist?.communityName}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5 mt-2">
            <div className="flex flex-wrap gap-2">
              {selectedWishlist?.urgency && (
                <Badge
                  className={`${getUrgencyColor(selectedWishlist.urgency)} border`}
                >
                  {selectedWishlist.urgency.charAt(0).toUpperCase() +
                    selectedWishlist.urgency.slice(1)}{" "}
                  Priority
                </Badge>
              )}

              {selectedWishlist?.budget && (
                <Badge variant="outline">
                  Budget: ${selectedWishlist.budget}
                </Badge>
              )}

              <Badge variant="outline" className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                Added {formatDate(selectedWishlist?.createdAt || "")}
              </Badge>
            </div>

            <div className="border-t pt-4">
              <h4 className="font-medium mb-2">Description</h4>
              <p className="text-muted-foreground whitespace-pre-wrap">
                {selectedWishlist?.description || "No description provided"}
              </p>
            </div>

            <div className="border-t pt-4">
              <div className="flex justify-between items-center">
                <div>
                  <h4 className="font-medium">Status</h4>
                  <p className="text-sm text-muted-foreground mt-1">
                    {selectedWishlist &&
                    hasUserFulfilledWishlist(selectedWishlist.userId)
                      ? "You've already fulfilled this wishlist"
                      : "You can help fulfill this wishlist"}
                  </p>
                </div>
                <Button
                  disabled={
                    selectedWishlist
                      ? hasUserFulfilledWishlist(selectedWishlist.userId)
                      : false
                  }
                  onClick={() => {
                    setDetailsDialogOpen(false);
                    if (selectedWishlist) {
                      onFulfillWishlist(selectedWishlist);
                    }
                  }}
                >
                  {selectedWishlist &&
                  hasUserFulfilledWishlist(selectedWishlist.userId) ? (
                    "Already Fulfilled"
                  ) : (
                    <>
                      <Gift className="h-4 w-4 mr-2" />
                      Fulfill This Wishlist
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Fulfill Wishlist Dialog */}
      <FulfillWishlistDialog
        open={createItemDialogOpen}
        onClose={() => setCreateItemDialogOpen(false)}
        wishlist={selectedWishlist}
      />
    </div>
  );
}
