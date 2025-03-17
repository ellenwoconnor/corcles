import { useState } from "react";
import { format } from "date-fns";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { PickupWindow } from "@shared/schema";
import { Loader2, Clock } from "lucide-react";
import { MessageDialog } from "./message-dialog";

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

  console.log("PickupTimeSelector mounted:", {
    itemId,
    itemOwnerId,
    currentUserId,
    requestId,
    windowsCount: windows?.length,
  });

  const selectTimeMutation = useMutation({
    mutationFn: async (windowIndex: number) => {
      const response = await apiRequest(
        "POST",
        `/api/items/${itemId}/select-pickup-time`,
        { windowIndex },
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(
          error.error || "Failed to process pickup time selection",
        );
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/items/${itemId}`] });
      queryClient.invalidateQueries({
        queryKey: [`/api/items/${itemId}/my-requests`],
      });
      queryClient.invalidateQueries({ queryKey: ["/api/user/requests"] });

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
    <div className="space-y-8 py-4">
      <div className="space-y-2">
        <p>Select a pickup time window from the options below.</p>
        <div className="grid grid-cols-1 gap-2">
          {windows.map((window: PickupWindow, index: number) => (
            <button
              key={index}
              onClick={() => {
                setSelectedWindow(index);
                selectTimeMutation.mutate(index);
              }}
              disabled={selectTimeMutation.isPending}
              className={`text-left px-3 py-2 rounded-md text-sm transition-colors
                ${
                  selectedWindow === index
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-secondary border border-border"
                }`}
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
      </div>
    </div>
  );
}
