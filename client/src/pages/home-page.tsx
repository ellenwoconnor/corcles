import { useAuth } from "@/features/auth/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { Item, type Community } from "@shared/schema";
import Navbar from "@/components/navbar";
import ItemGrid from "@/components/item-grid";
import CreateListingDialog from "@/components/create-listing-dialog";

import { Loader2, Search, Gift } from "lucide-react";
import React, { useState } from "react";
import { useDebounce } from "@/hooks/use-debounce";
import CommunityWishlists from "@/components/community-wishlists";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import ItemCard from "@/components/item-card";
import FadeIn from "@/components/fade-in";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import CreateWishlistDialog from "@/components/create-wishlist-dialog";
import EmptyMarketplace from "@/components/empty-marketplace";

// Add 'use client' directive for Next.js strict mode
("use client");

export default function HomePage() {
  const { user, isLoading } = useAuth();
  const [searchValue, setSearchValue] = useState("");

  // Show loading state while checking auth
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex justify-center items-center min-h-[50vh]">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }
  const [showFreeOnly, setShowFreeOnly] = useState(false);
  const [showWelcome, setShowWelcome] = useState(() => {
    // Show welcome dialog if user hasn't seen it before
    const hasSeenWelcome = localStorage.getItem('hasSeenWelcome');
    return !hasSeenWelcome;
  });
  const [createWishlistDialogOpen, setCreateWishlistDialogOpen] =
    useState(false); // Added state
  const debouncedSearchValue = useDebounce(searchValue, 300);
  const { data: userCommunities = [] } = useQuery<
    (Community & { role: string; memberCount: number })[]
  >({
    queryKey: ["/api/user/communities"],
    enabled: !!user,
  });

  const communityIds = userCommunities.map((c) => c.id);

  const { data: items = [], isLoading: isLoadingItems } = useQuery<Item[]>({
    queryKey: ["/api/items", communityIds, debouncedSearchValue, showFreeOnly],
    queryFn: async () => {
      if (communityIds.length === 0) return [];
      const params = new URLSearchParams();
      params.append("communities", communityIds.join(","));

      if (debouncedSearchValue.trim()) {
        params.append("search", debouncedSearchValue.trim());
      }

      // Always explicitly send the freeOnly parameter
      params.append("freeOnly", showFreeOnly ? "true" : "false");

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
        <FadeIn>
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-8">
            <div>
              <FadeIn>
                <h1 className="text-2xl tracking-tight">Marketplace</h1>
              </FadeIn>
              <p className="text-muted-foreground">
                Browse items in your communities
              </p>
            </div>
            <div className="sm:order-none">
              <CreateListingDialog communities={userCommunities} />
            </div>
          </div>
        </FadeIn>

        <div className="space-y-4 mb-8">
          <div className="relative">
            <div className="mt-8">
              <div className="flex items-center mb-4">
                <div className="relative grow mr-4">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="search"
                    placeholder="Search listings"
                    className="pl-8"
                    value={searchValue}
                    onChange={(e) => setSearchValue(e.target.value)}
                  />
                </div>
                <div className="flex items-center">
                  <Checkbox
                    id="freeOnly"
                    checked={showFreeOnly}
                    onCheckedChange={(checked) =>
                      setShowFreeOnly(checked === true)
                    }
                    className="mr-2"
                  />
                  <Label htmlFor="freeOnly">Free only</Label>
                </div>
              </div>

              {isLoadingItems ? (
                <div className="flex justify-center items-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : items.length === 0 ? (
                <div className="flex justify-center items-center min-h-[50vh]">
                  <Card className="p-6 border-none">
                    <EmptyMarketplace />
                  </Card>
                </div>
              ) : (
                <FadeIn delay={0.1}>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {items.map((item, index) => (
                      <FadeIn key={item.id} delay={index * 0.1}>
                        <ItemCard item={item} />
                      </FadeIn>
                    ))}
                  </div>
                </FadeIn>
              )}
            </div>
          </div>

          <div className="mt-24">
            <FadeIn>
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 my-8">
                <div>
                  <FadeIn>
                    <h1 className="text-2xl tracking-tight">
                      Community Wishlist
                    </h1>
                  </FadeIn>
                  <p className="text-muted-foreground">
                    Items your neighbors are looking for
                  </p>
                </div>
                <div className="sm:order-none">
                  <CreateWishlistDialog
                    open={createWishlistDialogOpen}
                    onOpenChange={setCreateWishlistDialogOpen}
                  />
                </div>
              </div>
            </FadeIn>
            <FadeIn delay={0.2}>
              <CommunityWishlists />
            </FadeIn>
          </div>
        </div>
      </main>
    </div>
  );
}
