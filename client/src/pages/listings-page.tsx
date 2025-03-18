
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Loader2, Clock, CheckCircle, AlertTriangle, Users } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Navbar from "@/components/navbar";
import { formatDistanceToNow } from "date-fns";

export default function ListingsPage() {
  const { data: userItems, isLoading } = useQuery({
    queryKey: ["/api/user/items"],
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "available":
        return <Badge className="bg-green-500">Available</Badge>;
      case "pending_pickup":
        return <Badge variant="secondary">Pending Pickup</Badge>;
      case "delisted":
        return <Badge variant="destructive">Delisted</Badge>;
      case "scheduling":
        return <Badge className="bg-blue-500">Scheduling Pickup</Badge>;
      case "scheduled":
        return <Badge className="bg-purple-500">Pickup Scheduled</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "available":
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case "pending_pickup":
      case "scheduling":
      case "scheduled":
        return <Clock className="h-5 w-5 text-blue-500" />;
      case "delisted":
        return <AlertTriangle className="h-5 w-5 text-red-500" />;
      default:
        return null;
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
                      <div className="flex items-center gap-2 mb-1">
                        {getStatusIcon(item.status)}
                        <CardTitle className="text-lg">
                          <Link
                            href={`/item/${item.id}`}
                            className="hover:underline truncate"
                          >
                            {item.title}
                          </Link>
                        </CardTitle>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <span>
                          Listed {formatDistanceToNow(new Date(item.createdAt))} ago
                        </span>
                        •
                        {getStatusBadge(item.status)}
                        {item.recipientId && (
                          <>
                            •
                            <span className="flex items-center gap-1">
                              <Users className="h-4 w-4" />
                              Recipient selected
                            </span>
                          </>
                        )}
                      </div>
                      {item.pickupStart && (
                        <div className="mt-2 text-sm text-muted-foreground">
                          Pickup scheduled for{" "}
                          {new Date(item.pickupStart).toLocaleString()}
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
