import { ItemRequest } from "@shared/schema";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { Clock, Pencil, MapPin } from "lucide-react";
import { EditListingDialog } from "@/components/edit-listing-dialog";
import RequestsList from "@/components/requests-list";
import BidsList from "@/components/bids-list";
import PickupScheduler from "@/components/pickup-scheduler";
import { MessageDialog } from "@/components/message-dialog";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { CancelButton } from "@/components/cancel-button";
import { ExtendedItem } from "@/pages/listing-page";
import { useQueryClient, useMutation, useQuery } from "@tanstack/react-query";
import { DelistButton } from "@/components/delist-button";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { UserCheck } from "lucide-react";


interface OwnerListingViewProps {
  item: ExtendedItem;
  requests: (ItemRequest & { userId?: number })[];
  bids?: any[];
  currentUserId: number;
}

const TIME_DISPLAY_CLASS = "p-3 bg-secondary rounded-lg border border-border";

export default function OwnerListingView({
  item,
  requests,
  bids = [],
  currentUserId,
}: OwnerListingViewProps) {
  const [messageDialogOpen, setMessageDialogOpen] = useState(false);
  const queryClient = useQueryClient();
  const [, navigate] = useLocation();
  const { toast } = useToast();

  const isDelisted = item.status === "delisted";
  const hasRequests = requests.length > 0;
  const hasRecipient = !!item.recipientId;
  const canDraw = hasRequests && !hasRecipient && item.isGift && !isDelisted;
  const canSchedule = hasRequests && !hasRecipient && !isDelisted;
  const hasBids = bids.length > 0;

  const activeRequest = item.recipientId
    ? requests.find((r) => r.requesterId === item.recipientId)
    : requests.find((r) =>
        [
          "pending",
          "accepted",
          "awaiting_pickup_confirmation",
          "scheduled",
        ].includes(r.status),
      );

  const showPickupScheduler = ["requested", "scheduling", "scheduled"].includes(
    item.status || "",
  );
  const showMessageAndCancel = ["scheduling", "scheduled"].includes(
    item.status || "",
  );

  const deleteItemMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("DELETE", `/api/items/${item.id}`);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to delete item");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/items"] });
      queryClient.invalidateQueries({ queryKey: ["/api/user/items"] });
      toast({
        title: "Item deleted",
        description: "Your item has been deleted successfully.",
      });
      navigate("/");
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Could not delete item",
      });
    },
  });

  const statusText = {
    completed: "Transaction Complete",
    scheduled: "Pickup Scheduled",
    scheduling: "Setting Pickup Time",
    requested: "Requests Received",
    available: "Available",
    delisted: "Delisted",
    pending_pickup: "Pending Pickup",
  };

  // Check if this item is a wishlist fulfillment
  const isWishlistFulfillment = item.wishlistId && item.recipientId;

  // Get wishlist information if this item is fulfilling a wishlist
  const { data: wishlist } = useQuery({
    queryKey: [`/api/wishlists/${item.wishlistId}`],
    enabled: !!item.wishlistId,
  });

  const recipientUsername = "Unknown"; // Placeholder, replace with actual fetching logic

  return (
    <div className="grid md:grid-cols-2 gap-8">
      <div>
        <img
          src={item.imageUrl}
          alt={item.title}
          className="w-full rounded-lg object-cover aspect-square"
        />
      </div>

      <div className="flex flex-col gap-4">
        <div>
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold tracking-tight">{item.title}</h1>
            <div className="flex items-center gap-2">
              {isWishlistFulfillment && (
                <Badge
                  variant="outline"
                  className="bg-green-50 text-green-700 border-green-200"
                >
                  Wishlist Fulfillment
                </Badge>
              )}
              <Badge
                variant={
                  item.status === "pending_pickup" ||
                  item.status === "scheduled"
                    ? "outline"
                    : "secondary"
                }
                className="text-sm h-6 px-2 font-normal"
              >
                {statusText[item.status]}
              </Badge>
            </div>
          </div>
          {item.isGift ? (
            <Badge className="mt-2">Free</Badge>
          ) : (
            <p className="text-2xl font-bold mt-2">${item.price}</p>
          )}
        </div>

        {isDelisted && (
          <div className="p-4 bg-muted rounded-lg border border-muted-foreground/20">
            <h3 className="font-medium mb-2 text-muted-foreground">
              This item has been delisted
            </h3>
            <p className="text-sm text-muted-foreground">
              Delisted items cannot be edited or requested by users.
            </p>
          </div>
        )}

        {item.pickupLocation && (
          <div className="flex gap-2 items-center text-sm text-muted-foreground">
            <MapPin className="h-4 w-4" />
            <span>{item.pickupLocation}</span>
          </div>
        )}

        {item.pickupStart && item.pickupEnd && (
          <div className="border border-border rounded-lg overflow-hidden">
            <div className="bg-muted px-4 py-2 border-b border-border">
              <h3 className="font-medium">Pickup Time</h3>
            </div>
            <div className="p-4 flex flex-col gap-3">
              <div className="text-sm flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span>
                  {format(new Date(item.pickupStart), "EEEE, MMMM d")} at{" "}
                  {format(new Date(item.pickupStart), "h:mm a")} -{" "}
                  {format(new Date(item.pickupEnd), "h:mm a")}
                </span>
              </div>
            </div>
          </div>
        )}

        {showPickupScheduler && (
          <div className="border border-border rounded-lg overflow-hidden">
            <div className="bg-muted px-4 py-2 border-b border-border">
              <h3 className="font-medium">
                {activeRequest
                  ? "Active Request"
                  : hasRequests
                  ? `Requests (${requests.length})`
                  : "No Requests Yet"}
              </h3>
            </div>
            <div className="p-4">
              {hasRecipient && activeRequest ? (
                <div className="flex flex-col gap-3">
                  <p className="text-sm">
                    Request from{" "}
                    <span className="font-medium">
                      {activeRequest.requesterId}
                    </span>
                  </p>
                  {showMessageAndCancel && (
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setMessageDialogOpen(true)}
                      >
                        Message
                      </Button>
                      <CancelButton
                        itemId={item.id}
                        requestId={activeRequest.id}
                      />
                    </div>
                  )}
                </div>
              ) : hasRequests && canSchedule ? (
                <PickupScheduler
                  itemId={item.id}
                  recipientId={requests[0].requesterId}
                />
              ) : hasRequests && canDraw ? (
                <RequestsList
                  itemId={item.id}
                  requests={requests}
                  currentUserId={currentUserId}
                />
              ) : hasRequests ? (
                <RequestsList
                  itemId={item.id}
                  requests={requests}
                  currentUserId={currentUserId}
                />
              ) : (
                <p className="text-sm text-muted-foreground">
                  No requests for this item yet.
                </p>
              )}
            </div>
          </div>
        )}

        {!item.isGift && (
          <div className="border border-border rounded-lg overflow-hidden">
            <div className="bg-muted px-4 py-2 border-b border-border">
              <h3 className="font-medium">
                {hasBids ? `Bids (${bids.length})` : "No Bids Yet"}
              </h3>
            </div>
            <div className="p-4">
              {hasBids ? (
                <BidsList bids={bids} currentUserId={currentUserId} />
              ) : (
                <p className="text-sm text-muted-foreground">
                  No bids for this item yet.
                </p>
              )}
            </div>
          </div>
        )}

        <div className="border-t border-border pt-4">
          <p className="text-muted-foreground whitespace-pre-wrap">
            {item.description}
          </p>
        </div>

        {!isDelisted && (
          <div className="flex gap-2 mt-auto pt-4">
            <EditListingDialog item={item} />
            <DelistButton itemId={item.id} />
          </div>
        )}

        {item.recipientId && (
          <div className="border rounded-md p-4 bg-green-50 border-green-200 mb-4">
            <h2 className="text-lg font-medium mb-2 flex items-center gap-2">
              <UserCheck className="h-5 w-5 text-green-600" />
              <span>Recipient Selected</span>
            </h2>
            <p className="text-sm mb-3">
              This item is being given to{" "}
              <span className="font-medium">{recipientUsername}</span>
              {item.wishlistId && wishlist && (
                <span className="ml-1">
                  for their wishlist "
                  <span className="font-medium">{wishlist.title}</span>"
                </span>
              )}
            </p>
            {item.pickupStart && (
              <div className="mt-3 p-3 bg-white rounded-sm border border-green-100">
                <h4 className="text-sm font-medium mb-1">Pickup Time</h4>
                <p className="text-sm text-muted-foreground">
                  {format(new Date(item.pickupStart), "EEEE, MMMM d")} at{" "}
                  {format(new Date(item.pickupStart), "h:mm a")} -{" "}
                  {format(new Date(item.pickupEnd!), "h:mm a")}
                </p>
              </div>
            )}
          </div>
        )}

        {activeRequest && (
          <MessageDialog
            recipientId={activeRequest.requesterId}
            requestId={activeRequest.id}
            open={messageDialogOpen}
            onOpenChange={setMessageDialogOpen}
          />
        )}
      </div>
    </div>
  );
}