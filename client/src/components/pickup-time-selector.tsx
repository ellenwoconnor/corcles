import { useState } from "react";
import { format } from "date-fns";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { PickupWindow } from "@shared/schema";
import { Loader2, Clock } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { MessageDialog } from "./message-dialog";
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
  itemOwnerId: number;
  currentUserId: number;
  requestId: number;
  windows: PickupWindow[];
  onSelected: () => void;
}

export default function PickupTimeSelector({
  itemId,
  itemOwnerId,
  currentUserId,
  requestId,
  windows,
  onSelected,
}: PickupTimeSelectorProps) {
  const { toast } = useToast();
  const [selectedWindow, setSelectedWindow] = useState<number>();
  const [isDeclineDialogOpen, setIsDeclineDialogOpen] = useState(false);
  const [declineNote, setDeclineNote] = useState("");

  console.log('PickupTimeSelector mounted:', {
    itemId,
    itemOwnerId,
    currentUserId,
    requestId,
    windowsCount: windows?.length
  });

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
          ? "Your time selection has been confirmed."
          : "The owner will be notified that the times don't work for you.",
      });

      queryClient.invalidateQueries({ queryKey: [`/api/items/${itemId}`] });
      queryClient.invalidateQueries({ queryKey: [`/api/items/${itemId}/my-requests`] });
      queryClient.invalidateQueries({ queryKey: ['/api/user/requests'] });

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
      {windows && windows.length > 0 && (
        <MessageDialog
          requestId={requestId}
          currentUserId={currentUserId}
          otherPartyId={currentUserId === itemOwnerId ? requestId : itemOwnerId}
          recipientId={itemOwnerId}
        />
      )}
      <div className="space-y-2">
        <div className="grid grid-cols-1 gap-1.5">
          {windows.map((window: PickupWindow, index: number) => (
            <button
              key={index}
              onClick={() => {
                setSelectedWindow(index);
                selectTimeMutation.mutate({ windowIndex: index });
              }}
              disabled={selectTimeMutation.isPending}
              className={`text-left px-3 py-2 rounded-md text-sm transition-colors
                ${selectedWindow === index
                  ? 'bg-primary text-primary-foreground'
                  : 'hover:bg-secondary border border-border'}`}
            >
              <div className="flex items-center gap-2">
                <Clock className="w-3.5 h-3.5" />
                <span>
                  {format(new Date(window.pickupStart), "EEE, MMM d")} at{" "}
                  {format(new Date(window.pickupStart), "h:mm a")} -{" "}
                  {format(new Date(window.pickupEnd), "h:mm a")}
                </span>
              </div>
            </button>
          ))}
        </div>

        <Dialog open={isDeclineDialogOpen} onOpenChange={setIsDeclineDialogOpen}>
          <DialogTrigger asChild>
            <button
              className="text-sm text-muted-foreground hover:text-foreground transition-colors w-full text-center mt-1"
              disabled={selectTimeMutation.isPending}
            >
              None of these times work for me
            </button>
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
                  size="sm"
                  onClick={() => setIsDeclineDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  disabled={selectTimeMutation.isPending}
                  onClick={() => selectTimeMutation.mutate({ decline: true })}
                >
                  {selectTimeMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
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