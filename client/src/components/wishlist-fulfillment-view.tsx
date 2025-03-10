
import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter"; // Fixed import
import { Gift, ExternalLink } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { Item } from "@shared/schema";

interface WishlistFulfillmentViewProps {
  wishlistId: number;
  fulfillmentItems: Item[];
}

const WishlistFulfillmentView: React.FC<WishlistFulfillmentViewProps> = ({ 
  wishlistId, 
  fulfillmentItems 
}) => {
  const [, setLocation] = useLocation(); // Use useLocation instead of useNavigate
  
  if (!fulfillmentItems || fulfillmentItems.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-medium flex items-center gap-1.5">
        <Gift className="h-4 w-4 text-green-600" />
        Fulfillment Items
      </h3>
      
      {fulfillmentItems.map(item => (
        <Card key={item.id} className="overflow-hidden">
          <CardContent className="p-3">
            <div className="flex gap-3">
              <img 
                src={item.imageUrl} 
                alt={item.title}
                className="w-16 h-16 rounded object-cover" 
              />
              <div className="flex-1">
                <h4 className="font-medium text-sm">{item.title}</h4>
                <p className="text-xs text-muted-foreground">
                  Added {formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })}
                </p>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="mt-1 h-7 px-2 text-xs"
                  onClick={() => setLocation(`/item/${item.id}`)}
                >
                  <ExternalLink className="h-3 w-3 mr-1" />
                  View Item
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default WishlistFulfillmentView;
