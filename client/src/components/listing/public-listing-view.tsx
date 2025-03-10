import { Item } from "@shared/schema";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";
import RequestForm from "@/components/request-form";
import BidForm from "@/components/bid-form";
import { useState } from "react";
import { Button } from "@/components/ui/button";

interface PublicListingViewProps {
  item: Item & { userHasFavorited?: boolean };
  currentUserId: number;
  hasRequested?: boolean;
  hasBid?: boolean;
}

export default function PublicListingView({ 
  item, 
  currentUserId,
  hasRequested = false,
  hasBid = false 
}: PublicListingViewProps) {
  const [requestDialogOpen, setRequestDialogOpen] = useState(false);

  // Don't show request/bid buttons if the user is the owner
  const isOwner = currentUserId === item.userId;

  return (
    <div className="grid md:grid-cols-2 gap-8">
      {/* Item Image */}
      <div>
        <img
          src={item.imageUrl}
          alt={item.title}
          className="w-full rounded-lg object-cover aspect-square"
        />
      </div>

      {/* Item Details */}
      <div className="space-y-6">
        {/* Header Section */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight mb-2">
            {item.title}
          </h1>
          <div className="flex items-center gap-4">
            {item.isGift ? (
              <div className="inline-block bg-primary text-primary-foreground px-3 py-1 rounded-full text-sm font-medium">
                Free
              </div>
            ) : (
              <p className="text-2xl font-bold text-primary">
                ${item.price}
              </p>
            )}
          </div>
        </div>

        {/* User Info */}
        <div>
          <p className="font-medium">
            Listed by {item.userDisplayName || "Anonymous"}
          </p>
          <p className="text-sm text-muted-foreground">
            {formatDistanceToNow(new Date(item.createdAt), {
              addSuffix: true,
            })}
          </p>
        </div>

        {/* Description */}
        <div className="border-t border-border pt-4">
          <p className="text-muted-foreground whitespace-pre-wrap">
            {item.description}
          </p>
        </div>

        {/* Action Button */}
        {!isOwner && (
          <div className="flex gap-4">
            {item.isGift ? (
              hasRequested ? (
                <Button variant="secondary" disabled>
                  Requested
                </Button>
              ) : (
                <RequestForm
                  itemId={item.id}
                  itemOwnerId={item.userId}
                  hasRequested={hasRequested}
                  isOpen={requestDialogOpen}
                  onOpenChange={setRequestDialogOpen}
                />
              )
            ) : (
              <BidForm
                itemId={item.id}
                hasBid={hasBid}
                isOpen={requestDialogOpen}
                onOpenChange={setRequestDialogOpen}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}