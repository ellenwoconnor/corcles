
import { Wishlist } from "@shared/schema";
import WishlistItemCard from "./wishlist-item-card";

interface WishlistGridProps {
  wishlists: Wishlist[];
  emptyMessage?: string;
}

export default function WishlistGrid({ 
  wishlists, 
  emptyMessage = "No wishlist items found."
}: WishlistGridProps) {
  if (!wishlists || wishlists.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {wishlists.map((wishlist) => (
        <WishlistItemCard key={wishlist.id} wishlist={wishlist} />
      ))}
    </div>
  );
}
