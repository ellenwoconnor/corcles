import { useState } from "react";
import { useAuth } from "@/features/auth/hooks/use-auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Item, ItemRequest, ItemBid } from "@shared/schema";
import { useRoute } from "wouter";
import { formatDistanceToNow, format } from "date-fns";
import { Loader2, Pencil, Clock } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Alert, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";

import Navbar from "@/components/navbar";
import EditListingDialog from "@/components/edit-listing-dialog";
import RequestsList from "@/components/requests-list";
import BidsList from "@/components/bids-list";
import PickupScheduler from "@/components/pickup-scheduler";
import PickupConfirmation from "@/components/pickup-confirmation";
import RequestForm from "@/components/request-form";
import BidForm from "@/components/bid-form";

// Form schemas
const requestSchema = z.object({
  message: z.string().optional(),
});

const bidSchema = z.object({
  amount: z.number().min(1, "Bid amount must be greater than 0"),
  message: z.string().optional(),
});

export default function ListingPage() {
  // Routing and auth
  const [, params] = useRoute("/item/:id");
  const { user } = useAuth();
  const { toast } = useToast();
  const [requestDialogOpen, setRequestDialogOpen] = useState(false);

  // Item data query
  const { data: item, isLoading, error } = useQuery<Item & { userHasFavorited?: boolean }>({
    queryKey: [`/api/items/${params?.id}`],
    enabled: !!params?.id,
    select: (data) => ({
      ...data,
      createdAt: new Date(data.createdAt),
    }),
  });

  const isOwner = item?.userId === user?.id;

  // Requests and bids queries
  const { data: requests } = useQuery<ItemRequest[]>({
    queryKey: [isOwner ? `/api/items/${params?.id}/requests` : `/api/items/${params?.id}/my-requests`],
    enabled: !!params?.id && !!user,
  });

  const { data: bids } = useQuery<ItemBid[]>({
    queryKey: [`/api/items/${params?.id}/bids`],
    enabled: !!params?.id && !!user,
  });

  const hasRequested = requests?.some((request) => request.status === "pending");
  const hasBid = bids?.some((bid) => bid.status === "pending");


  // Drawing mutation
  const drawingMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", `/api/items/${params?.id}/draw`);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to perform drawing");
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Drawing complete!",
        description: "A recipient has been randomly selected.",
      });
      queryClient.invalidateQueries({ queryKey: [`/api/items/${params?.id}`] });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to perform drawing",
        description: error.message,
        variant: "destructive",
      });
    },
  });

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
                  <p className="text-2xl font-bold text-primary">${item.price}</p>
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
              <p className="font-medium">Listed by {item.userDisplayName || 'Anonymous'}</p>
              <p className="text-sm text-muted-foreground">
                {formatDistanceToNow(item.createdAt, {
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

            {/* Pickup Confirmation Alert */}
            {requests?.some(r => r.status === "awaiting_pickup_confirmation") && (
              <div className="mb-4">
                <Alert>
                  <Clock className="h-4 w-4" />
                  <AlertTitle>Pickup Confirmation Pending</AlertTitle>
                </Alert>
              </div>
            )}

            {/* Owner View */}
            {isOwner ? (
              <div className="border-t border-border pt-3 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-medium">
                    {item.isGift ? "Requests" : "Bids"}
                  </h3>
                  {item.isGift && requests && requests.length > 0 && (
                    <span className="text-sm text-muted-foreground">
                      {requests.length} {requests.length === 1 ? 'request' : 'requests'}
                    </span>
                  )}
                </div>
                <div className="space-y-2">
                  {item.isGift ? (
                    <RequestsList itemId={item.id} />
                  ) : (
                    <BidsList itemId={item.id} />
                  )}
                </div>
              </div>
            ) : (
              /* Buyer View */
              <div className="flex gap-4">
                {item.isGift ? (
                  requests?.some(r => r.status === "awaiting_pickup_confirmation") ? (
                    <PickupConfirmation
                      item={item}
                      request={requests.find(r => r.status === "awaiting_pickup_confirmation")!}
                    />
                  ) : !item.recipientId ? (
                    <RequestForm
                      itemId={item.id}
                      hasRequested={hasRequested}
                      isOpen={requestDialogOpen}
                      onOpenChange={setRequestDialogOpen}
                    />
                  ) : null
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

            {/* Owner Pickup Management */}
            {isOwner && item.isGift && (
              <div className="border-t border-border pt-4 space-y-4">
                {item.recipientId ? (
                  <div className="space-y-4">
                    {/* Selected Recipient */}
                    <div className="space-y-2">
                      <h3 className="font-medium">Selected Recipient</h3>
                      <p className="text-sm text-muted-foreground">
                        A recipient has been selected through random drawing
                      </p>
                    </div>

                    {/* Pickup Window */}
                    <div className="space-y-2">
                      <h3 className="font-medium">Pickup Window</h3>
                      {item.pickupStart ? (
                        <div>
                          <p className="text-sm text-muted-foreground">
                            {format(new Date(item.pickupStart), "PPP p")} -{" "}
                            {format(new Date(item.pickupEnd!), "p")}
                          </p>
                          {requests?.some(r => r.status === "awaiting_pickup_confirmation") && (
                            <Alert className="mt-2">
                              <AlertTitle>Awaiting Confirmation</AlertTitle>
                            </Alert>
                          )}
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <p className="text-sm text-muted-foreground">
                            Set a pickup window for the recipient
                          </p>
                          <PickupScheduler
                            itemId={item.id}
                            onScheduled={() => {
                              queryClient.invalidateQueries({ queryKey: [`/api/items/${params?.id}`] });
                            }}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {requests && requests.filter((r) => r.status === "pending").length > 0 && !item.pickupStart && (
                      <div className="space-y-2">
                        <h3 className="font-medium">Schedule Pickup</h3>
                        <p className="text-sm text-muted-foreground mb-4">
                          First, set a one-hour window for item pickup. Then you can select a recipient.
                        </p>
                        <PickupScheduler
                          itemId={item.id}
                          onScheduled={() => {
                            queryClient.invalidateQueries({ queryKey: [`/api/items/${params?.id}`] });
                          }}
                        />
                      </div>
                    )}
                    {item.pickupStart && (
                      <>
                        <div className="space-y-2">
                          <h3 className="font-medium">Scheduled Pickup Window</h3>
                          <p className="text-sm text-muted-foreground">
                            {format(new Date(item.pickupStart), "PPP p")} -{" "}
                            {format(new Date(item.pickupEnd!), "p")}
                          </p>
                        </div>
                        {requests && requests.filter((r) => r.status === "ready_for_drawing").length > 0 && (
                          <>
                            <p className="text-sm text-muted-foreground">
                              Ready to select from {requests.filter((r) => r.status === "ready_for_drawing").length} requests
                            </p>
                            <Button
                              onClick={() => drawingMutation.mutate()}
                              disabled={drawingMutation.isPending}
                            >
                              {drawingMutation.isPending ? (
                                <>
                                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                  Drawing...
                                </>
                              ) : (
                                "Select Random Recipient"
                              )}
                            </Button>
                          </>
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}