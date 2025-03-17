
import { Item } from "@shared/schema";
import { formatDistanceToNow } from "date-fns";
import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface BaseListingViewProps {
  item: Item;
  isOwner: boolean;
  children?: ReactNode;
  className?: string;
}

export default function BaseListingView({ item, children }: BaseListingViewProps) {
  return (
    <div className={cn("grid md:grid-cols-2 gap-8", className)}>
      {/* Item Image */}
      <div>
        <img
          src={item.imageUrl}
          alt={item.title}
          className="w-full rounded-lg object-cover aspect-square"
        />
      </div>

      {/* Item Details */}
      <div className="space-y-6">
        {/* Header Section */}
        <div>
          <h1 className="text-2xl tracking-tight mb-2">{item.title}</h1>
          <div className="flex items-center gap-4">
            {item.isGift ? (
              <div className="inline-block bg-primary text-primary-foreground px-3 py-1 rounded-full text-sm font-medium">
                Free
              </div>
            ) : (
              <p className="text-2xl font-bold text-primary">${item.price}</p>
            )}
          </div>
        </div>

        {/* User Info */}
        <div>
          <p className="font-medium">
            Listed by {item.userDisplayName || "Anonymous"}
          </p>
          <p className="text-sm text-muted-foreground">
            {formatDistanceToNow(new Date(item.createdAt), {
              addSuffix: true,
            })}
          </p>
        </div>

        {/* Description */}
        <div className="border-b border-border py-4">
          <p className="text-muted-foreground whitespace-pre-wrap">
            {item.description}
          </p>
        </div>

        {children}
      </div>
    </div>
  );
}
