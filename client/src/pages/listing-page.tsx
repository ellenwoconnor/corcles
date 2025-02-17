import { useState, useEffect } from "react";
import { useAuth } from "@/features/auth/hooks/use-auth";
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
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Clock } from "lucide-react";
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
import { Check, X } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Edit, Trash2 } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";


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
              : request.status === "ready_for_drawing"
              ? "default"
              : request.status === "accepted"
              ? "default"
              : request.status === "awaiting_pickup_confirmation"
              ? "default"
              : "destructive"
          }
          className="text-xs"
        >
          {request.status === "ready_for_drawing" ? "Ready for Drawing" :
            request.status === "awaiting_pickup_confirmation" ? "Awaiting Confirmation" :
              request.status}
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
  const { toast } = useToast();
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
        {
          pickupStart: pickupStart.toISOString(),
          pickupEnd: pickupEnd.toISOString(),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to schedule pickup");
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
      queryClient.invalidateQueries({ queryKey: [`/api/items/${itemId}`] });
      queryClient.invalidateQueries({ queryKey: [`/api/items/${itemId}/requests`] });
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
            {scheduleMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Scheduling...
              </>
            ) : (
              "Confirm Pickup Window"
            )}
          </Button>
        </div>
      </DrawerContent>
    </Drawer>
  );
}

function PickupConfirmation({ item, request }: { item: Item; request: ItemRequest }) {
  const { toast } = useToast();
  const confirmMutation = useMutation({
    mutationFn: async (confirmed: boolean) => {
      const response = await apiRequest(
        "POST",
        `/api/items/${item.id}/confirm-pickup`,
        { confirmed }
      );
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to confirm pickup");
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Pickup confirmed",
        description: "The owner has been notified of your confirmation.",
      });
      queryClient.invalidateQueries({ queryKey: [`/api/items/${item.id}`] });
      queryClient.invalidateQueries({ queryKey: [`/api/items/${item.id}/my-requests`] });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to confirm pickup",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return (
    <div className="space-y-4 border-t border-border pt-4">
      <div className="space-y-2">
        <h3 className="font-medium">Scheduled Pickup Window</h3>
        <p className="text-sm text-muted-foreground">
          {format(new Date(item.pickupStart!), "PPP p")} -{" "}
          {format(new Date(item.pickupEnd!), "p")}
        </p>
      </div>
      <div className="flex gap-2">
        <Button
          onClick={() => confirmMutation.mutate(true)}
          disabled={confirmMutation.isPending}
          className="flex-1"
        >
          <Check className="w-4 h-4 mr-2" />
          Confirm Pickup
        </Button>
        <Button
          variant="outline"
          onClick={() => confirmMutation.mutate(false)}
          disabled={confirmMutation.isPending}
          className="flex-1"
        >
          <X className="w-4 h-4 mr-2" />
          Decline
        </Button>
      </div>
    </div>
  );
}

