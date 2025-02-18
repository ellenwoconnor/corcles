import { useState } from "react";
import { format } from "date-fns";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { PickupWindow } from "@shared/schema";
import { Loader2, X } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

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
  const [isDeclineDialogOpen, setIsDeclineDialogOpen] = useState(false);
  const [declineNote, setDeclineNote] = useState("");

  const selectTimeMutation = useMutation({
    mutationFn: async (options: { decline?: boolean; windowIndex?: number }) => {
      const response = await apiRequest(
        "POST",
        `/api/items/${itemId}/select-pickup-time`,
        options.decline 
          ? { decline: true, note: declineNote }
          : { windowIndex: options.windowIndex }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to process pickup time selection");
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success!",
        description: !isDeclineDialogOpen
          ? "The owner will be notified of your selection."
          : "The owner will be notified that the times don't work for you.",
      });
      queryClient.invalidateQueries({ queryKey: [`/api/items/${itemId}`] });
      queryClient.invalidateQueries({ queryKey: [`/api/items/${itemId}/my-requests`] });
      setIsDeclineDialogOpen(false);
      onSelected();
    },
    onError: (error: Error) => {
      toast({
        title: "Action failed",
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
          onClick={() => {
            if (selectedWindow !== undefined) {
              selectTimeMutation.mutate({ windowIndex: selectedWindow });
            }
          }}
        >
          {selectTimeMutation.isPending && !isDeclineDialogOpen ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Confirming selection...
            </>
          ) : (
            "Confirm Selected Time"
          )}
        </Button>

        <Dialog open={isDeclineDialogOpen} onOpenChange={setIsDeclineDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" className="flex-1">
              <X className="mr-2 h-4 w-4" />
              None Work
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Decline Time Windows</DialogTitle>
              <DialogDescription>
                Let the owner know why these times don't work for you (optional)
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <Textarea
                placeholder="Optional message to the owner..."
                value={declineNote}
                onChange={(e) => setDeclineNote(e.target.value)}
                className="min-h-[100px]"
              />
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => setIsDeclineDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  disabled={selectTimeMutation.isPending}
                  onClick={() => selectTimeMutation.mutate({ decline: true })}
                >
                  {selectTimeMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    "Send Response"
                  )}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}