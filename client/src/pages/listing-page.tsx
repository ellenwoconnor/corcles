import { useState, useEffect } from "react";
import { useAuth } from "@/features/auth/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { Item, ItemRequest, ItemBid } from "@shared/schema";
import { useRoute } from "wouter";
import { Loader2 } from "lucide-react";
import Navbar from "@/components/navbar";
import PublicListingView from "@/components/listing/public-listing-view";
import OwnerListingView from "@/components/listing/owner-listing-view";
import RecipientListingView from "@/components/listing/recipient-listing-view";

export default function ListingPage() {
  // Routing and auth
  const [, params] = useRoute("/item/:id");
  const { user } = useAuth();

  // Item data query
  const {
    data: item,
    isLoading,
    error,
  } = useQuery<Item & { userHasFavorited?: boolean }>({
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

  // Determine user role
  const isOwner = item?.userId === user?.id;
  const isRecipient = user?.id === item?.recipientId;

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

  // Add these near the top where other state is managed
  const hasRequested = requests?.some(r => r.status === "pending");
  const hasBid = bids?.some(bid => bid.status === "pending");

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

  // Find the relevant request for the recipient
  const activeRequest = requests.find(r => 
    ["pending", "accepted", "awaiting_pickup_confirmation", "scheduled"].includes(r.status)
  );

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container py-6">
        {isOwner ? (
          <OwnerListingView
            item={item}
            requests={requests}
            bids={bids}
            currentUserId={user?.id ?? 0}
          />
        ) : isRecipient && activeRequest ? (
          <RecipientListingView
            item={item}
            request={activeRequest}
            currentUserId={user?.id ?? 0}
          />
        ) : (
          <PublicListingView
            item={item}
            currentUserId={user?.id ?? 0}
            hasRequested={hasRequested}
            hasBid={hasBid}
          />
        )}
      </main>
    </div>
  );
}