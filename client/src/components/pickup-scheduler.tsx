import { useState } from "react";
import { format, addDays, addHours, isAfter, isBefore, startOfHour } from "date-fns";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Loader2, X } from "lucide-react";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { useToast } from "@/hooks/use-toast";

interface TimeWindow {
  date: Date;
  hour: number;
}

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
  const [timeWindows, setTimeWindows] = useState<TimeWindow[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  const now = new Date();
  const twoWeeksFromNow = addDays(now, 14);

  const scheduleMutation = useMutation({
    mutationFn: async () => {
      if (timeWindows.length === 0) return;

      const windows = timeWindows.map(window => {
        const pickupStart = startOfHour(addHours(window.date, window.hour));
        const pickupEnd = addHours(pickupStart, 1);
        return {
          pickupStart: pickupStart.toISOString(),
          pickupEnd: pickupEnd.toISOString(),
        };
      });

      const response = await apiRequest(
        "POST",
        `/api/items/${itemId}/schedule`,
        { timeWindows: windows }
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
        title: "Pickup windows proposed!",
        description: "The recipient will choose one of the proposed time windows.",
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

  const addTimeWindow = () => {
    if (!selectedDate || selectedHour === undefined) return;
    if (timeWindows.length >= 10) {
      toast({
        title: "Maximum windows reached",
        description: "You can only propose up to 10 time windows",
        variant: "destructive",
      });
      return;
    }

    // Check if this window is already selected
    const exists = timeWindows.some(
      window => 
        window.date.getTime() === selectedDate.getTime() && 
        window.hour === selectedHour
    );

    if (exists) {
      toast({
        title: "Time window already added",
        description: "Please select a different time window",
        variant: "destructive",
      });
      return;
    }

    setTimeWindows([...timeWindows, { date: selectedDate, hour: selectedHour }]);
    setSelectedHour(undefined);
  };

  const removeTimeWindow = (index: number) => {
    setTimeWindows(timeWindows.filter((_, i) => i !== index));
  };

  return (
    <Drawer open={isOpen} onOpenChange={setIsOpen}>
      <DrawerTrigger asChild>
        <Button>Propose Pickup Times</Button>
      </DrawerTrigger>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>Schedule Item Pickup</DrawerTitle>
          <DrawerDescription>
            Propose up to 10 one-hour windows for item pickup
          </DrawerDescription>
        </DrawerHeader>
        <div className="p-4 space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Selected Time Windows ({timeWindows.length}/10)</label>
            <div className="space-y-2">
              {timeWindows.map((window, index) => (
                <div key={index} className="flex items-center justify-between p-2 bg-secondary rounded-md">
                  <span>
                    {format(window.date, "MMM d, yyyy")} at {format(addHours(startOfHour(now), window.hour), "ha")}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeTimeWindow(index)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
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
            disabled={!selectedDate || selectedHour === undefined}
            onClick={addTimeWindow}
          >
            Add Time Window
          </Button>
          <Button
            className="w-full"
            disabled={timeWindows.length === 0 || scheduleMutation.isPending}
            onClick={() => scheduleMutation.mutate()}
          >
            {scheduleMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Proposing times...
              </>
            ) : (
              "Propose Time Windows"
            )}
          </Button>
        </div>
      </DrawerContent>
    </Drawer>
  );
}