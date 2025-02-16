import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Item, InsertItemRequest, InsertItemBid, ItemRequest, ItemBid } from "@shared/schema";
import Navbar from "@/components/navbar";
import { useRoute } from "wouter";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { formatDistanceToNow } from "date-fns";
import { Loader2, MessageSquare } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { addDays, addHours, format, isBefore, isAfter, startOfHour } from "date-fns";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";

function RequestsList({ itemId }: { itemId: number }) {
  const { data: requests } = useQuery<ItemRequest[]>({
    queryKey: [`/api/items/${itemId}/requests`],
    enabled: !!itemId,
  });

  if (!requests?.length) {
    return <p className="text-muted-foreground">No requests yet.</p>;
  }

  return requests.map((request) => (
    <Card key={request.id} className="p-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <p className="font-medium text-sm">Anonymous</p>
            <span className="text-xs text-muted-foreground">
              {formatDistanceToNow(new Date(request.createdAt), {
                addSuffix: true,
              })}
            </span>
          </div>
          <p className="text-sm text-muted-foreground">{request.message}</p>
        </div>
        <Badge
          variant={
            request.status === "pending"
              ? "secondary"
              : request.status === "accepted"
              ? "default"
              : "destructive"
          }
          className="text-xs"
        >
          {request.status}
        </Badge>
      </div>
    </Card>
  ));
}

function BidsList({ itemId }: { itemId: number }) {
  const { data: bids } = useQuery<ItemBid[]>({
    queryKey: [`/api/items/${itemId}/bids`],
    enabled: !!itemId,
  });

  if (!bids?.length) {
    return <p className="text-muted-foreground">No bids yet.</p>;
  }

  return bids.map((bid) => (
    <Card key={bid.id} className="p-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <p className="font-medium text-sm">Anonymous · ${bid.amount}</p>
            <span className="text-xs text-muted-foreground">
              {formatDistanceToNow(new Date(bid.createdAt), {
                addSuffix: true,
              })}
            </span>
          </div>
          <p className="text-sm text-muted-foreground">{bid.message}</p>
        </div>
        <Badge
          variant={
            bid.status === "pending"
              ? "secondary"
              : bid.status === "accepted"
              ? "default"
              : "destructive"
          }
          className="text-xs"
        >
          {bid.status}
        </Badge>
      </div>
    </Card>
  ));
}

const requestSchema = z.object({
  message: z.string().optional(),
});

const bidSchema = z.object({
  amount: z.number().min(1, "Bid amount must be greater than 0"),
  message: z.string().optional(),
});

