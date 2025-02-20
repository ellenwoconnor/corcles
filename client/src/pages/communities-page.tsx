import { useAuth } from "@/features/auth/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { Community } from "@shared/schema";
import Navbar from "@/components/navbar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Users } from "lucide-react";
import CreateCommunityDialog from "@/components/create-community-dialog";
import { format } from "date-fns";

export default function CommunitiesPage() {
  const { user } = useAuth();

  const { data: communities, isLoading } = useQuery<Community[]>({
    queryKey: ["/api/user/communities"],
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
              You need to be signed in to view your communities.
            </p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container py-12">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-8">
          <div>
            <h1 className="text-4xl font-bold tracking-tight">My Communities</h1>
            <p className="text-muted-foreground">
              Manage your community memberships
            </p>
          </div>
          <CreateCommunityDialog />
        </div>

        <div className="grid gap-4">
          {!communities || communities.length === 0 ? (
            <Card>
              <CardHeader>
                <CardTitle>No Communities</CardTitle>
                <CardDescription>
                  You haven't joined any communities yet.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button variant="outline" className="mt-2">
                  <Plus className="h-4 w-4 mr-2" />
                  Create your first community
                </Button>
              </CardContent>
            </Card>
          ) : (
            communities.map((community) => (
              <Card key={community.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle>{community.name}</CardTitle>
                      <CardDescription>
                        Created{" "}
                        {format(new Date(community.createdAt), "MMMM d, yyyy")}
                      </CardDescription>
                    </div>
                    <Button variant="outline" size="icon">
                      <Users className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    {community.description || "No description provided"}
                  </p>
                  <div className="mt-4">
                    <div className="text-sm">
                      <span className="font-medium">Area: </span>
                      <span className="text-muted-foreground">
                        {community.zipCode}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </main>
    </div>
  );
}
