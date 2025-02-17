import { useState } from "react";
import { format } from "date-fns";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { PickupWindow } from "@shared/schema";
import { Loader2, Check, X } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";

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
  const [declineNote, setDeclineNote] = useState("");
  const [showDeclineDialog, setShowDeclineDialog] = useState(false);

  const selectTimeMutation = useMutation({
    mutationFn: async (decline: boolean) => {
      if (decline) {
        const response = await apiRequest(
          "POST",
          `/api/items/${itemId}/select-pickup-time`,
          { declined: true, note: declineNote }
        );

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || "Failed to decline pickup times");
        }
        return response.json();
      }

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
    onSuccess: (_, decline) => {
      toast({
        title: decline ? "Pickup times declined" : "Pickup time selected!",
        description: decline
          ? "The owner will be notified of your decision."
          : "The owner will be notified of your selection.",
      });
      queryClient.invalidateQueries({ queryKey: [`/api/items/${itemId}`] });
      queryClient.invalidateQueries({ queryKey: [`/api/items/${itemId}/my-requests`] });
      onSelected();
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to process request",
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
      <div className="flex gap-2">
        <Button
          className="flex-1"
          disabled={selectedWindow === undefined || selectTimeMutation.isPending}
          onClick={() => selectTimeMutation.mutate(false)}
        >
          {selectTimeMutation.isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Confirming selection...
            </>
          ) : (
            <>
              <Check className="mr-2 h-4 w-4" />
              Accept Selected Time
            </>
          )}
        </Button>

        <AlertDialog open={showDeclineDialog} onOpenChange={setShowDeclineDialog}>
          <AlertDialogTrigger asChild>
            <Button variant="outline" className="flex-1">
              <X className="mr-2 h-4 w-4" />
              Decline All Times
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Decline All Pickup Times</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to decline all proposed pickup times? You can leave an
                optional note for the owner explaining why.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="space-y-4">
              <Textarea
                placeholder="Optional: Let the owner know why these times don't work for you..."
                value={declineNote}
                onChange={(e) => setDeclineNote(e.target.value)}
                className="min-h-[100px]"
              />
              <div className="flex justify-end gap-2">
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => {
                    setShowDeclineDialog(false);
                    selectTimeMutation.mutate(true);
                  }}
                  disabled={selectTimeMutation.isPending}
                >
                  {selectTimeMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Declining...
                    </>
                  ) : (
                    "Confirm Decline"
                  )}
                </AlertDialogAction>
              </div>
            </div>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}