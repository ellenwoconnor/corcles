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
import { useQueryClient } from "@tanstack/react-query";
import { DelistButton } from "@/components/delist-button";

interface OwnerListingViewProps {
  item: ExtendedItem;
  requests: (ItemRequest & { userId?: number })[];
  bids?: any[];
  currentUserId: number;
}

interface PickupWindow {
  pickupStart: string;
  pickupEnd: string;
}

const SECTION_CLASS = "border-t border-border pt-4 space-y-4";
const TIME_DISPLAY_CLASS = "p-3 bg-secondary rounded-lg border border-border";

export default function OwnerListingView({
  item,
  requests,
  bids,
  currentUserId,
}: OwnerListingViewProps) {
  const [messageDialogOpen, setMessageDialogOpen] = useState(false);
  const queryClient = useQueryClient();

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

  return (
    <div className="grid md:grid-cols-2 gap-8">
      <div>
        <img
          src={item.imageUrl}
          alt={item.title}
          className="w-full rounded-lg object-cover aspect-square"
        />
      </div>

      <div className="space-y-6">
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
            <div className="flex items-center gap-2">
              <EditListingDialog
                item={item}
                trigger={
                  <Button variant="outline" size="sm" className="gap-2">
                    <Pencil className="h-4 w-4" />
                    Edit Listing
                  </Button>
                }
              />
              <DelistButton itemId={item.id} variant="outline" />
            </div>
          </div>
        </div>

        <div className={SECTION_CLASS}>
          <p className="text-muted-foreground whitespace-pre-wrap">
            {item.description}
          </p>
        </div>

        <div className={SECTION_CLASS}>
          <div className="flex items-center justify-between">
            <h3 className="text-base font-medium">
              {item.isGift ? "Requests" : "Bids"}
            </h3>
            {item.isGift && requests.length > 0 && (
              <Badge variant="secondary">
                {requests.length}{" "}
                {requests.length === 1 ? "request" : "requests"}
              </Badge>
            )}
          </div>

          <div>
            {item.isGift ? (
              <RequestsList requests={requests} currentUserId={currentUserId} />
            ) : (
              <BidsList bids={bids || []} />
            )}
          </div>
        </div>

        {item.pickupStart && item.pickupEnd && (
          <div className={SECTION_CLASS}>
            <h3 className="font-medium mb-2">Confirmed Pickup Time</h3>
            <div className={TIME_DISPLAY_CLASS}>
              <div className="flex items-center gap-2">
                <Clock className="w-3.5 h-3.5" />
                <span className="text-sm">
                  {format(new Date(item.pickupStart), "EEE, MMM d")} at{" "}
                  {format(new Date(item.pickupStart), "h:mm a")} -{" "}
                  {format(new Date(item.pickupEnd), "h:mm a")}
                </span>
              </div>
            </div>
          </div>
        )}

        {showPickupScheduler && (
          <div className={SECTION_CLASS}>
            <h3 className="text-base font-medium">Pickup Scheduling</h3>

            {item.proposedPickupWindows &&
              item.proposedPickupWindows.length > 0 && (
                <div className="mb-4">
                  <h4 className="text-sm font-medium mb-2">
                    Proposed Pickup Times
                  </h4>
                  <div className="space-y-2">
                    {(item.proposedPickupWindows as PickupWindow[]).map(
                      (window, index) => (
                        <div key={index} className={TIME_DISPLAY_CLASS}>
                          <div className="flex items-center gap-2">
                            <Clock className="w-3.5 h-3.5" />
                            <span className="text-sm">
                              {format(
                                new Date(window.pickupStart),
                                "EEE, MMM d",
                              )}{" "}
                              at{" "}
                              {format(new Date(window.pickupStart), "h:mm a")} -{" "}
                              {format(new Date(window.pickupEnd), "h:mm a")}
                            </span>
                          </div>
                        </div>
                      ),
                    )}
                  </div>
                </div>
              )}

            <PickupScheduler
              itemId={item.id}
              itemStatus={item.status || ""}
              onScheduled={() => {
                queryClient.invalidateQueries({
                  queryKey: [`/api/items/${item.id}`],
                });
                queryClient.invalidateQueries({
                  queryKey: [`/api/items/${item.id}/requests`],
                });
              }}
            />
          </div>
        )}

        {item.isGift && showMessageAndCancel && (
          <div className={SECTION_CLASS}>
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
                trigger={<Button variant="outline">Message</Button>}
              />
            </div>
          </div>
        )}

        {item.pickupLocation && (
          <div className="mb-4 flex items-center text-sm text-muted-foreground">
            <MapPin className="w-4 h-4 mr-1" />
            <span>Pickup: {item.pickupLocation}</span>
          </div>
        )}
      </div>
    </div>
  );
}
import { useState } from "react";
import { formatDistanceToNow, format } from "date-fns";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { ExtendedItem } from "@/pages/listing-page";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { apiRequest } from "@/lib/api";
import { RequestList } from "./request-list";
import { BidList } from "./bid-list";
import { SchedulePickupDialog } from "./schedule-pickup-dialog";
import { DrawRequestsDialog } from "./draw-requests-dialog";
import { DelistButton } from "../delist-button";
import { useToast } from "../ui/use-toast";
import { AlertCircle, Clock, Gift, Tag } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "../ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";

