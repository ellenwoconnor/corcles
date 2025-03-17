import { useState } from "react";
import {
  format,
  addDays,
  addHours,
  isAfter,
  isBefore,
  startOfHour,
} from "date-fns";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Clock, X, Plus, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { apiRequest } from "@/lib/queryClient";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";

interface TimeWindow {
  date: Date;
  hour: number;
}

interface PickupSchedulerProps {
  itemId: number;
  itemStatus: string;
  onScheduled: () => void;
}

export default function PickupScheduler({
  itemId,
  itemStatus,
  onScheduled,
}: PickupSchedulerProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [selectedHour, setSelectedHour] = useState<number>();
  const [timeWindows, setTimeWindows] = useState<TimeWindow[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  const now = new Date();
  const twoWeeksFromNow = addDays(now, 14);

  const availableHours = Array.from({ length: 24 }, (_, i) => i).filter(
    (hour) => {
      if (!selectedDate) return false;
      const date = addHours(selectedDate, hour);
      return isAfter(date, now) && isBefore(date, twoWeeksFromNow);
    },
  );

  const scheduleMutation = useMutation({
    mutationFn: async () => {
      if (timeWindows.length === 0) return;

      const windows = timeWindows.map((window) => {
        const pickupStart = startOfHour(addHours(window.date, window.hour));
        const pickupEnd = addHours(pickupStart, 1);
        return {
          pickupStart: pickupStart.toISOString(),
          pickupEnd: pickupEnd.toISOString(),
        };
      });

      console.log("Sending windows:", windows);

      const response = await apiRequest(
        "POST",
        `/api/items/${itemId}/schedule`,
        { proposedPickupWindows: windows },
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
        description:
          "The recipient will choose one of the proposed time windows.",
      });
      queryClient.invalidateQueries({ queryKey: [`/api/items/${itemId}`] });
      queryClient.invalidateQueries({
        queryKey: [`/api/items/${itemId}/requests`],
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to schedule pickup",
        description: error.message,
        variant: "destructive",
      });
    },
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

    const exists = timeWindows.some(
      (window) =>
        window.date.getTime() === selectedDate.getTime() &&
        window.hour === selectedHour,
    );

    if (exists) {
      toast({
        title: "Time window already added",
        description: "Please select a different time",
        variant: "destructive",
      });
      return;
    }

    setTimeWindows([
      ...timeWindows,
      { date: selectedDate, hour: selectedHour },
    ]);
    setSelectedHour(undefined); // Reset just the hour
    const hourSelect = document.querySelector('select');
    if (hourSelect) {
      setTimeout(() => hourSelect.focus(), 0);
    }
  };

  const removeTimeWindow = (index: number) => {
    setTimeWindows(timeWindows.filter((_, i) => i !== index));
  };

  return (
    <Drawer open={isOpen} onOpenChange={setIsOpen}>
      <DrawerTrigger asChild>
        <Button>
          {["scheduling", "scheduled"].includes(itemStatus)
            ? "Update pickup times"
            : "Send Pickup Times"}
        </Button>
      </DrawerTrigger>
      <DrawerContent className="h-[85vh] sm:h-[85vh] sm:max-w-[600px] mx-auto">
        <DrawerHeader className="relative">
          <DrawerTitle>Schedule Item Pickup</DrawerTitle>
          <DrawerDescription>
            Propose up to 10 one-hour windows for item pickup
          </DrawerDescription>
          <button 
            onClick={() => setIsOpen(false)}
            className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none"
          >
            <X className="h-4 w-4" />
            <span className="sr-only">Close</span>
          </button>
        </DrawerHeader>

        <div className="p-4 space-y-6 pb-20">
          {/* Date and Time Selection */}
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-medium">1. Select Date</label>
              {!selectedDate ? (
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={(date) => {
                    setSelectedDate(date);
                    setSelectedHour(undefined);
                  }}
                  disabled={(date) =>
                    isBefore(date, now) || isAfter(date, twoWeeksFromNow)
                  }
                  className="rounded-md border"
                />
              ) : (
                <div className="flex items-center justify-between p-3 bg-secondary rounded-lg border border-border">
                  <span>{format(selectedDate, "EEE, MMM d")}</span>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => setSelectedDate(undefined)}
                  >
                    Change
                  </Button>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">2. Select Hour</label>
              {selectedDate ? (
                <div className="space-y-4">
                  <Select
                    value={selectedHour?.toString()}
                    onValueChange={(value) => setSelectedHour(parseInt(value))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a time" />
                    </SelectTrigger>
                    <SelectContent side="bottom" align="start" className="max-h-[200px] overflow-y-auto z-50">
                      {availableHours.map((hour) => (
                        <SelectItem key={hour} value={hour.toString()}>
                          {format(
                            addHours(startOfHour(selectedDate), hour),
                            "h:mm a",
                          )}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Button
                    onClick={() => {
                      if (timeWindows.length > 0) {
                        setSelectedDate(undefined);
                        setSelectedHour(undefined);
                      }
                      addTimeWindow();
                    }}
                    disabled={selectedHour === undefined}
                    className="w-full"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    {timeWindows.length > 0 ? "Add More Times" : "Add Time Window"}
                  </Button>
                </div>
              ) : (
                <div className="text-sm text-muted-foreground">
                  Please select a date first
                </div>
              )}
            </div>
          </div>
          {/* Selected Time Windows */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium">Selected Time Windows</h3>
              <span className="text-sm text-muted-foreground">
                {timeWindows.length}/10 windows
              </span>
            </div>
            {timeWindows.length === 0 ? (
              <Alert>
                <AlertDescription>
                  No time windows selected. Select a date and time below to add
                  windows.
                </AlertDescription>
              </Alert>
            ) : (
              <div className="grid gap-2">
                {timeWindows.map((window, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 bg-secondary rounded-lg border border-border group"
                  >
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm">
                        {format(window.date, "EEE, MMM d")} at{" "}
                        {format(
                          addHours(startOfHour(window.date), window.hour),
                          "h:mm a",
                        )}
                      </span>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => removeTimeWindow(index)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
          {/* Submit Button */}
          <Button
            className="w-full"
            disabled={timeWindows.length === 0 || scheduleMutation.isPending}
            onClick={() => scheduleMutation.mutate()}
          >
            {scheduleMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Scheduling...
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