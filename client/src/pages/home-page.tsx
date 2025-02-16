import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { Item } from "@shared/schema";
import Navbar from "@/components/navbar";
import ItemGrid from "@/components/item-grid";
import CreateListingDialog from "@/components/create-listing-dialog";
import { Loader2 } from "lucide-react";
import { SearchControls } from "@/components/search-controls";
import { useState } from "react";

export default function HomePage() {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [showFreeOnly, setShowFreeOnly] = useState(false);

  const { data: items, isLoading } = useQuery<Item[]>({
    queryKey: [`/api/items/${user?.community}`, { search: searchQuery, freeOnly: showFreeOnly }],
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

        <SearchControls 
          onSearchChange={setSearchQuery}
          onFreeOnlyChange={setShowFreeOnly}
        />

        {isLoading ? (
          <div className="flex items-center justify-center min-h-[400px]">
            <Loader2 className="h-8 w-8 animate-spin text-border" />
          </div>
        ) : items?.length === 0 ? (
          <div className="text-center py-12">
            <h2 className="text-xl font-semibold mb-2">No items found</h2>
            <p className="text-muted-foreground">
              {searchQuery 
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