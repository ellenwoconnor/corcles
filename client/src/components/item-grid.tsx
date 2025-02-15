import { Item } from "@shared/schema";
import ItemCard from "./item-card";

type ItemGridProps = {
  items: (Item & { userHasFavorited: boolean })[];
};

export default function ItemGrid({ items }: ItemGridProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {items.map((item) => (
        <ItemCard key={item.id} item={item} />
      ))}
    </div>
  );
}