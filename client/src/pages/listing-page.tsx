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

interface PickupWindow {
  pickupStart: string;
  pickupEnd: string;
}

export type ExtendedItem = Item & {
  userHasFavorited?: boolean;
  proposedPickupWindows?: PickupWindow[];
};

export default function ListingPage() {
  const [, params] = useRoute("/item/:id");
  const { user } = useAuth();

  const {
    data: item,
    isLoading: itemLoading,
    error: itemError,
  } = useQuery({
    queryKey: [`/api/items/${params?.id}`],
    enabled: !!params?.id,
    select: (data: any) => {
      if (!data) return null;

      const transformDate = (dateStr: string | null | undefined) => {
        if (!dateStr) return null;
        const date = new Date(dateStr);
        return isNaN(date.getTime()) ? null : date.toISOString();
      };

      try {
        return {
          ...data,
          createdAt: transformDate(data.createdAt) || new Date().toISOString(),
          pickupStart: transformDate(data.pickupStart),
          pickupEnd: transformDate(data.pickupEnd),
          proposedPickupWindows: Array.isArray(data.proposedPickupWindows)
            ? data.proposedPickupWindows.map((window: any) => ({
                pickupStart: transformDate(window.pickupStart) || new Date().toISOString(),
                pickupEnd: transformDate(window.pickupEnd) || new Date().toISOString(),
              }))
            : [],
        };
      } catch (err) {
        console.error("Data transformation error:", {
          error: err,
          data,
          itemId: params?.id,
        });
        return null;
      }
    },
  });

  const isOwner = Boolean(user?.id === item?.userId);
  const hasAcceptedRequest = Boolean(
    user?.id === item?.recipientId && 
    item?.status && 
    ['scheduling', 'scheduled', 'pending_pickup'].includes(item.status)
  );

  const {
    data: requests = [],
    isLoading: requestsLoading,
  } = useQuery<(ItemRequest & { userId?: number })[]>({
    queryKey: [
      `/api/items/${params?.id}/${isOwner ? "requests" : "my-requests"}`,
    ],
    enabled: !!params?.id && !!user,
  });

  const {
    data: bids = [],
    isLoading: bidsLoading,
  } = useQuery<ItemBid[]>({
    queryKey: [`/api/items/${params?.id}/bids`],
    enabled: !!params?.id && !!user && !item?.isGift,
  });

  const activeRequest = hasAcceptedRequest 
    ? requests.find(r => r.requesterId === user?.id)
    : undefined;

  const hasRequested = requests?.some((r) => r.status === "pending");
  const hasBid = bids?.some((bid) => bid.status === "pending");

  if (itemLoading || requestsLoading || bidsLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-border" />
      </div>
    );
  }

  if (itemError || !item) {
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
      <main className="container py-12">
        {isOwner ? (
          <OwnerListingView
            item={item}
            requests={requests}
            bids={bids}
            currentUserId={user?.id ?? 0}
          />
        ) : hasAcceptedRequest && activeRequest ? (
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