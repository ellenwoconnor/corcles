
import { AlertTriangle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ExtendedItem } from "@/pages/listing-page";
import { format } from "date-fns";

interface DelistedListingViewProps {
  item: ExtendedItem;
}

export default function DelistedListingView({ item }: DelistedListingViewProps) {
  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <Alert variant="destructive" className="mb-6">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>This item has been delisted</AlertTitle>
        <AlertDescription>
          This item is no longer available and cannot be requested or purchased.
        </AlertDescription>
      </Alert>
      
      <div className="grid md:grid-cols-2 gap-8">
        <div>
          <img
            src={item.imageUrl}
            alt={item.title}
            className="w-full rounded-lg object-cover aspect-square opacity-50 grayscale"
          />
        </div>
        
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-3xl font-bold">{item.title}</h1>
            <Badge variant="outline" className="text-muted-foreground">Delisted</Badge>
          </div>
          
          <div className="text-sm text-muted-foreground mb-4">
            Posted on {format(new Date(item.createdAt), "MMMM d, yyyy")}
          </div>
          
          <Card className="mb-6">
            <CardContent className="p-4">
              <div className="prose max-w-none text-muted-foreground">
                <p>{item.description}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
