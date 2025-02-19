import { useState, useEffect } from "react";
import { useAuth } from "@/features/auth/hooks/use-auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Item, ItemRequest, ItemBid } from "@shared/schema";
import { useRoute } from "wouter";
import { formatDistanceToNow, format } from "date-fns";
import { Loader2, Pencil } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Alert, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

import Navbar from "@/components/navbar";
import EditListingDialog from "@/components/edit-listing-dialog";
import RequestsList from "@/components/requests-list";
import BidsList from "@/components/bids-list";
import PickupSchedulingContainer from "@/components/pickup-scheduling-container";
import RequestForm from "@/components/request-form";
import BidForm from "@/components/bid-form";
import PickupScheduler from "@/components/pickup-scheduler";
import { MessageDialog } from "@/components/message-dialog";

type ItemStatus = "available" | "requested" | "scheduling" | "scheduled";

export default function ListingPage() {
  const [, params] = useRoute("/item/:id");
  const { user } = useAuth();
  const { toast } = useToast();
  const [requestDialogOpen, setRequestDialogOpen] = useState(false);

  // Item data query
  const {
    data: item,
    isLoading,
    error,
  } = useQuery<Item>({
    queryKey: [`/api/items/${params?.id}`],
    enabled: !!params?.id,
    select: (data) => ({
      ...data,
      createdAt: new Date(data.createdAt),
      pickupStart: data.pickupStart ? new Date(data.pickupStart) : null,
      pickupEnd: data.pickupEnd ? new Date(data.pickupEnd) : null,
      proposedPickupWindows: data.proposedPickupWindows || [],
    }),
  });

  const isOwner = item?.userId === user?.id;

  // Requests and bids queries
  const { data: requests = [] } = useQuery<ItemRequest[]>({
    queryKey: [
      `/api/items/${params?.id}/${isOwner ? "requests" : "my-requests"}`,
    ],
    enabled: !!params?.id && !!user,
  });

  const { data: bids } = useQuery<ItemBid[]>({
    queryKey: [`/api/items/${params?.id}/bids`],
    enabled: !!params?.id && !!user && !item?.isGift,
  });

  // Determine item status based on requests
  const getItemStatus = (): ItemStatus => {
    if (!requests || requests.length === 0) return "available";

    // Find special status requests
    const acceptedRequest = requests.find(r => r.status === "accepted");
    const awaitingConfirmationRequest = requests.find(r => r.status === "awaiting_pickup_confirmation");
    const pendingRequests = requests.filter(r => r.status === "pending");

    // Return status based on request states
    if (acceptedRequest) return "scheduled";
    if (awaitingConfirmationRequest) return "scheduling";
    if (pendingRequests.length > 0) return "requested";
    return "available";
  };

  const itemStatus = getItemStatus();

  // Get relevant request based on status
  const activeRequest = (() => {
    if (itemStatus === "scheduled") {
      return requests.find(r => r.status === "accepted");
    }
    if (itemStatus === "scheduling") {
      return requests.find(r => r.status === "awaiting_pickup_confirmation");
    }
    return null;
  })();

  // Loading and error states
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-border" />
      </div>
    );
  }

  if (error || !item) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="container py-12">
          <div className="text-center">
            <h1 className="text-2xl font-bold">Item not found</h1>
            <p className="text-muted-foreground">
              The item you're looking for doesn't exist or has been removed.
            </p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container py-6">
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
                {isOwner && (
                  <EditListingDialog
                    item={item}
                    trigger={
                      <Button variant="outline" size="sm" className="gap-2">
                        <Pencil className="h-4 w-4" />
                        Edit Listing
                      </Button>
                    }
                  />
                )}
              </div>
            </div>

            {/* User Info */}
            <div>
              <p className="font-medium">
                Listed by {item.userDisplayName || "Anonymous"}
              </p>
              <p className="text-sm text-muted-foreground">
                {formatDistanceToNow(item.createdAt, { addSuffix: true })}
              </p>
            </div>

            {/* Description */}
            <div className="border-t border-border pt-4">
              <p className="text-muted-foreground whitespace-pre-wrap">
                {item.description}
              </p>
            </div>

            {/* Status Badge */}
            <div className="flex items-center gap-2">
              <Badge variant="secondary">
                {itemStatus === "available" && "Available"}
                {itemStatus === "requested" && "Requests Pending"}
                {itemStatus === "scheduling" && "Scheduling Pickup"}
                {itemStatus === "scheduled" && "Pickup Scheduled"}
              </Badge>
            </div>

            {/* Owner View */}
            {isOwner ? (
              <div className="border-t border-border pt-3 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-medium">
                    {item.isGift ? "Requests" : "Bids"}
                  </h3>
                  {item.isGift && requests.length > 0 && (
                    <Badge variant="secondary">
                      {requests.length} {requests.length === 1 ? "request" : "requests"}
                    </Badge>
                  )}
                </div>

                {/* Display Requests or Bids */}
                <div className="space-y-4">
                  {item.isGift ? (
                    <>
                      {/* Show requests list */}
                      <RequestsList
                        requests={requests}
                        currentUserId={user?.id}
                      />

                      {/* Status-specific components */}
                      {itemStatus === "requested" && (
                        <PickupScheduler
                          itemId={item.id}
                          onScheduled={() => {
                            queryClient.invalidateQueries({
                              queryKey: [`/api/items/${params?.id}`],
                            });
                          }}
                        />
                      )}

                      {(itemStatus === "scheduling" || itemStatus === "scheduled") && activeRequest && (
                        <>
                          <PickupSchedulingContainer
                            item={item}
                            requestId={activeRequest.id}
                            requesterId={activeRequest.requesterId}
                            onScheduled={() => {
                              queryClient.invalidateQueries({
                                queryKey: [`/api/items/${params?.id}`],
                              });
                            }}
                          />
                          <MessageDialog
                            requestId={activeRequest.id}
                            currentUserId={user.id}
                            otherPartyId={activeRequest.requesterId}
                            recipientId={activeRequest.requesterId}
                          />
                        </>
                      )}
                    </>
                  ) : (
                    <BidsList bids={bids || []} />
                  )}
                </div>
              </div>
            ) : (
              /* Buyer View */
              <div className="flex gap-4">
                {item.isGift ? (
                  itemStatus === "scheduling" || itemStatus === "scheduled" ? (
                    activeRequest && (
                      <>
                        <PickupSchedulingContainer
                          item={item}
                          requestId={activeRequest.id}
                          requesterId={user?.id || 0}
                          onScheduled={() => {
                            queryClient.invalidateQueries({
                              queryKey: [`/api/items/${params?.id}`],
                            });
                          }}
                        />
                        <MessageDialog
                          requestId={activeRequest.id}
                          currentUserId={user?.id || 0}
                          otherPartyId={item.userId}
                          recipientId={activeRequest.requesterId}
                        />
                      </>
                    )
                  ) : (
                    <RequestForm
                      itemId={item.id}
                      itemOwnerId={item.userId}
                      hasRequested={requests.length > 0}
                      isOpen={requestDialogOpen}
                      onOpenChange={setRequestDialogOpen}
                    />
                  )
                ) : (
                  <BidForm
                    itemId={item.id}
                    hasBid={bids?.some((bid) => bid.status === "pending")}
                    isOpen={requestDialogOpen}
                    onOpenChange={setRequestDialogOpen}
                  />
                )}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}