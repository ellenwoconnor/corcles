import { AlertTriangle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { ExtendedItem } from "@/pages/listing-page";
import BaseListingView from "./base-listing-view";
import { cn } from "@/lib/utils";

interface DelistedListingViewProps {
  item: ExtendedItem;
}

export default function DelistedListingView({
  item,
}: DelistedListingViewProps) {
  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <BaseListingView
        item={item}
        isOwner={false}
        className="[&_img]:opacity-50 [&_img]:grayscale"
      >
        <Alert variant="destructive" className="mb-6">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>This item has been delisted</AlertTitle>
          <AlertDescription>
            This item is no longer available and cannot be requested or
            purchased.
          </AlertDescription>
        </Alert>
      </BaseListingView>
    </div>
  );
}
