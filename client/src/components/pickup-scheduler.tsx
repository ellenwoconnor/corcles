import { useState } from "react";
import { format, addDays, addHours, isAfter, isBefore, startOfHour } from "date-fns";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Loader2 } from "lucide-react";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { useToast } from "@/hooks/use-toast";

interface PickupSchedulerProps {
  itemId: number;
  onScheduled: () => void;
}

export default function PickupScheduler({
  itemId,
  onScheduled,
}: PickupSchedulerProps) {
  const { toast } = useToast();
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [selectedHour, setSelectedHour] = useState<number>();
  const [isOpen, setIsOpen] = useState(false);

  const now = new Date();
  const twoWeeksFromNow = addDays(now, 14);

  const scheduleMutation = useMutation({
    mutationFn: async () => {
      if (!selectedDate || selectedHour === undefined) return;

      const pickupStart = startOfHour(addHours(selectedDate, selectedHour));
      const pickupEnd = addHours(pickupStart, 1);

      const response = await apiRequest(
        "POST",
        `/api/items/${itemId}/schedule`,
        {
          pickupStart: pickupStart.toISOString(),
          pickupEnd: pickupEnd.toISOString(),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to schedule pickup");
      }
      return response.json();
    },
    onSuccess: () => {
      setIsOpen(false);
      onScheduled();
      toast({
        title: "Pickup scheduled!",
        description: "The recipient has been notified of the pickup window.",
      });
      queryClient.invalidateQueries({ queryKey: [`/api/items/${itemId}`] });
      queryClient.invalidateQueries({ queryKey: [`/api/items/${itemId}/requests`] });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to schedule pickup",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const availableHours = Array.from({ length: 24 }, (_, i) => i).filter((hour) => {
    if (!selectedDate) return false;
    const date = addHours(selectedDate, hour);
    return isAfter(date, now) && isBefore(date, twoWeeksFromNow);
  });

  return (
    <Drawer open={isOpen} onOpenChange={setIsOpen}>
      <DrawerTrigger asChild>
        <Button>Schedule Pickup</Button>
      </DrawerTrigger>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>Schedule Item Pickup</DrawerTitle>
          <DrawerDescription>
            Select a one-hour window for item pickup
          </DrawerDescription>
        </DrawerHeader>
        <div className="p-4 space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Select Date</label>
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={setSelectedDate}
              disabled={(date) => isBefore(date, now) || isAfter(date, twoWeeksFromNow)}
            />
          </div>
          {selectedDate && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Select Hour</label>
              <div className="grid grid-cols-4 gap-2">
                {availableHours.map((hour) => (
                  <Button
                    key={hour}
                    variant={selectedHour === hour ? "default" : "outline"}
                    onClick={() => setSelectedHour(hour)}
                  >
                    {format(addHours(startOfHour(now), hour), "ha")}
                  </Button>
                ))}
              </div>
            </div>
          )}
          <Button
            className="w-full"
            disabled={!selectedDate || selectedHour === undefined || scheduleMutation.isPending}
            onClick={() => scheduleMutation.mutate()}
          >
            {scheduleMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Scheduling...
              </>
            ) : (
              "Confirm Pickup Window"
            )}
          </Button>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
