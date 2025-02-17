import { useMutation } from "@tanstack/react-query";
import { Item, ItemRequest } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Clock } from "lucide-react";
import { format } from "date-fns";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface PickupConfirmationProps {
  item: Item;
  request: ItemRequest;
}

export default function PickupConfirmation({ item, request }: PickupConfirmationProps) {
  const { toast } = useToast();

  const confirmPickupMutation = useMutation({
    mutationFn: async (confirmed: boolean) => {
      const response = await apiRequest(
        "POST",
        `/api/items/${item.id}/confirm-pickup`,
        { confirmed }
      );
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to confirm pickup");
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Pickup confirmed",
        description: "The pickup window has been confirmed.",
      });
      queryClient.invalidateQueries({ queryKey: [`/api/items/${item.id}`] });
      queryClient.invalidateQueries({ queryKey: [`/api/items/${item.id}/my-requests`] });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to confirm pickup",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return (
    <div className="space-y-4">
      <Alert>
        <Clock className="h-4 w-4" />
        <AlertTitle>Pickup Confirmation Required</AlertTitle>
        <AlertDescription>
          The owner has proposed a pickup window. Please confirm if this time works for you.
        </AlertDescription>
      </Alert>

      <div className="space-y-2">
        <h3 className="font-medium">Proposed Pickup Window</h3>
        <p className="text-sm text-muted-foreground">
          {format(new Date(item.pickupStart!), "PPP p")} -{" "}
          {format(new Date(item.pickupEnd!), "p")}
        </p>
      </div>

      <div className="flex gap-2">
        <Button
          onClick={() => confirmPickupMutation.mutate(true)}
          disabled={confirmPickupMutation.isPending}
        >
          Confirm Pickup Time
        </Button>
        <Button
          variant="outline"
          onClick={() => confirmPickupMutation.mutate(false)}
          disabled={confirmPickupMutation.isPending}
        >
          Decline
        </Button>
      </div>
    </div>
  );
}
