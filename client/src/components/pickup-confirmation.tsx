import { format } from "date-fns";
import { useMutation } from "@tanstack/react-query";
import { Item, ItemRequest, PickupWindow } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Check, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Clock } from "lucide-react";

interface PickupConfirmationProps {
  item: Item;
  request: ItemRequest;
}

export default function PickupConfirmation({ item, request }: PickupConfirmationProps) {
  const { toast } = useToast();

  const confirmMutation = useMutation({
    mutationFn: async (confirmed: boolean) => {
      const response = await apiRequest(
        "POST",
        `/api/items/${item.id}/confirm-pickup`,
        { confirmed }
      );
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to confirm pickup");
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Pickup confirmed",
        description: "The owner has been notified of your confirmation.",
      });
      queryClient.invalidateQueries({ queryKey: [`/api/items/${item.id}`] });
      queryClient.invalidateQueries({ queryKey: [`/api/items/${item.id}/my-requests`] });
      queryClient.invalidateQueries({ queryKey: ["/api/user/requests"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to confirm pickup",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  if (request.status === "accepted" || request.status === "completed") {
    return (
      <div className="space-y-2 border-t border-border pt-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="h-4 w-4" />
            <span>
              {format(new Date(item.pickupStart!), "MMM d")} at{" "}
              {format(new Date(item.pickupStart!), "h:mm a")} -{" "}
              {format(new Date(item.pickupEnd!), "h:mm a")}
            </span>
          </div>
          <Badge variant="outline">
            {request.status === "completed" ? "Complete" : "Scheduled"}
          </Badge>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3 border-t border-border pt-3">
      <div className="space-y-2">
        <h3 className="text-sm font-medium">Proposed Pickup Windows</h3>
        <div className="grid gap-2 sm:grid-cols-2">
          {(item.proposedPickupWindows || []).map((window: PickupWindow, index: number) => (
            <div key={index} className="p-2 bg-secondary rounded-lg border border-border">
              <p className="text-sm">
                {format(new Date(window.pickupStart), "EEE, MMM d")} at{" "}
                {format(new Date(window.pickupStart), "h:mm a")} -{" "}
                {format(new Date(window.pickupEnd), "h:mm a")}
              </p>
            </div>
          ))}
        </div>
      </div>
      <div className="flex gap-2">
        <Button
          size="sm"
          onClick={() => confirmMutation.mutate(true)}
          disabled={confirmMutation.isPending}
          className="flex-1"
        >
          <Check className="w-4 h-4 mr-2" />
          Confirm
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => confirmMutation.mutate(false)}
          disabled={confirmMutation.isPending}
          className="flex-1"
        >
          <X className="w-4 h-4 mr-2" />
          Decline
        </Button>
      </div>
    </div>
  );
}