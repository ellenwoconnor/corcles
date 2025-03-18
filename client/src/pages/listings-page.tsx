import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import {
  Loader2,
  Clock,
  CheckCircle,
  AlertTriangle,
  Users,
} from "lucide-react";
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

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "available":
        return <Badge variant="outline">Pending Requests</Badge>;
      case "requested":
        return <Badge variant="default">Requests Received</Badge>;
      case "pending_pickup":
        return <Badge variant="default">Pending Pickup</Badge>;
      case "delisted":
        return <Badge className="bg-gray-400">Delisted</Badge>;
      case "scheduling":
        return <Badge variant="default">Scheduling Pickup</Badge>;
      case "scheduled":
        return <Badge variant="default">Pickup Scheduled</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
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
      <main className="container py-12">
        <h1 className="text-3xl font-bold mb-8">My Listings</h1>
        <div className="grid gap-4">
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
                <CardHeader>
                  <div className="flex items-center gap-4">
                    <img
                      src={item.imageUrl}
                      alt={item.title}
                      className="w-16 h-16 rounded object-cover"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <CardTitle className="text-lg">
                          <Link
                            href={`/item/${item.id}`}
                            className="hover:underline truncate"
                          >
                            {item.title}
                          </Link>
                        </CardTitle>
                        {getStatusBadge(item.status)}
                      </div>
                      <div className="text-sm text-muted-foreground mt-1">
                        Listed {formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })}
                      </div>
                      {item.pickupStart && (
                        <div className="mt-2 text-sm text-muted-foreground">
                          Pickup scheduled for{" "}
                          {format(new Date(item.pickupStart), "PPP 'at' p")}
                        </div>
                      )}
                    </div>
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
