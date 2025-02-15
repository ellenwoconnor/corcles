import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { Item } from "@shared/schema";
import Navbar from "@/components/navbar";
import { useRoute } from "wouter";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { formatDistanceToNow } from "date-fns";
import { Heart, Loader2 } from "lucide-react";

export default function ListingPage() {
  const [, params] = useRoute("/item/:id");
  const itemId = params?.id;

  const { data: item, isLoading } = useQuery<Item>({
    queryKey: [`/api/items/${itemId}`],
    enabled: !!itemId,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-border" />
      </div>
    );
  }

  if (!item) {
    return <div>Item not found</div>;
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
              className="w-full rounded-lg"
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
                  {item.createdAt ? formatDistanceToNow(new Date(item.createdAt), {
                    addSuffix: true,
                  }) : 'Just now'}
                </p>
              </div>
            </div>

            <div>
              <h2 className="text-xl font-semibold mb-2">Description</h2>
              <p className="text-muted-foreground">{item.description}</p>
            </div>

            <div className="flex gap-4">
              <Button className="flex-1">Contact Seller</Button>
              <Button variant="outline" size="icon">
                <Heart
                  className={`h-4 w-4 ${item.favorites > 0 ? "fill-primary" : ""}`}
                />
              </Button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