function EditListingDialog({ 
  item,
  open,
  onOpenChange
}: { 
  item: Item;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { toast } = useToast();
  const insertItemSchema = z.object({
    title: z.string().min(1, {message: "Title is required"}),
    description: z.string().optional(),
    price: z.number().min(0).optional(),
    isGift: z.boolean(),
    imageUrl: z.string().url({message: "Invalid image URL"}).optional(),
    community: z.string().optional(),
  })
  const editForm = useForm<z.infer<typeof insertItemSchema>>({
    resolver: zodResolver(insertItemSchema),
    defaultValues: {
      title: item.title,
      description: item.description,
      price: item.price || undefined,
      isGift: item.isGift,
      imageUrl: item.imageUrl,
      community: item.community,
    },
  });

  const editMutation = useMutation({
    mutationFn: async (data: z.infer<typeof insertItemSchema>) => {
      const response = await apiRequest(
        "PATCH",
        `/api/items/${item.id}`,
        data
      );
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to update item");
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Item updated",
        description: "Your listing has been updated successfully.",
      });
      queryClient.invalidateQueries({ queryKey: [`/api/items/${item.id}`] });
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to update item",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Listing</DialogTitle>
          <DialogDescription>
            Update your listing details.
          </DialogDescription>
        </DialogHeader>
        <Form {...editForm}>
          <form
            onSubmit={editForm.handleSubmit((data) => {
              editMutation.mutate(data);
            })}
            className="space-y-4"
          >
            <FormField
              control={editForm.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={editForm.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={editForm.control}
              name="isGift"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>
                      This is a gift (free)
                    </FormLabel>
                  </div>
                </FormItem>
              )}
            />
            {!editForm.watch("isGift") && (
              <FormField
                control={editForm.control}
                name="price"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Price ($)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        {...field}
                        onChange={(e) =>
                          field.onChange(e.target.value ? Number(e.target.value) : "")
                        }
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
            <Button
              type="submit"
              className="w-full"
              disabled={editMutation.isPending}
            >
              {editMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Updating...
                </>
              ) : (
                "Update Listing"
              )}
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

export default function ListingPage() {
  const [, params] = useRoute("/item/:id");
  const itemId = params?.id;
  const { user } = useAuth();
  const { toast } = useToast();
  const [requestDialogOpen, setRequestDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);

  const { data: item, isLoading, error } = useQuery<Item & { userHasFavorited?: boolean }>({
    queryKey: [`/api/items/${itemId}`],
    enabled: !!itemId,
    select: (data) => ({
      ...data,
      createdAt: new Date(data.createdAt),
    }),
  });

  const isOwner = item?.userId === user?.id;

  const { data: requests } = useQuery<ItemRequest[]>({
    queryKey: [isOwner ? `/api/items/${itemId}/requests` : `/api/items/${itemId}/my-requests`],
    enabled: !!itemId && !!user,
  });

  const { data: bids } = useQuery<ItemBid[]>({
    queryKey: [`/api/items/${itemId}/bids`],
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

  useEffect(() => {
    if (item && isOwner) {
      setEditDialogOpen(false);
    }
  }, [item, isOwner]);

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
              <p className="font-medium">Listed by {item.userDisplayName || 'Anonymous'}</p>
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

            {requests?.some(r => r.status === "awaiting_pickup_confirmation") && (
              <div className="mb-4">
                <Alert>
                  <Clock className="h-4 w-4" />
                  <AlertTitle>Pickup Confirmation Pending</AlertTitle>
                  <AlertDescription>
                    Waiting for the recipient to confirm the pickup window
                  </AlertDescription>
                </Alert>
              </div>
            )}
            {isOwner && (
              <div className="flex gap-2 border-t border-border pt-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setEditDialogOpen(true)}
                >
                  <Edit className="w-4 h-4 mr-2" />
                  Edit
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" size="sm">
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This action cannot be undone. This will permanently delete your listing.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={async () => {
                          try {
                            const response = await apiRequest(
                              "DELETE",
                              `/api/items/${item.id}`
                            );
                            if (!response.ok) {
                              throw new Error("Failed to delete item");
                            }
                            toast({
                              title: "Item deleted",
                              description: "Your listing has been deleted successfully.",
                            });
                            window.location.href = "/";
                          } catch (error) {
                            toast({
                              title: "Failed to delete item",
                              description: error.message,
                              variant: "destructive",
                            });
                          }
                        }}
                      >
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            )}
            {isOwner ? (
              <div className="border-t border-border pt-3">
                <h3 className="text-base font-medium mb-2">
                  {item.isGift ? "Requests" : "Bids"}
                </h3>
                <div className="space-y-2">
                  {item.isGift ? (
                    requests ? (
                      <p className="text-muted-foreground">
                        {requests.length} {requests.length === 1 ? 'request' : 'requests'} received
                      </p>
                    ) : (
                      <p className="text-muted-foreground">No requests yet.</p>
                    )
                  ) : (
                    <BidsList itemId={item.id} />
                  )}
                </div>
              </div>
            ) : (
              <div className="flex gap-4">
                {item.isGift ? (
                  requests?.some(r => r.status === "awaiting_pickup_confirmation") ? (
                    <PickupConfirmation item={item} request={requests.find(r => r.status === "awaiting_pickup_confirmation")!} />
                  ) : (
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
                  )
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
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <h3 className="font-medium">Selected Recipient</h3>
                      <p className="text-sm text-muted-foreground">
                        A recipient has been selected through random drawing
                      </p>
                    </div>
                    <div className="space-y-2">
                      <h3 className="font-medium">Pickup Window</h3>
                      {item.pickupStart ? (
                        <div>
                          <p className="text-sm text-muted-foreground">
                            {format(new Date(item.pickupStart), "PPP p")} -{" "}
                            {format(new Date(item.pickupEnd || new Date()), "p")}
                          </p>
                          {requests?.some(r => r.status === "awaiting_pickup_confirmation") && (
                            <Alert className="mt-2">
                              <Clock className="h-4 w-4" />
                              <AlertTitle>Awaiting Confirmation</AlertTitle>
                              <AlertDescription>
                                Waiting for the recipient to confirm the pickup window
                              </AlertDescription>
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
                              queryClient.invalidateQueries({ queryKey: [`/api/items/${itemId}`] });
                            }}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {!item.pickupStart ? (
                      <div className="space-y-2">
                        <h3 className="font-medium">Schedule Pickup</h3>
                        <p className="text-sm text-muted-foreground mb-4">
                          First, set a one-hour window for item pickup. Then you can select a recipient.
                        </p>
                        <PickupScheduler
                          itemId={item.id}
                          onScheduled={() => {
                            queryClient.invalidateQueries({ queryKey: [`/api/items/${itemId}`] });
                          }}
                        />
                      </div>
                    ) : (
                      <>
                        <div className="space-y-2">
                          <h3 className="font-medium">Scheduled Pickup Window</h3>
                          <p className="text-sm text-muted-foreground">
                            {format(new Date(item.pickupStart), "PPP p")} -{" "}
                            {format(new Date(item.pickupEnd), "p")}
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
        {isOwner && item && (
          <EditListingDialog
            item={item}
            open={editDialogOpen}
            onOpenChange={setEditDialogOpen}
          />
        )}
      </main>
    </div>
  );
}