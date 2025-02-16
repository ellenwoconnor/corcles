import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Item } from "@shared/schema";
import Navbar from "@/components/navbar";
import { useRoute } from "wouter";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { formatDistanceToNow } from "date-fns";
import { Heart, Loader2 } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";

export default function ListingPage() {
  const [, params] = useRoute("/item/:id");
  const itemId = params?.id;
  const { user } = useAuth();

  const {
    data: item,
    isLoading,
    error,
  } = useQuery<Item & { userHasFavorited?: boolean }>({
    queryKey: [`/api/items/${itemId}`],
    enabled: !!itemId,
    select: (data) => ({
      ...data,
      createdAt: new Date(),
    }),
  });

  const favoriteMutation = useMutation({
    mutationFn: async () => {
      if (!item) return;
      await apiRequest("POST", `/api/items/${item.id}/favorite`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/items/${itemId}`] });
      queryClient.invalidateQueries({
        queryKey: [`/api/items/${user?.community}`],
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

            <div className="flex gap-4">
              <Button className="flex-1">Contact Seller</Button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
