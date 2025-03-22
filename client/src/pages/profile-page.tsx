import { useAuth } from "@/features/auth/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { Item } from "@shared/schema";
import Navbar from "@/components/navbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Gift, Tag, Clock, Users } from "lucide-react";
import { formatDate } from "@/lib/utils";
import { useState } from "react";

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
              {isEditing ? (
                <form onSubmit={async (e) => {
                  e.preventDefault();
                  const formData = new FormData(e.currentTarget);
                  try {
                    const response = await fetch('/api/user/profile', {
                      method: 'PATCH',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        displayName: formData.get('displayName'),
                        address: formData.get('address')
                      })
                    });
                    if (!response.ok) throw new Error('Failed to update profile');
                    const result = await response.json();
                    setIsEditing(false);
                    window.location.reload();
                  } catch (error) {
                    console.error('Error updating profile:', error);
                    alert('Failed to update profile. Please try again.');
                  }
                }} className="space-y-4">
                  <div>
                    <label className="text-sm font-medium mb-1 block">Display name:</label>
                    <input
                      name="displayName"
                      defaultValue={user.displayName}
                      className="w-full p-2 border rounded"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1 block">Address:</label>
                    <input
                      name="address"
                      defaultValue={user.address}
                      className="w-full p-2 border rounded"
                    />
                  </div>
                  <div className="flex gap-2">
                    <button type="submit" className="px-3 py-1 bg-primary text-primary-foreground rounded">
                      Save
                    </button>
                    <button type="button" onClick={() => setIsEditing(false)} className="px-3 py-1 border rounded">
                      Cancel
                    </button>
                  </div>
                </form>
              ) : (
                <div className="space-y-2">
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
                  <button onClick={() => setIsEditing(true)} className="text-sm px-3 py-1 border rounded">
                    Edit Profile
                  </button>
                </div>
              )}
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