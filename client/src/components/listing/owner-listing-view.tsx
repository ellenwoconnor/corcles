import { ItemRequest } from "@shared/schema";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { Clock, Pencil, MapPin, Trash2, UserCheck } from "lucide-react";
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
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { Item, ItemBid } from "@shared/schema";
import BaseListingView from "./base-listing-view";
import { apiRequest } from "@/lib/queryClient";
import { formatDistanceToNow } from "date-fns";

interface OwnerListingViewProps {
  item: Item;
  requests: ItemRequest[];
  bids: ItemBid[];
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
  const canSchedule = hasRequests && !isDelisted;
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

  async function handleDelist() {
    try {
      await apiRequest(`/api/items/${item.id}/delist`, {
        method: "POST",
      });
      queryClient.invalidateQueries([`/api/items/${item.id}`]);
      toast({
        title: "Item delisted",
        description: "Your item has been delisted successfully.",
      });
      navigate("/");
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delist item. Please try again.",
        variant: "destructive",
      });
    }
  }

  return (
    <div>
      <BaseListingView item={item} isOwner={true}>
        <div className="space-y-6">
          {!isDelisted && (
            <div className="flex flex-wrap gap-3">
              <EditListingDialog item={item} />
              <Button variant="destructive" onClick={handleDelist}>
                Delist Item
              </Button>
            </div>
          )}
        </div>
        {hasRequests && (
          <div className="border rounded-md p-4 bg-green-50 border-green-200 mb-4">
            <h2 className="text-lg font-medium mb-2 flex items-center gap-2">
              <UserCheck className="h-5 w-5 text-green-600" />
              <span>Requests Pending</span>
            </h2>
            <p className="text-sm mb-3">
              You have {requests.length} active requests for this item.
            </p>
          </div>
        )}
      </BaseListingView>

      {hasBids && (
        <div>
          <h2 className="font-medium mb-2">Bids ({bids.length})</h2>
          <div className="space-y-3">
            {bids.map((bid) => (
              <div
                key={bid.id}
                className="p-4 border rounded-lg flex items-center justify-between"
              >
                <div>
                  <p className="font-medium">${bid.amount}</p>
                  <p className="text-sm text-muted-foreground">
                    {formatDistanceToNow(new Date(bid.createdAt), {
                      addSuffix: true,
                    })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {canSchedule && (
        <div className="border rounded-md mt-5 p-4 mb-4">
          <h2 className="text-lg font-medium mb-2 flex items-center gap-2">
            Schedule pickup
          </h2>
          <p className="flex gap-1">
            This item is pending pickup at <MapPin className="h-4 w-4" />
            {item.pickupLocation}.
          </p>
          <div className="flex items-center gap-4 pt-4">
            <PickupScheduler
              itemId={item.id}
              itemStatus={item.status}
              onScheduled={() => {
                queryClient.invalidateQueries([`/api/items/${item.id}`]);
                queryClient.invalidateQueries([`/api/items/${item.id}/requests`]);
              }}
            />
            {hasRecipient && activeRequest && (
              <CancelButton
                itemId={item.id}
                requestId={activeRequest.id}
                variant="outline"
              />
            )}
            {hasRecipient && activeRequest && (
              <MessageDialog
                requestId={activeRequest.id}
                currentUserId={currentUserId}
                recipientId={item.recipientId}
                isOpen={messageDialogOpen}
                onOpenChange={setMessageDialogOpen}
                trigger={<Button variant="outline">Send Message</Button>}
              />
            )}
          </div>

          {/* {hasRecipient && activeRequest && (
            <div className="flex items-center gap-4">
              <CancelButton
                itemId={item.id}
                requestId={activeRequest.id}
                variant="outline"
              />
              <MessageDialog
                requestId={activeRequest.id}
                currentUserId={currentUserId}
                recipientId={item.recipientId}
                isOpen={messageDialogOpen}
                onOpenChange={setMessageDialogOpen}
                trigger={<Button variant="outline">Send Message</Button>}
              />
            </div>
          )} */}
        </div>
      )}
    </div>
  );
}
