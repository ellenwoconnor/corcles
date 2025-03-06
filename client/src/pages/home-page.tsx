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
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import ItemCard from "@/components/item-card";

// Add 'use client' directive for Next.js strict mode
("use client");

export default function HomePage() {
  const { user } = useAuth();
  const [searchValue, setSearchValue] = useState("");
  const [showFreeOnly, setShowFreeOnly] = useState(false);
  const [showWelcome, setShowWelcome] = useState(false);
  const debouncedSearchValue = useDebounce(searchValue, 300);
  const { data: userCommunities = [] } = useQuery<
    (Community & { role: string; memberCount: number })[]
  >({
    queryKey: ["/api/user/communities"],
    enabled: !!user,
  });

  const communityIds = userCommunities.map((c) => c.id);

  const { data: items = [], isLoading } = useQuery<Item[]>({
    queryKey: ["/api/items", communityIds, debouncedSearchValue, showFreeOnly],
    queryFn: async () => {
      if (communityIds.length === 0) return [];
      const params = new URLSearchParams();
      params.append("communities", communityIds.join(","));

      if (debouncedSearchValue.trim()) {
        params.append("search", debouncedSearchValue.trim());
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
          <div className="relative">

        <div className="mt-8">
          <div className="flex items-center mb-4">
            <div className="relative grow mr-4">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search listings..."
                className="pl-8"
                value={searchValue}
                onChange={(e) => setSearchValue(e.target.value)}
              />
            </div>
            <div className="flex items-center">
              <Checkbox
                id="freeOnly"
                checked={showFreeOnly}
                onCheckedChange={(checked) => setShowFreeOnly(checked === true)}
                className="mr-2"
              />
              <Label htmlFor="freeOnly">Free only</Label>
            </div>
          </div>

          {isLoading ? (
            <div className="flex justify-center items-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : items.length === 0 ? (
            <Card className="p-6 text-center">
              <p>No items found in your communities.</p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {items.map((item) => (
                <ItemCard key={item.id} item={item} />
              ))}
            </div>
          )}
        </div>

            <div className="flex items-center border rounded-md px-3 focus-within:ring-2 focus-within:ring-primary/30 focus-within:border-primary transition-all">
              <Search className="h-4 w-4 text-muted-foreground mr-2 flex-shrink-0" />
              <input
                type="text"
                value={searchValue}
                onChange={(e) => {
                  const newValue = e.target.value;
                  setSearchValue(newValue);
                }}
                placeholder="Search items..."
                className="w-full py-2 bg-transparent border-0 outline-none text-sm placeholder:text-muted-foreground"
              />
              {searchValue && (
                <button
                  onClick={() => setSearchValue("")}
                  className="text-muted-foreground hover:text-foreground"
                  aria-label="Clear search"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="h-4 w-4"
                  >
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                  </svg>
                </button>
              )}
            </div>
          </div>

          <div className="flex items-center space-x-2 bg-background border rounded-md px-3 py-2 text-sm">
            <div className="flex items-center space-x-2 cursor-pointer" onClick={() => setShowFreeOnly(!showFreeOnly)}>
              <div className={`w-4 h-4 rounded border flex items-center justify-center ${showFreeOnly ? 'bg-primary border-primary' : 'border-input'}`}>
                {showFreeOnly && <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="h-3 w-3 text-primary-foreground"><polyline points="20 6 9 17 4 12"></polyline></svg>}
              </div>
              <Label htmlFor="free-only" className="flex items-center gap-2 cursor-pointer">
                <Gift className="h-4 w-4" />
                Show only free items
              </Label>
            </div>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center min-h-[400px]">
            <Loader2 className="h-8 w-8 animate-spin text-border" />
          </div>
        ) : !items || items.length === 0 ? (
          <div className="text-center py-12 space-y-3">
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-full border bg-background">
              <Search className="h-6 w-6 text-muted-foreground" />
            </div>
            <h2 className="text-xl font-semibold">No items found</h2>
            <p className="text-muted-foreground max-w-md mx-auto">
              {debouncedSearchValue
                ? `No results found for "${debouncedSearchValue}". Try different keywords or browse all items.`
                : showFreeOnly
                  ? "No free items available in your communities yet. Check back later or browse all items."
                  : communityIds.length === 0
                    ? "Join a community to see items available for sharing or sale."
                    : "Be the first to list an item in your communities."}
            </p>
            {debouncedSearchValue && (
              <button 
                onClick={() => setSearchValue("")} 
                className="mt-2 inline-flex items-center text-primary hover:underline"
              >
                Clear search
              </button>
            )}
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