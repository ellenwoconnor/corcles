import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Item, InsertItemRequest, InsertItemBid } from "@shared/schema";
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
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";

const requestSchema = z.object({
  message: z.string().optional(),
});

const bidSchema = z.object({
  amount: z.number().min(1, "Bid amount must be greater than 0"),
  message: z.string().optional(),
});

export default function ListingPage() {
  const [, params] = useRoute("/item/:id");
  const itemId = params?.id;
  const { user } = useAuth();
  const { toast } = useToast();

  const {
    data: item,
    isLoading,
    error,
  } = useQuery<Item & { userHasFavorited?: boolean }>({
    queryKey: [`/api/items/${itemId}`],
    enabled: !!itemId,
    select: (data) => ({
      ...data,
      createdAt: new Date(data.createdAt),
    }),
  });

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
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Request sent!",
        description: "The owner will be notified of your request.",
      });
      requestForm.reset();
    },
  });

  const bidMutation = useMutation({
    mutationFn: async (data: z.infer<typeof bidSchema>) => {
      const response = await apiRequest("POST", `/api/items/${itemId}/bid`, data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Bid placed!",
        description: "The owner will be notified of your bid.",
      });
      bidForm.reset();
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

            <div className="flex items-center gap-4">
              <Avatar>
                <AvatarImage src="/avatar.jpg" />
                <AvatarFallback>U</AvatarFallback>
              </Avatar>
              <div>
                <p className="font-medium">Listed by Anonymous</p>
                <p className="text-sm text-muted-foreground">
                  {formatDistanceToNow(item.createdAt, {
                    addSuffix: true,
                  })}
                </p>
              </div>
            </div>

            <div className="border-t border-border pt-4">
              <p className="text-muted-foreground whitespace-pre-wrap">
                {item.description}
              </p>
            </div>

            {!isOwner && (
              <div className="flex gap-4">
                {item.isGift ? (
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button className="flex-1">Request Item</Button>
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
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button className="flex-1">Place Bid</Button>
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
                            bidMutation.mutate(data);
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
                                    value={field.value || ''}
                                    onChange={(e) =>
                                      field.onChange(e.target.value ? Number(e.target.value) : '')
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
          </div>
        </div>
      </main>
    </div>
  );
}