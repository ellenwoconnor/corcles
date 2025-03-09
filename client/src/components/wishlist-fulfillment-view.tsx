
import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNavigate } from "wouter";
import { Gift, ExternalLink } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface WishlistFulfillmentViewProps {
  wishlistId: number;
  fulfillmentItems: any[];
}

export default function WishlistFulfillmentView({
  wishlistId,
  fulfillmentItems
}: WishlistFulfillmentViewProps) {
  const [, navigate] = useNavigate();

  if (!fulfillmentItems.length) {
    return null;
  }

  return (
    <Card className="mt-4 bg-green-50 border-green-200">
      <CardContent className="pt-4">
        <div className="flex items-center gap-2 mb-3">
          <Gift className="h-4 w-4 text-green-700" />
          <h3 className="font-medium text-green-700">
            {fulfillmentItems.length === 1 ? 
              "This wishlist has been fulfilled" : 
              `This wishlist has ${fulfillmentItems.length} fulfillment offers`}
          </h3>
        </div>
        
        {fulfillmentItems.map((item) => (
          <div key={item.id} className="mb-3 last:mb-0">
            <div className="flex items-center gap-3">
              <img 
                src={item.imageUrl} 
                alt={item.title} 
                className="w-12 h-12 rounded object-cover border" 
              />
              <div className="flex-1">
                <div className="font-medium">{item.title}</div>
                <div className="text-xs text-muted-foreground">
                  Offered {formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })}
                </div>
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                className="flex items-center gap-1"
                onClick={() => navigate(`/item/${item.id}`)}
              >
                <ExternalLink className="h-3 w-3" />
                View
              </Button>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
