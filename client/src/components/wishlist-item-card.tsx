
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Wishlist } from "@shared/schema";
import { useAuth } from "@/features/auth/hooks/use-auth";
import FulfillWishlistItem from "./fulfill-wishlist-item";

interface WishlistItemCardProps {
  wishlist: Wishlist;
}

export default function WishlistItemCard({ wishlist }: WishlistItemCardProps) {
  const { user } = useAuth();
  const [fulfillDialogOpen, setFulfillDialogOpen] = useState(false);
  
  // Don't show fulfill button if this is the user's own wishlist
  const isOwnWishlist = user?.id === wishlist.userId;
  
  return (
    <Card className="h-full flex flex-col">
      <CardHeader>
        <CardTitle className="line-clamp-2">{wishlist.title}</CardTitle>
        <div className="text-sm text-muted-foreground">
          Budget: {wishlist.budget ? `$${(wishlist.budget / 100).toFixed(2)}` : "Not specified"}
        </div>
        <div className="text-sm">
          Urgency: <span className="capitalize">{wishlist.urgency || "Normal"}</span>
        </div>
      </CardHeader>
      <CardContent className="flex-grow">
        <p className="text-sm mb-4 line-clamp-3">
          {wishlist.description || "No description provided."}
        </p>
        
        {!isOwnWishlist && (
          <Button 
            onClick={() => setFulfillDialogOpen(true)}
            className="w-full"
          >
            Fulfill This Wish
          </Button>
        )}
      </CardContent>
      
      {fulfillDialogOpen && (
        <FulfillWishlistItem
          wishlist={wishlist}
          communityId={wishlist.communityId}
          isOpen={fulfillDialogOpen}
          onClose={() => setFulfillDialogOpen(false)}
        />
      )}
    </Card>
  );
}
