import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { Item } from "@shared/schema";
import Navbar from "@/components/navbar";
import ItemGrid from "@/components/item-grid";
import CreateListingDialog from "@/components/create-listing-dialog";
import { Loader2, Search, Gift } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useState, useEffect } from "react";
import { useDebounce } from "@/hooks/use-debounce";

export default function HomePage() {
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [showFreeOnly, setShowFreeOnly] = useState(false);
  const debouncedSearch = useDebounce(search, 300);

  const { data: items, isLoading } = useQuery<(Item & { userHasFavorited: boolean })[]>({
    queryKey: [`/api/items/${user?.community}`, debouncedSearch, showFreeOnly],
    queryFn: async () => {
      const searchParams = new URLSearchParams();
      if (debouncedSearch) {
        searchParams.append('search', debouncedSearch);
      }
      const response = await fetch(`/api/items/${user?.community}?${searchParams.toString()}`);
      if (!response.ok) {
        throw new Error('Failed to fetch items');
      }
      const allItems = await response.json();
      return showFreeOnly ? allItems.filter((item: Item) => item.isGift) : allItems;
    },
    enabled: !!user?.community,
  });

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container py-12 px-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold tracking-tight">Marketplace</h1>
            <p className="text-muted-foreground">
              Browse items in your circles
            </p>
          </div>
          <CreateListingDialog />
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
        ) : items?.length === 0 ? (
          <div className="text-center py-12">
            <h2 className="text-xl font-semibold mb-2">No items found</h2>
            <p className="text-muted-foreground">
              {search 
                ? "Try adjusting your search terms"
                : showFreeOnly
                  ? "No free items available in your community yet"
                  : "Be the first to list an item in your community"}
            </p>
          </div>
        ) : (
          <ItemGrid items={items ?? []} />
        )}
      </main>
    </div>
  );
}