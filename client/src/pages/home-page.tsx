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
import { useState, useEffect } from "react";
import { useDebounce } from "@/hooks/use-debounce";
import CommunityWishlists from "@/components/community-wishlists";

export default function HomePage() {
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [showFreeOnly, setShowFreeOnly] = useState(false);
  const [showWelcome, setShowWelcome] = useState(false);
  const debouncedSearch = useDebounce(search, 300);
  
  // Force refetch when search terms change
  useEffect(() => {
    console.log('Search term changed to:', debouncedSearch);
    
    // Log to verify search term is properly captured
    console.log('Search query will use term:', typeof debouncedSearch, debouncedSearch);
    
    // Add a small delay to ensure the query key is updated before refetching
    const timer = setTimeout(() => {
      console.log('Triggering refetch for search:', debouncedSearch);
      refetch();
    }, 50);
    return () => clearTimeout(timer);
  }, [debouncedSearch, refetch]);

  const { data: userCommunities = [] } = useQuery<
    (Community & { role: string; memberCount: number })[]
  >({
    queryKey: ["/api/user/communities"],
    enabled: !!user,
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

  const communityIds = userCommunities.map((c) => c.id);

  const { data: items = [], isLoading, refetch } = useQuery<Item[]>({
    queryKey: ["/api/items", { communities: communityIds, search: debouncedSearch || '', freeOnly: showFreeOnly }],
    refetchOnWindowFocus: false,
    refetchInterval: 0,
    staleTime: 0,
    queryFn: async ({ queryKey }) => {
      const [_, params] = queryKey;
      const { communities, search, freeOnly } = params as { communities: number[], search: string, freeOnly: boolean };

      if (communities.length === 0) return [];

      const urlParams = new URLSearchParams();
      urlParams.append('communities', communities.join(','));

      // Always include the search parameter with proper null/undefined handling
      console.log(`Search value before adding to params: "${search}"`);
      if (search !== null && search !== undefined) {
        urlParams.append('search', search);
      } else {
        urlParams.append('search', '');
      }

      if (freeOnly) {
        urlParams.append('freeOnly', 'true');
      }

      const url = `/api/items?${urlParams.toString()}`;
      console.log('Fetching items with URL:', url);
      
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error('Failed to fetch items');
      }

      return response.json();
    },
    enabled: communityIds.length > 0,
    refetchOnMount: true,
  });

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