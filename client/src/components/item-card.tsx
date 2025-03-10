import { Item } from "@shared/schema";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Link } from "wouter";
import { formatDistanceToNow } from "date-fns";

type ItemCardProps = {
  item: Item;
};

export default function ItemCard({ item }: ItemCardProps) {
  return (
    <Link href={`/item/${item.id}`}>
      <Card className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer">
        <CardContent className="p-0">
          <div className="aspect-square relative">
            <img
              src={item.imageUrl}
              alt={item.title}
              className="object-cover w-full h-full"
            />
            <div className="absolute top-2 right-2 bg-primary text-primary-foreground px-2 py-1 rounded-full text-sm font-medium">
              {item.isGift ? "Free" : `$${item.price}`}
            </div>
          </div>
          <div className="p-3">
            <h3 className="font-semibold text-base mb-1 truncate">
              {item.title}
            </h3>
            <div className="mt-1">
              <span className="text-sm text-muted-foreground">
                {formatDistanceToNow(new Date(item.createdAt), {
                  addSuffix: true,
                })}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
