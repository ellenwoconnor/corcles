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
'use client';

export default function HomePage() {
  // Basic console.log to verify component mounting
  if (process.env.NODE_ENV === 'development') {
    console.log('HomePage component mounting');
  }

  const { user } = useAuth();
  const [searchValue, setSearchValue] = useState("");
  const [showFreeOnly, setShowFreeOnly] = useState(false);
  const [showWelcome, setShowWelcome] = useState(false);

  // Debug log after state initialization
  if (process.env.NODE_ENV === 'development') {
    console.log('Current state values:', { searchValue, showFreeOnly });
  }

  const { data: userCommunities = [] } = useQuery<
    (Community & { role: string; memberCount: number })[]
  >({
    queryKey: ["/api/user/communities"],
    enabled: !!user,
  });

  const communityIds = userCommunities.map((c) => c.id);

  const { data: items = [], isLoading } = useQuery<Item[]>({
    queryKey: ["/api/items", communityIds, searchValue, showFreeOnly],
    queryFn: async () => {
      if (communityIds.length === 0) return [];

      if (process.env.NODE_ENV === 'development') {
        console.log("Making API request with search:", searchValue);
      }

      const params = new URLSearchParams();
      params.append('communities', communityIds.join(','));

      if (searchValue.trim()) {
        params.append('search', searchValue.trim());
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
              if (process.env.NODE_ENV === 'development') {
                console.log("Search input change:", newValue);  // Debug log
              }
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
import React, { useState, useEffect } from "react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { fetchItems } from "@/lib/api";
import { useAuth } from "@/features/auth/hooks/use-auth";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { HomeIcon, LeafIcon, SearchIcon, ShirtIcon, GamepadIcon, BookOpenIcon, HeartIcon, PawPrintIcon } from "lucide-react";
import "@/styles/greenmarket.css";

export default function HomePage() {
  const [searchValue, setSearchValue] = useState("");
  const [showFreeOnly, setShowFreeOnly] = useState(false);
  const { user } = useAuth();

  const { data: items = [] } = useQuery({
    queryKey: ["/api/items", { search: searchValue, freeOnly: showFreeOnly }],
    queryFn: () => fetchItems({ search: searchValue, freeOnly: showFreeOnly }),
  });

  useEffect(() => {
    console.log("HomePage component mounting");
    console.log("Current state values:", { searchValue, showFreeOnly });
  }, [searchValue, showFreeOnly]);

  const categories = [
    { name: "Home & Garden", icon: <HomeIcon size={20} />, image: "https://images.unsplash.com/photo-1517705008128-361805f42e86" },
    { name: "Clothing", icon: <ShirtIcon size={20} />, image: "https://images.unsplash.com/photo-1556905055-8f358a7a47b2" },
    { name: "Toys & Games", icon: <GamepadIcon size={20} />, image: "https://images.unsplash.com/photo-1566576912321-d58ddd7a6088" },
    { name: "Books & Media", icon: <BookOpenIcon size={20} />, image: "https://images.unsplash.com/photo-1481627834876-b7833e8f5570" },
    { name: "Pet Supplies", icon: <PawPrintIcon size={20} />, image: "https://images.unsplash.com/photo-1548199973-03cce0bbc87b" },
    { name: "Sustainable", icon: <LeafIcon size={20} />, image: "https://images.unsplash.com/photo-1542601906990-b4d3fb778b09" },
  ];

  return (
    <div className="flex flex-col min-h-screen">
      {/* Header */}
      <header className="header">
        <div className="logo">
          <LeafIcon size={24} />
          <span>CommunityMarket</span>
        </div>
        <div className="search-container">
          <SearchIcon size={16} />
          <input 
            type="text" 
            placeholder="Search for items..."
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
          />
        </div>
        <div className="auth-buttons">
          <button className="sell-button">Sell</button>
          {!user ? (
            <Link href="/auth">
              <button className="login-button">Login</button>
            </Link>
          ) : (
            <Link href="/profile">
              <button className="login-button">Profile</button>
            </Link>
          )}
        </div>
      </header>

      {/* Hero Section */}
      <div className="hero">
        <div className="hero-content">
          <h1>Find unique, local, and sustainable items</h1>
          <div className="search-container" style={{ marginTop: '1rem', background: 'white' }}>
            <SearchIcon size={16} color="#333" />
            <input 
              type="text" 
              placeholder="Find something local..."
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Categories Section */}
      <section className="categories">
        <h2 className="section-title">Shop by category</h2>
        <div className="category-grid">
          {categories.map((category, index) => (
            <div key={index} className="category-card">
              <div 
                className="category-image" 
                style={{ backgroundImage: `url(${category.image})` }}
              ></div>
              <div className="category-name">
                {category.icon}
                <span style={{ marginLeft: '0.5rem' }}>{category.name}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Filter Options */}
      <div className="flex items-center gap-4 px-8 py-4">
        <div className="flex items-center gap-2">
          <Checkbox
            id="free-only"
            checked={showFreeOnly}
            onCheckedChange={(checked) => setShowFreeOnly(!!checked)}
          />
          <Label htmlFor="free-only">Free items only</Label>
        </div>
      </div>

      {/* Items Grid */}
      <div className="items-grid">
        {items.length > 0 ? (
          items.map((item) => (
            <Link key={item.id} href={`/item/${item.id}`}>
              <div className="item-card">
                <div 
                  className="item-image" 
                  style={{ 
                    backgroundImage: `url(${item.imageUrl || 'https://images.unsplash.com/photo-1588345921523-c2dcdb7f1dcd'})` 
                  }}
                ></div>
                <div className="item-details">
                  <h3 className="item-title">{item.title}</h3>
                  <p className="item-price">
                    {item.isGift ? 'Free' : `$${item.price}`}
                  </p>
                  <div className="item-location">
                    <HomeIcon size={14} />
                    {item.userDisplayName}'s Community
                  </div>
                </div>
              </div>
            </Link>
          ))
        ) : (
          <div className="col-span-full text-center py-8">
            <p className="text-gray-500">No items found. Try a different search.</p>
          </div>
        )}
      </div>

      {/* Join Community Banner */}
      <div className="banner">
        <h2>Join your local community</h2>
        <p>Connect with neighbors, share resources, and find unique items</p>
        <button className="banner-button">Find Communities</button>
      </div>
    </div>
  );
}