interface OwnerListingViewProps {
  item: ExtendedItem;
  requestsCount: number;
  bidsCount: number;
}

export default function OwnerListingView({
  item,
  requestsCount,
  bidsCount,
}: OwnerListingViewProps) {
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const isDelisted = item.status === "delisted";
  const hasRequests = requestsCount > 0;
  const hasRecipient = !!item.recipientId;
  const canDraw = hasRequests && !hasRecipient && item.isGift && !isDelisted;
  const canSchedule = hasRequests && !hasRecipient && !isDelisted;
  const hasBids = bidsCount > 0;

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

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      {isDelisted && (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>This item has been delisted</AlertTitle>
          <AlertDescription>
            This item is no longer visible in the marketplace. Requests have been canceled.
          </AlertDescription>
        </Alert>
      )}
      
      <div className="grid md:grid-cols-2 gap-8">
        <div>
          <img
            src={item.imageUrl}
            alt={item.title}
            className={`w-full rounded-lg object-cover aspect-square ${isDelisted ? 'opacity-50 grayscale' : ''}`}
          />
        </div>
        
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-3xl font-bold">{item.title}</h1>
            <Badge variant={isDelisted ? "outline" : "default"}>
              {isDelisted ? "Delisted" : item.isGift ? "Free" : `$${item.price}`}
            </Badge>
          </div>
          
          <div className="text-sm text-muted-foreground mb-4">
            Posted {formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })}
          </div>
          
          <Card className="mb-6">
            <CardContent className="p-4">
              <div className="prose max-w-none">
                <p>{item.description}</p>
              </div>
            </CardContent>
          </Card>
          
          {item.pickupLocation && (
            <Card className="mb-6">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Pickup Location</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm">{item.pickupLocation}</p>
              </CardContent>
            </Card>
          )}
          
          {item.pickupStart && (
            <Card className="mb-6 bg-primary/5 border-primary/20">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Pickup Scheduled
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="font-medium">
                  {format(new Date(item.pickupStart), "EEEE, MMMM d")} at{" "}
                  {format(new Date(item.pickupStart), "h:mm a")} -{" "}
                  {format(new Date(item.pickupEnd!), "h:mm a")}
                </p>
              </CardContent>
            </Card>
          )}
          
          <div className="flex flex-wrap gap-3 mt-6">
            {!isDelisted && (
              <>
                <Link href={`/edit/${item.id}`}>
                  <Button>Edit Listing</Button>
                </Link>
                {canDraw && <DrawRequestsDialog itemId={item.id} />}
                {canSchedule && <SchedulePickupDialog itemId={item.id} />}
                {!hasRecipient && <DelistButton itemId={item.id} variant="outline" />}
              </>
            )}
            
            <Button
              variant="destructive"
              onClick={() => {
                if (confirm("Are you sure you want to delete this item? This cannot be undone.")) {
                  deleteItemMutation.mutate();
                }
              }}
              disabled={deleteItemMutation.isPending}
            >
              {deleteItemMutation.isPending ? "Deleting..." : "Delete"}
            </Button>
          </div>
        </div>
      </div>
      
      <Tabs defaultValue={item.isGift ? "requests" : "bids"} className="mt-12">
        <TabsList>
          {item.isGift && (
            <TabsTrigger value="requests" className="flex items-center gap-2">
              <Gift className="h-4 w-4" />
              Requests
              {requestsCount > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {requestsCount}
                </Badge>
              )}
            </TabsTrigger>
          )}
          {!item.isGift && (
            <TabsTrigger value="bids" className="flex items-center gap-2">
              <Tag className="h-4 w-4" />
              Bids
              {bidsCount > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {bidsCount}
                </Badge>
              )}
            </TabsTrigger>
          )}
        </TabsList>
        
        {item.isGift && (
          <TabsContent value="requests">
            <RequestList itemId={item.id} isOwner={true} />
          </TabsContent>
        )}
        
        {!item.isGift && (
          <TabsContent value="bids">
            <BidList itemId={item.id} isOwner={true} />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
