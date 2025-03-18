
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
}

export default function WishlistDetailsDialog({
  wishlist,
  open,
  onOpenChange,
  showFulfillButton,
  onFulfill,
  userHasOfferedToFulfill,
}: WishlistDetailsDialogProps) {
  return (
    <Dialog 
      open={open} 
      onOpenChange={(value) => {
        if (!value && onClose) onClose();
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
