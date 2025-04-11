import { useState } from "react";
import {
  format,
  addDays,
  addHours,
  isAfter,
  isBefore,
  startOfHour,
  parse,
} from "date-fns";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Clock, X, Plus, Loader2, CalendarIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
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
  DrawerFooter,
} from "@/components/ui/drawer";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

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
  const [calendarOpen, setCalendarOpen] = useState(false);

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
  };

  const removeTimeWindow = (index: number) => {
    setTimeWindows(timeWindows.filter((_, i) => i !== index));
  };

  return (
    <Drawer open={isOpen} onOpenChange={setIsOpen}>
      <DrawerTrigger asChild>
        <Button variant="outline">
          {["scheduling", "scheduled"].includes(itemStatus)
            ? "Change Times"
            : "Send Pickup Times"}
        </Button>
      </DrawerTrigger>
      <DrawerContent className="h-[85vh] sm:h-[85vh] sm:max-w-[600px] mx-auto flex flex-col">
        <DrawerHeader className="relative">
          <DrawerTitle>Schedule Item Pickup</DrawerTitle>
          <DrawerDescription className="flex items-center">
            <Badge variant="outline" className="mr-2">
              {timeWindows.length}/10
            </Badge>
            Propose up to 10 one-hour pickup time windows
          </DrawerDescription>
          <button
            onClick={() => setIsOpen(false)}
            className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none"
          >
            <X className="h-4 w-4" />
            <span className="sr-only">Close</span>
          </button>
        </DrawerHeader>

        <ScrollArea className="flex-1 px-4">
          <div className="space-y-6 pb-4">
            {/* Add Time Window Row */}
            <div className="flex items-end space-x-2">
              {/* Date Selector */}
              <div className="flex-1">
                <label className="text-sm font-medium pb-1.5 block">Date</label>
                <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !selectedDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {selectedDate ? (
                        format(selectedDate, "EEE, MMM d")
                      ) : (
                        <span>Select date</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={selectedDate}
                      onSelect={(date) => {
                        setSelectedDate(date);
                        setCalendarOpen(false);
                      }}
                      disabled={(date) =>
                        isBefore(date, now) || isAfter(date, twoWeeksFromNow)
                      }
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              {/* Time Selector */}
              <div className="flex-1">
                <label className="text-sm font-medium pb-1.5 block">Time</label>
                <Select
                  value={selectedHour?.toString()}
                  onValueChange={(value) => setSelectedHour(parseInt(value))}
                  disabled={!selectedDate}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select time" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableHours.map((hour) => (
                      <SelectItem key={hour} value={hour.toString()}>
                        {selectedDate
                          ? format(addHours(startOfHour(selectedDate), hour), "h:mm a")
                          : `${hour}:00`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Add Button */}
              <Button
                onClick={addTimeWindow}
                disabled={!selectedDate || selectedHour === undefined}
                size="icon"
                className="h-10 w-10 rounded-full flex-shrink-0"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>

            {/* Selected Time Windows */}
            <div className="space-y-2">
              <h3 className="text-sm font-medium">Selected Time Windows</h3>
              {timeWindows.length === 0 ? (
                <Alert>
                  <AlertDescription>
                    No time windows selected yet. Add at least one time window above.
                  </AlertDescription>
                </Alert>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {timeWindows.map((window, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 bg-secondary rounded-lg border border-border group"
                    >
                      <div className="flex items-center gap-2 overflow-hidden">
                        <Clock className="w-4 h-4 flex-shrink-0 text-muted-foreground" />
                        <span className="text-sm truncate">
                          {format(window.date, "EEE, MMM d")} at{" "}
                          {format(
                            addHours(startOfHour(window.date), window.hour),
                            "h:mm a"
                          )}
                        </span>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 flex-shrink-0"
                        onClick={() => removeTimeWindow(index)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Quick Add Presets */}
            {selectedDate && (
              <div className="space-y-2">
                <h3 className="text-sm font-medium">Quick Add</h3>
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      // Add morning (9am)
                      const morningHour = 9;
                      if (availableHours.includes(morningHour)) {
                        if (
                          !timeWindows.some(
                            (w) =>
                              w.date.getTime() === selectedDate.getTime() &&
                              w.hour === morningHour
                          )
                        ) {
                          setTimeWindows([
                            ...timeWindows,
                            { date: selectedDate, hour: morningHour },
                          ]);
                        }
                      }
                    }}
                  >
                    Morning (9am)
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      // Add afternoon (2pm)
                      const afternoonHour = 14;
                      if (availableHours.includes(afternoonHour)) {
                        if (
                          !timeWindows.some(
                            (w) =>
                              w.date.getTime() === selectedDate.getTime() &&
                              w.hour === afternoonHour
                          )
                        ) {
                          setTimeWindows([
                            ...timeWindows,
                            { date: selectedDate, hour: afternoonHour },
                          ]);
                        }
                      }
                    }}
                  >
                    Afternoon (2pm)
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      // Add evening (6pm)
                      const eveningHour = 18;
                      if (availableHours.includes(eveningHour)) {
                        if (
                          !timeWindows.some(
                            (w) =>
                              w.date.getTime() === selectedDate.getTime() &&
                              w.hour === eveningHour
                          )
                        ) {
                          setTimeWindows([
                            ...timeWindows,
                            { date: selectedDate, hour: eveningHour },
                          ]);
                        }
                      }
                    }}
                  >
                    Evening (6pm)
                  </Button>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Footer with Submit Button */}
        <DrawerFooter className="pt-2">
          <Button
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
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
