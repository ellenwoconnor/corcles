import { useAuth } from "@/features/auth/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { Item, type Community } from "@shared/schema";
import Navbar from "@/components/navbar";
import ItemGrid from "@/components/item-grid";
import CreateListingDialog from "@/components/create-listing-dialog";
import { WelcomeDialog } from "@/components/welcome-dialog";
import { Loader2, Search, Gift } from "lucide-react";
import { Label } from "@/components/ui/label";
import React, { useState } from "react";
import { useDebounce } from "@/hooks/use-debounce";
import CommunityWishlists from "@/components/community-wishlists";

// Add 'use client' directive for Next.js strict mode
("use client");

export default function HomePage() {
  const { user } = useAuth();
  const [searchValue, setSearchValue] = useState("");
  const debouncedSearchValue = useDebounce(searchValue, 300); // Debounce with 300ms delay
  const [showFreeOnly, setShowFreeOnly] = useState(false);
  const [showWelcome, setShowWelcome] = useState(false);
  const { data: userCommunities = [] } = useQuery<
    (Community & { role: string; memberCount: number })[]
  >({
    queryKey: ["/api/user/communities"],
    enabled: !!user,
  });

  const communityIds = userCommunities.map((c) => c.id);

  const { data: items = [], isLoading } = useQuery<Item[]>({
    queryKey: ["/api/items", communityIds, debouncedSearchValue, showFreeOnly], // Use debounced value
    queryFn: async () => {
      if (communityIds.length === 0) return [];
      const params = new URLSearchParams();
      params.append("communities", communityIds.join(","));

      if (debouncedSearchValue && debouncedSearchValue.trim()) { // Use debounced value
        params.append("search", debouncedSearchValue.trim()); // Use debounced value
      }

      if (showFreeOnly) {
        params.append("freeOnly", "true");
      }

      const response = await fetch(`/api/items?${params}`);
      if (!response.ok) {
        throw new Error("Failed to fetch items");
      }
      return response.json();
    },
    enabled: communityIds.length > 0,
  });

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      {showWelcome && <WelcomeDialog communities={userCommunities} />}
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
          {/* Basic input for testing */}
          <input
            type="text"
            value={searchValue}
            onChange={(e) => {
              const newValue = e.target.value;
              setSearchValue(newValue);
            }}
            placeholder="Search items..."
            className="w-full p-2 border rounded"
          />

          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="free-only"
              checked={showFreeOnly}
              onChange={(e) => setShowFreeOnly(e.target.checked)}
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
              {searchValue
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
              <h2 className="text-3xl font-bold tracking-tight">
                Community Wishlists
              </h2>
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