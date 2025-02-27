import { useAuth } from "@/features/auth/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { type Wishlist } from "@shared/schema";
import Navbar from "@/components/navbar";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import CreateWishlistDialog from "@/components/create-wishlist-dialog";
import { Loader2, Lock, Eye } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function WishlistsPage() {
  const { user } = useAuth();
  const [dialogOpen, setDialogOpen] = useState(false);

  const { data: userWishlists = [], isLoading: isLoadingUserWishlists } =
    useQuery<Wishlist[]>({
      queryKey: ["/api/user/wishlists"],
      enabled: !!user,
    });

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container py-12 px-8">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-8">
          <div>
            <h1 className="text-4xl font-bold tracking-tight">Wishlists</h1>
            <p className="text-muted-foreground">
              Post items you're looking for
            </p>
          </div>
          <div>
            <Button onClick={() => setDialogOpen(true)}>Add Item</Button>
          </div>
        </div>

        {isLoadingUserWishlists ? (
          <div className="flex items-center justify-center min-h-[200px]">
            <Loader2 className="h-8 w-8 animate-spin text-border" />
          </div>
        ) : userWishlists.length === 0 ? (
          <div className="text-center py-12">
            <h2 className="text-xl font-semibold mb-2">No wishlists yet</h2>
            <p className="text-muted-foreground">
              Create your first wishlist to keep track of items you want
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {userWishlists.map((wishlist) => (
              <Card key={wishlist.id}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    {wishlist.title}
                    {wishlist.isPrivate ? (
                      <Lock className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <Eye className="h-4 w-4 text-muted-foreground" />
                    )}
                  </CardTitle>
                  <CardDescription>{wishlist.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {wishlist.budget && (
                      <Badge variant="secondary">
                        Budget: ${wishlist.budget}
                      </Badge>
                    )}
                    <Badge variant="secondary">
                      Priority: {wishlist.urgency}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <CreateWishlistDialog open={dialogOpen} onOpenChange={setDialogOpen} />
      </main>
    </div>
  );
}
