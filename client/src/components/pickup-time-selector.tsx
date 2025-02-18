import { useState } from "react";
import { format } from "date-fns";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { PickupWindow } from "@shared/schema";
import { Loader2 } from "lucide-react";

interface PickupTimeSelectorProps {
  itemId: number;
  windows: PickupWindow[];
  onSelected: () => void;
}

export default function PickupTimeSelector({
  itemId,
  windows,
  onSelected,
}: PickupTimeSelectorProps) {
  const { toast } = useToast();
  const [selectedWindow, setSelectedWindow] = useState<number>();

  const selectTimeMutation = useMutation({
    mutationFn: async () => {
      if (selectedWindow === undefined) return;

      const response = await apiRequest(
        "POST",
        `/api/items/${itemId}/select-pickup-time`,
        { windowIndex: selectedWindow }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to select pickup time");
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Pickup time selected!",
        description: "The owner will be notified of your selection.",
      });
      queryClient.invalidateQueries({ queryKey: [`/api/items/${itemId}`] });
      queryClient.invalidateQueries({ queryKey: [`/api/items/${itemId}/my-requests`] });
      onSelected();
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to select pickup time",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return (
    <div className="space-y-4">
      <h3 className="font-medium">Available Pickup Times</h3>
      <div className="space-y-2">
        {windows.map((window, index) => (
          <Button
            key={index}
            variant={selectedWindow === index ? "default" : "outline"}
            className={`w-full justify-start ${
              selectedWindow === index ? "ring-2 ring-primary" : ""
            }`}
            onClick={() => setSelectedWindow(index)}
          >
            <span className="text-left">
              {format(new Date(window.pickupStart), "EEEE, MMMM d")} at{" "}
              {format(new Date(window.pickupStart), "h:mm a")} -{" "}
              {format(new Date(window.pickupEnd), "h:mm a")}
            </span>
          </Button>
        ))}
      </div>
      <Button
        className="w-full"
        disabled={selectedWindow === undefined || selectTimeMutation.isPending}
        onClick={() => selectTimeMutation.mutate()}
      >
        {selectTimeMutation.isPending ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Confirming selection...
          </>
        ) : (
          "Confirm Selected Time"
        )}
      </Button>
    </div>
  );
}
