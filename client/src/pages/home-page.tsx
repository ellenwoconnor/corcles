import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { Item } from "@shared/schema";
import Navbar from "@/components/navbar";
import ItemGrid from "@/components/item-grid";
import CreateListingDialog from "@/components/create-listing-dialog";
import { Loader2, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useState, useEffect } from "react";
import { useDebounce } from "@/hooks/use-debounce";

export default function HomePage() {
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);

  const { data: items, isLoading } = useQuery<(Item & { userHasFavorited: boolean })[]>({
    queryKey: [`/api/items/${user?.community}`, debouncedSearch],
    queryFn: async () => {
      const searchParams = new URLSearchParams();
      if (debouncedSearch) {
        searchParams.append('search', debouncedSearch);
      }
      const response = await fetch(`/api/items/${user?.community}?${searchParams.toString()}`);
      if (!response.ok) {
        throw new Error('Failed to fetch items');
      }
      return response.json();
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

        <div className="relative mb-8">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search items..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
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