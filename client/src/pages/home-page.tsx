import { useAuth } from "@/features/auth/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { Item, type Community } from "@shared/schema";
import Navbar from "@/components/navbar";
import ItemGrid from "@/components/item-grid";
import CreateListingDialog from "@/components/create-listing-dialog";
import { WelcomeDialog } from "@/components/welcome-dialog";
import { Loader2, Search, Gift } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import React, { useState, useEffect } from "react";
import { useDebounce } from "@/hooks/use-debounce";
import CommunityWishlists from "@/components/community-wishlists";

export default function HomePage() {
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [showFreeOnly, setShowFreeOnly] = useState(false);
  const [showWelcome, setShowWelcome] = useState(false);
  const debouncedSearch = useDebounce(search, 300);

  const { data: userCommunities = [] } = useQuery<
    (Community & { role: string; memberCount: number })[]
  >({
    queryKey: ["/api/user/communities"],
    enabled: !!user,
  });

  const communityIds = userCommunities.map((c) => c.id);

  const { data: items = [], isLoading } = useQuery<Item[]>({
    queryKey: ["/api/items", communityIds, debouncedSearch, showFreeOnly],
    queryFn: async () => {
      if (communityIds.length === 0) return [];

      const params = new URLSearchParams();
      params.append('communities', communityIds.join(','));

      if (debouncedSearch) {
        params.append('search', debouncedSearch);
      }

      if (showFreeOnly) {
        params.append('freeOnly', 'true');
      }

      const response = await fetch(`/api/items?${params}`);
      if (!response.ok) {
        throw new Error('Failed to fetch items');
      }
      return response.json();
    },
    enabled: communityIds.length > 0
  });

  useEffect(() => {
    if (user && userCommunities.length > 0) {
      const welcomeKey = `corcles-welcome-seen-${user.id}`;
      const hasSeenWelcome = localStorage.getItem(welcomeKey);
      if (!hasSeenWelcome) {
        setShowWelcome(true);
        localStorage.setItem(welcomeKey, 'true');
      }
    }
  }, [user, userCommunities]);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      {showWelcome && (
        <WelcomeDialog communities={userCommunities} />
      )}
      <main className="container py-12 px-8">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-8">
          <div>
            <h1 className="text-4xl font-bold tracking-tight">Marketplace</h1>
            <p className="text-muted-foreground">
              Browse items in your communities
            </p>
          </div>
          <div className="order-first sm:order-none">
            <CreateListingDialog communities={userCommunities} />
          </div>
        </div>

        <div className="space-y-4 mb-8">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search items..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="free-only"
              checked={showFreeOnly}
              onCheckedChange={setShowFreeOnly}
            />
            <Label htmlFor="free-only" className="flex items-center gap-2">
              <Gift className="h-4 w-4" />
              Show only free items
            </Label>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center min-h-[400px]">
            <Loader2 className="h-8 w-8 animate-spin text-border" />
          </div>
        ) : !items || items.length === 0 ? (
          <div className="text-center py-12">
            <h2 className="text-xl font-semibold mb-2">No items found</h2>
            <p className="text-muted-foreground">
              {search
                ? "Try adjusting your search terms"
                : showFreeOnly
                  ? "No free items available in your communities yet"
                  : communityIds.length === 0
                    ? "Join a community to see items"
                    : "Be the first to list an item in your communities"}
            </p>
          </div>
        ) : (
          <ItemGrid items={items} />
        )}

        <div className="mt-16">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-8">
            <div>
              <h2 className="text-3xl font-bold tracking-tight">Community Wishlists</h2>
              <p className="text-muted-foreground">
                Items your neighbors are looking for
              </p>
            </div>
          </div>
          <CommunityWishlists />
        </div>
      </main>
    </div>
  );
}