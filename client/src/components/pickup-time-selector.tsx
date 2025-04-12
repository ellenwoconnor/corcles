import { useState } from "react";
import { format } from "date-fns";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { PickupWindow } from "@shared/schema";
import { Loader2, Clock, CalendarDays, CheckCircle2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

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
      
      toast({
        title: "Pickup scheduled!",
        description: "You've successfully scheduled the pickup time.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Action failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Group windows by date for better organization
  const windowsByDate = windows.reduce((acc, window, index) => {
    const date = format(new Date(window.pickupStart), "MMM d, yyyy");
    if (!acc[date]) {
      acc[date] = [];
    }
    acc[date].push({ window, index });
    return acc;
  }, {} as Record<string, { window: PickupWindow; index: number }[]>);

  return (
    <div className="space-y-4 py-2">
      <div className="flex items-center gap-1 mb-3">
        <CalendarDays className="h-4 w-4 text-primary" />
        <span className="text-sm font-medium">Select a pickup time</span>
      </div>
      
      {Object.entries(windowsByDate).map(([date, entries]) => (
        <div key={date} className="space-y-2">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="rounded-sm py-0.5 px-2">
              {date}
            </Badge>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {entries.map(({ window, index }) => (
              <Card
                key={index}
                className={`cursor-pointer transition-all hover:border-primary ${
                  selectedWindow === index ? "border-primary bg-primary/5" : ""
                }`}
                onClick={() => {
                  if (!selectTimeMutation.isPending) {
                    setSelectedWindow(index);
                    selectTimeMutation.mutate(index);
                  }
                }}
              >
                <CardContent className="p-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                    <span className="text-sm">
                      {format(new Date(window.pickupStart), "h:mm a")} - {format(new Date(window.pickupEnd), "h:mm a")}
                    </span>
                  </div>
                  {selectedWindow === index && (
                    <CheckCircle2 className="h-4 w-4 text-primary" />
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      ))}

      {selectTimeMutation.isPending && (
        <div className="flex justify-center mt-4">
          <div className="flex items-center gap-2 px-4 py-2 bg-muted rounded-md">
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
            <span className="text-sm">Confirming selection...</span>
          </div>
        </div>
      )}
    </div>
  );
}
