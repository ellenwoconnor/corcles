import { useAuth } from "@/features/auth/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { type Wishlist } from "@shared/schema";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "./ui/card";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Lock, Eye, Loader2, Users } from "lucide-react";

export default function CommunityWishlists() {
  const { user } = useAuth();

  const { data: communityWishlists = [], isLoading } = useQuery<(Wishlist & { communityName?: string })[]>({
    queryKey: ["/api/communities/wishlists"],
    enabled: !!user,
  });

  const { data: communities = [] } = useQuery<any[]>({
    queryKey: ["/api/user/communities"],
    enabled: !!user,
  });

  // Associate community names with wishlists
  const wishlistsWithCommunityNames = communityWishlists.map(wishlist => {
    const community = communities.find(c => c.id === wishlist.communityId);
    return {
      ...wishlist,
      communityName: community?.name || "Unknown Community"
    };
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <Loader2 className="h-8 w-8 animate-spin text-border" />
      </div>
    );
  }

  if (wishlistsWithCommunityNames.length === 0) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-semibold mb-2">No community wishlists</h2>
        <p className="text-muted-foreground">
          Join more communities to see what others are looking for
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {wishlistsWithCommunityNames.map((wishlist) => (
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
            <div className="flex flex-wrap gap-2 mb-2">
              <Badge variant="outline" className="flex items-center gap-1">
                <Users className="h-3 w-3" /> {wishlist.communityName}
              </Badge>
            </div>
            <div className="flex flex-wrap gap-2">
              {wishlist.budget && (
                <Badge variant="secondary">Budget: ${wishlist.budget}</Badge>
              )}
              <Badge variant="secondary">Priority: {wishlist.urgency}</Badge>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
