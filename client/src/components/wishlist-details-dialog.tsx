
import { Lock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatDate } from "@/lib/utils";
import { type Wishlist } from "@shared/schema";

interface WishlistDetailsDialogProps {
  wishlist: Wishlist | null;
  open: boolean;
  onOpenChange?: (open: boolean) => void;
  onClose?: () => void;
  showFulfillButton?: boolean;
  onFulfill?: () => void;
  userHasOfferedToFulfill?: (userId: number) => boolean;
  currentUserId?: number;
}

export default function WishlistDetailsDialog({
  wishlist,
  open,
  onOpenChange,
  showFulfillButton,
  onFulfill,
  userHasOfferedToFulfill,
  currentUserId,
}: WishlistDetailsDialogProps) {
  const { data: allItems = [] } = useQuery<any[]>({
    queryKey: ["/api/items", wishlist?.id],
    enabled: !!wishlist,
    queryFn: async () => {
      const response = await fetch(`/api/items?wishlistId=${wishlist?.id}`);
      if (!response.ok) return [];
      return response.json();
    }
  });

  // Filter offers based on wishlist and user role
  const relevantOffers = allItems.filter(item => {
    if (!wishlist || !currentUserId) return false;
    
    // If current user is wishlist owner, show all offers
    if (currentUserId === wishlist.userId) {
      return item.wishlistId === wishlist.id;
    }
    
    // If current user is offering, show only their offers
    return item.wishlistId === wishlist.id && item.userId === currentUserId;
  });

  return (
    <Dialog 
      open={open} 
      onOpenChange={(value) => {
        if (onOpenChange) onOpenChange(value);
      }}
    >
      <DialogContent className="overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {wishlist?.title}
            {wishlist?.isPrivate && (
              <Lock className="h-4 w-4 text-muted-foreground" />
            )}
          </DialogTitle>
          <DialogDescription>
            {wishlist?.userDisplayName && `By ${wishlist.userDisplayName} `}
            {wishlist?.communityName && `in ${wishlist.communityName}`}
            <div>Posted {wishlist && formatDate(wishlist.createdAt)}</div>
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {wishlist?.budget && (
              <Badge variant="outline">
                Budget: ${wishlist.budget}
              </Badge>
            )}
          </div>

          <div className="border-t pt-4">
            <h4 className="font-medium mb-2">Description</h4>
            <p className="text-muted-foreground whitespace-pre-wrap">
              {wishlist?.description || "No description provided"}
            </p>
          </div>

          {relevantOffers.length > 0 && (
            <div className="border-t pt-4">
              <h4 className="font-medium mb-2">Offers</h4>
              <div className="space-y-2">
                {relevantOffers.map((offer) => (
                  <div key={offer.id} className="flex items-center gap-2 p-2 rounded border">
                    <img src={offer.imageUrl} alt={offer.title} className="w-12 h-12 rounded object-cover" />
                    <div>
                      <div className="font-medium">{offer.title}</div>
                      <div className="text-sm text-muted-foreground">
                        {currentUserId === wishlist?.userId ? `Offered by ${offer.userDisplayName}` : 'Your offer'}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {showFulfillButton && (
            <div className="border-t pt-4">
              <Button
                disabled={
                  wishlist &&
                  userHasOfferedToFulfill?.(wishlist.userId)
                }
                onClick={() => {
                  onOpenChange(false);
                  if (wishlist && onFulfill) {
                    onFulfill();
                  }
                }}
              >
                {wishlist &&
                userHasOfferedToFulfill?.(wishlist.userId) ? (
                  "Already Fulfilled"
                ) : (
                  <>Fulfill This Wishlist</>
                )}
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
