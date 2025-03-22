import { useAuth } from "@/features/auth/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { Item } from "@shared/schema";
import Navbar from "@/components/navbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Gift, Tag, Clock, Users } from "lucide-react";
import { formatDate } from "@/lib/utils";

export default function ProfilePage() {
  const { user } = useAuth();

  const { data: userItems, isLoading: itemsLoading } = useQuery<Item[]>({
    queryKey: ["/api/user/items"],
    enabled: !!user,
  });

  const { data: invitedUsers = [] } = useQuery<{ count: number }>({
    queryKey: ["/api/user/invites/count"],
    enabled: !!user,
  });

  if (!user) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="container py-12">
          <div className="text-center">
            <h2 className="text-2xl font-bold mb-2">Please Sign In</h2>
            <p className="text-muted-foreground">
              You need to be signed in to view your profile.
            </p>
          </div>
        </main>
      </div>
    );
  }

  if (itemsLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-border" />
      </div>
    );
  }

  const listedItems =
    userItems?.filter((i) => i.status === "available")?.length || 0;
  const completedItems =
    userItems?.filter((i) => i.status === "completed")?.length || 0;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container py-12">
        <div className="mb-8 space-y-4">
          <div className="space-y-4">
            <div>
              <h1 className="text-2xl tracking-tight mb-2">{user.username}</h1>
              <p className="text-sm flex items-center gap-2">
                <span className="font-medium">Display name:</span>
                <span className="text-muted-foreground">
                  {user.displayName}
                </span>
              </p>
              <p className="text-sm flex items-center gap-2">
                <span className="font-medium">Address:</span>
                <span className="text-muted-foreground">{user.address}</span>
              </p>
            </div>
          </div>
        </div>

        <div className="grid gap-4 grid-cols-2">
          <Card className="text-center">
            <div className="pt-6 flex justify-center">
              <Tag className="h-8 w-8 text-muted-foreground" />
            </div>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">
                Active Listings
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl">{listedItems}</div>
            </CardContent>
          </Card>

          <Card className="text-center">
            <div className="pt-6 flex justify-center">
              <Gift className="h-8 w-8 text-muted-foreground" />
            </div>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Items Given</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl">{completedItems}</div>
            </CardContent>
          </Card>

          <Card className="text-center">
            <div className="pt-6 flex justify-center">
              <Users className="h-8 w-8 text-muted-foreground" />
            </div>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">
                Users Invited
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl">{invitedUsers.count || 0}</div>
            </CardContent>
          </Card>

          <Card className="text-center">
            <div className="pt-6 flex justify-center">
              <Clock className="h-8 w-8 text-muted-foreground" />
            </div>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">
                Member Since
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl">{formatDate(user.createdAt)}</div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
