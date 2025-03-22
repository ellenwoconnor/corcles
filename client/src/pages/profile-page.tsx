import { useAuth } from "@/features/auth/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { Item } from "@shared/schema";
import Navbar from "@/components/navbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Gift, Tag, Clock, Users } from "lucide-react";
import { formatDate } from "@/lib/utils";
import { useState } from "react";
import { Button } from "@/components/ui/button";

export default function ProfilePage() {
  const { user } = useAuth();
  const [isEditing, setIsEditing] = useState(false);

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

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container py-12">
        <h1 className="text-2xl tracking-tight mb-8">{user.username}</h1>
        <div className="mb-8">
          <Card>
            <CardContent>
              <div className="space-y-6">
                <div className="mt-8">
                  {isEditing ? (
                    <form
                      onSubmit={async (e) => {
                        e.preventDefault();
                        const formData = new FormData(e.currentTarget);
                        try {
                          const response = await fetch("/api/user/profile", {
                            method: "PATCH",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                              displayName: formData.get("displayName"),
                              address: formData.get("address"),
                            }),
                          });
                          if (!response.ok)
                            throw new Error("Failed to update profile");
                          const result = await response.json();
                          setIsEditing(false);
                          window.location.reload();
                        } catch (error) {
                          console.error("Error updating profile:", error);
                          alert("Failed to update profile. Please try again.");
                        }
                      }}
                      className="space-y-4"
                    >
                      <div>
                        <label className="text-sm font-medium block mb-2">
                          Display Name
                        </label>
                        <input
                          name="displayName"
                          defaultValue={user.displayName}
                          className="w-full p-2 border rounded-md"
                          required
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium block mb-2">
                          Address
                        </label>
                        <input
                          name="address"
                          defaultValue={user.address}
                          className="w-full p-2 border rounded-md"
                          required
                        />
                      </div>
                      <div className="flex gap-2 mt-4">
                        <Button type="submit" variant="default">
                          Save Changes
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setIsEditing(false)}
                        >
                          Cancel
                        </Button>
                      </div>
                    </form>
                  ) : (
                    <div className="space-y-4">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground mb-1">
                          Display Name
                        </p>
                        <p>{user.displayName}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-muted-foreground mb-1">
                          Address
                        </p>
                        <p>{user.address}</p>
                      </div>
                      <Button
                        onClick={() => setIsEditing(true)}
                        variant="outline"
                        className="mt-2"
                      >
                        Edit Profile
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
        <div className="grid gap-4 grid-cols-2">
          <Card className="text-center bg-muted bg-opacity-30">
            <div className="pt-6 flex justify-center">
              <Tag className="h-8 w-8 text-muted-foreground" />
            </div>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">
                Active Listings
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl">
                {userItems?.filter((i) => i.status === "available")?.length ||
                  0}
              </div>
            </CardContent>
          </Card>

          <Card className="text-center bg-muted bg-opacity-30">
            <div className="pt-6 flex justify-center">
              <Gift className="h-8 w-8 text-muted-foreground" />
            </div>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Items Given</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl">
                {userItems?.filter((i) => i.status === "completed")?.length ||
                  0}
              </div>
            </CardContent>
          </Card>

          <Card className="text-center bg-muted bg-opacity-30">
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

          <Card className="text-center bg-muted bg-opacity-30">
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
