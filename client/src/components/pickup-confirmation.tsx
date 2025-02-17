import { format } from "date-fns";
import { useMutation } from "@tanstack/react-query";
import { Item, ItemRequest, PickupWindow } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Check, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertTitle } from "@/components/ui/alert";
import { Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";

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
      queryClient.invalidateQueries({ queryKey: ["/api/user/requests"] }); // Also invalidate profile page requests
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
      <div className="space-y-4 border-t border-border pt-4">
        <div className="space-y-2">
          <h3 className="font-medium">Scheduled Pickup</h3>
          <p className="text-sm text-muted-foreground">
            {format(new Date(item.pickupStart!), "PPP p")} -{" "}
            {format(new Date(item.pickupEnd!), "p")}
          </p>
          <Badge variant="outline">
            {request.status === "completed" ? "Pickup Complete" : "Pickup Scheduled"}
          </Badge>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 border-t border-border pt-4">
      <div className="space-y-2">
        <h3 className="font-medium">Proposed Pickup Windows</h3>
        <div className="space-y-2">
          {item.proposedPickupWindows.map((window: PickupWindow, index: number) => (
            <div key={index} className="p-3 bg-secondary rounded-lg border border-border">
              <p className="text-sm">
                {format(new Date(window.pickupStart), "EEEE, MMMM d")} at{" "}
                {format(new Date(window.pickupStart), "h:mm a")} -{" "}
                {format(new Date(window.pickupEnd), "h:mm a")}
              </p>
            </div>
          ))}
        </div>
      </div>
      <div className="flex gap-2">
        <Button
          onClick={() => confirmMutation.mutate(true)}
          disabled={confirmMutation.isPending}
          className="flex-1"
        >
          <Check className="w-4 h-4 mr-2" />
          Confirm Pickup
        </Button>
        <Button
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