function PickupScheduler({
  itemId,
  onScheduled,
}: {
  itemId: number;
  onScheduled: () => void;
}) {
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [selectedHour, setSelectedHour] = useState<number>();
  const [isOpen, setIsOpen] = useState(false);

  const now = new Date();
  const twoWeeksFromNow = addDays(now, 14);

  const scheduleMutation = useMutation({
    mutationFn: async () => {
      if (!selectedDate || selectedHour === undefined) return;

      const pickupStart = startOfHour(addHours(selectedDate, selectedHour));
      const pickupEnd = addHours(pickupStart, 1);

      const response = await apiRequest(
        "POST",
        `/api/items/${itemId}/schedule`,
        { pickupStart, pickupEnd }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to schedule pickup");
      }
      return response.json();
    },
    onSuccess: () => {
      setIsOpen(false);
      onScheduled();
      toast({
        title: "Pickup scheduled!",
        description: "The recipient has been notified of the pickup window.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to schedule pickup",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const availableHours = Array.from({ length: 24 }, (_, i) => i).filter((hour) => {
    if (!selectedDate) return false;
    const date = addHours(selectedDate, hour);
    return isAfter(date, now) && isBefore(date, twoWeeksFromNow);
  });

  return (
    <Drawer open={isOpen} onOpenChange={setIsOpen}>
      <DrawerTrigger asChild>
        <Button>Schedule Pickup</Button>
      </DrawerTrigger>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>Schedule Item Pickup</DrawerTitle>
          <DrawerDescription>
            Select a one-hour window for item pickup
          </DrawerDescription>
        </DrawerHeader>
        <div className="p-4 space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Select Date</label>
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={setSelectedDate}
              disabled={(date) => isBefore(date, now) || isAfter(date, twoWeeksFromNow)}
            />
          </div>
          {selectedDate && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Select Hour</label>
              <div className="grid grid-cols-4 gap-2">
                {availableHours.map((hour) => (
                  <Button
                    key={hour}
                    variant={selectedHour === hour ? "default" : "outline"}
                    onClick={() => setSelectedHour(hour)}
                  >
                    {format(addHours(startOfHour(now), hour), "ha")}
                  </Button>
                ))}
              </div>
            </div>
          )}
          <Button
            className="w-full"
            disabled={!selectedDate || selectedHour === undefined || scheduleMutation.isPending}
            onClick={() => scheduleMutation.mutate()}
          >
            Confirm Pickup Window
          </Button>
        </div>
      </DrawerContent>
    </Drawer>
  );
}

export default function ListingPage() {
  const [, params] = useRoute("/item/:id");
  const itemId = params?.id;
  const { user } = useAuth();
  const { toast } = useToast();
  const [requestDialogOpen, setRequestDialogOpen] = useState(false);

  const { data: item, isLoading, error } = useQuery<Item & { userHasFavorited?: boolean }>({
    queryKey: [`/api/items/${itemId}`],
    enabled: !!itemId,
    select: (data) => ({
      ...data,
      createdAt: new Date(data.createdAt),
    }),
  });

  const { data: requests } = useQuery<ItemRequest[]>({
    queryKey: [`/api/items/${itemId}/my-requests`],
    enabled: !!itemId && !!user,
  });

  const { data: bids } = useQuery<ItemBid[]>({
    queryKey: [`/api/items/${itemId}/my-bids`],
    enabled: !!itemId && !!user,
  });

  const hasRequested = requests?.some((request) => request.status === "pending");
  const hasBid = bids?.some((bid) => bid.status === "pending");

  const requestForm = useForm<z.infer<typeof requestSchema>>({
    resolver: zodResolver(requestSchema),
    defaultValues: {
      message: "",
    },
  });

  const bidForm = useForm<z.infer<typeof bidSchema>>({
    resolver: zodResolver(bidSchema),
    defaultValues: {
      amount: 0,
      message: "",
    },
  });

  const requestMutation = useMutation({
    mutationFn: async (data: z.infer<typeof requestSchema>) => {
      const response = await apiRequest("POST", `/api/items/${itemId}/request`, data);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to send request");
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Request sent!",
        description: "The owner will be notified of your request.",
      });
      requestForm.reset();
      queryClient.invalidateQueries({ queryKey: [`/api/items/${itemId}/my-requests`] });
      setRequestDialogOpen(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to send request",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const bidMutation = useMutation({
    mutationFn: async (data: z.infer<typeof bidSchema>) => {
      const response = await apiRequest("POST", `/api/items/${itemId}/bid`, data);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to place bid");
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Bid placed!",
        description: "The owner will be notified of your bid.",
      });
      bidForm.reset();
      setRequestDialogOpen(false);
      queryClient.invalidateQueries({
        queryKey: [`/api/items/${itemId}/my-bids`, "/api/user/bids"],
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to place bid",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const drawingMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", `/api/items/${itemId}/draw`);
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
      queryClient.invalidateQueries({ queryKey: [`/api/items/${itemId}`] });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to perform drawing",
        description: error.message,
        variant: "destructive",
      });
    },
  });

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

  const isOwner = item.userId === user?.id;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container py-6">
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
              {item.isGift ? (
                <div className="inline-block bg-primary text-primary-foreground px-3 py-1 rounded-full text-sm font-medium">
                  Free
                </div>
              ) : (
                <p className="text-2xl font-bold text-primary">${item.price}</p>
              )}
            </div>

            <div>
              <p className="font-medium">Listed by Anonymous</p>
              <p className="text-sm text-muted-foreground">
                {formatDistanceToNow(item.createdAt, {
                  addSuffix: true,
                })}
              </p>
            </div>

            <div className="border-t border-border pt-4">
              <p className="text-muted-foreground whitespace-pre-wrap">
                {item.description}
              </p>
            </div>

            {isOwner ? (
              <div className="border-t border-border pt-3">
                <h3 className="text-base font-medium mb-2">
                  {item.isGift ? "Requests" : "Bids"}
                </h3>
                <div className="space-y-2">
                  {item.isGift ? (
                    <RequestsList itemId={item.id} />
                  ) : (
                    <BidsList itemId={item.id} />
                  )}
                </div>
              </div>
            ) : (
              <div className="flex gap-4">
                {item.isGift ? (
                  <Dialog open={requestDialogOpen} onOpenChange={setRequestDialogOpen}>
                    <DialogTrigger asChild>
                      <Button className="flex-1" disabled={hasRequested}>
                        {hasRequested ? "Request Pending" : "Request Item"}
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Request Item</DialogTitle>
                        <DialogDescription>
                          Send a message to the owner explaining why you'd like this item.
                        </DialogDescription>
                      </DialogHeader>
                      <Form {...requestForm}>
                        <form
                          onSubmit={requestForm.handleSubmit((data) => {
                            requestMutation.mutate(data);
                          })}
                          className="space-y-4"
                        >
                          <FormField
                            control={requestForm.control}
                            name="message"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Message</FormLabel>
                                <FormControl>
                                  <Textarea {...field} />
                                </FormControl>
                                <FormDescription>
                                  Be clear about why you're interested and how you'll use the item.
                                </FormDescription>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <Button
                            type="submit"
                            className="w-full"
                            disabled={requestMutation.isPending}
                          >
                            Send Request
                          </Button>
                        </form>
                      </Form>
                    </DialogContent>
                  </Dialog>
                ) : (
                  <Dialog open={requestDialogOpen} onOpenChange={setRequestDialogOpen}>
                    <DialogTrigger asChild>
                      <Button className="flex-1" disabled={hasBid}>
                        {hasBid ? "Bid Pending" : "Place Bid"}
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Place a Bid</DialogTitle>
                        <DialogDescription>
                          Make an offer for this item.
                        </DialogDescription>
                      </DialogHeader>
                      <Form {...bidForm}>
                        <form
                          onSubmit={bidForm.handleSubmit((data) => {
                            bidMutation.mutate(data, {
                              onSuccess: () => {
                                queryClient.invalidateQueries({ queryKey: ["/api/user/bids"] });
                                setRequestDialogOpen(false);
                              },
                            });
                          })}
                          className="space-y-4"
                        >
                          <FormField
                            control={bidForm.control}
                            name="amount"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Bid Amount ($)</FormLabel>
                                <FormControl>
                                  <Input
                                    type="number"
                                    placeholder="Enter bid amount"
                                    {...field}
                                    value={field.value || ""}
                                    onChange={(e) =>
                                      field.onChange(e.target.value ? Number(e.target.value) : "")
                                    }
                                  />
                                </FormControl>
                                <FormDescription>
                                  Enter your bid amount in dollars.
                                </FormDescription>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={bidForm.control}
                            name="message"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Message</FormLabel>
                                <FormControl>
                                  <Textarea {...field} />
                                </FormControl>
                                <FormDescription>
                                  Include any additional information about your bid.
                                </FormDescription>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <Button
                            type="submit"
                            className="w-full"
                            disabled={bidMutation.isPending}
                          >
                            Place Bid
                          </Button>
                        </form>
                      </Form>
                    </DialogContent>
                  </Dialog>
                )}
              </div>
            )}
            {isOwner && item.isGift && (
              <div className="border-t border-border pt-4 space-y-4">
                {item.recipientId ? (
                  <>
                    <div className="space-y-2">
                      <h3 className="font-medium">Selected Recipient</h3>
                      <p className="text-sm text-muted-foreground">
                        A recipient has been selected through random drawing
                      </p>
                    </div>
                    {item.pickupStart && item.pickupEnd ? (
                      <div className="space-y-2">
                        <h3 className="font-medium">Pickup Window</h3>
                        <p className="text-sm text-muted-foreground">
                          {format(new Date(item.pickupStart), "PPP p")} -{" "}
                          {format(new Date(item.pickupEnd), "p")}
                        </p>
                      </div>
                    ) : (
                      <PickupScheduler
                        itemId={item.id}
                        onScheduled={() => {
                          queryClient.invalidateQueries({ queryKey: [`/api/items/${itemId}`] });
                        }}
                      />
                    )}
                  </>
                ) : (
                  requests?.length > 0 && (
                    <div className="space-y-4">
                      <p className="text-sm text-muted-foreground">
                        You have {requests.length} pending requests for this item
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
                          "Start Random Drawing"
                        )}
                      </Button>
                    </div>
                  )
                )}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}