import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Loader2, Gift, Tag } from "lucide-react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Navbar from "@/components/navbar";
import { formatDistanceToNow, format } from "date-fns";

export default function ListingsPage() {
  const { data: userItems, isLoading } = useQuery({
    queryKey: ["/api/user/items"],
  });

  const getStatusBadge = (item: any) => {
    // Otherwise show regular status
    switch (item.status) {
      case "available":
        return (
          <Badge variant="outline" className="text-center">
            Pending Requests
          </Badge>
        );
      case "requested":
        return (
          <Badge variant="default" className="text-center">
            Requests Received
          </Badge>
        );
      case "pending_pickup":
        return (
          <Badge variant="default" className="text-center">
            Pending Pickup
          </Badge>
        );
      case "delisted":
        return <Badge className="bg-gray-400 text-center">Delisted</Badge>;
      case "scheduling":
        return (
          <Badge variant="default" className="text-center">
            Scheduling Pickup
          </Badge>
        );
      case "scheduled":
        return (
          <Badge variant="default" className="text-center">
            Pickup Scheduled
          </Badge>
        );
      default:
        return <Badge variant="outline">{item.status}</Badge>;
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="container py-12 flex justify-center">
          <Loader2 className="h-6 w-6 animate-spin" />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container py-12 px-4 sm:px-6">
        <h1 className="text-2xl mb-8">My Listings</h1>
        <div className="grid gap-4 max-w-full">
          {!userItems || userItems.length === 0 ? (
            <Card>
              <CardHeader>
                <CardTitle>No Listings</CardTitle>
                <CardDescription>
                  You haven't listed any items yet.
                </CardDescription>
              </CardHeader>
            </Card>
          ) : (
            userItems.map((item: any) => (
              <Card key={item.id}>
                <CardHeader className="flex flex-col sm:flex-row items-center gap-4"> {/* Added flex-col and sm:flex-row */}
                  <img
                    src={item.imageUrl}
                    alt={item.title}
                    className="w-16 h-16 sm:w-20 sm:h-20 rounded object-cover flex-shrink-0"
                  />

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <CardTitle>
                        <Link
                          href={`/item/${item.id}`}
                          className="hover:underline truncate"
                        >
                          {item.title}
                        </Link>
                      </CardTitle>
                      {getStatusBadge(item)}
                    </div>
                    <div className="flex items-center gap-4 mt-1">
                      {item.isGift ? (
                        <span className="text-sm font-medium text-primary">
                          Free
                        </span>
                      ) : (
                        <span className="text-sm font-medium">
                          ${item.price}
                        </span>
                      )}
                      <span className="text-sm text-muted-foreground">
                        {formatDistanceToNow(new Date(item.createdAt), {
                          addSuffix: true,
                        })}
                      </span>
                      {item.wishlistId && (
                        <div className="flex items-center gap-1">
                          <Tag className="h-3 w-3" />
                          <span className="text-sm text-muted-foreground">
                            Wishlist Offer
                          </span>
                        </div>
                      )}
                    </div>
                    {item.pickupStart && (
                      <div className="mt-2 text-sm text-muted-foreground">
                        Pickup scheduled for{" "}
                        {format(new Date(item.pickupStart), "PPP 'at' p")}
                      </div>
                    )}
                  </div>
                </CardHeader>
              </Card>
            ))
          )}
        </div>
      </main>
    </div>
  );
}