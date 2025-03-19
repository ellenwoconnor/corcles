import { useState } from "react";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { toast } from "@/components/ui/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { format, addHours, isBefore, isAfter, startOfDay, endOfDay, addDays } from "date-fns";
import { X, Clock, CalendarIcon, ArrowRight } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

interface PickupSchedulerProps {
  itemId: number;
  itemStatus: string;
  onScheduled: () => void;
}

type TimeWindow = {
  date: Date;
  startTime: Date;
};

const HOURS = Array.from({ length: 24 }, (_, i) => i);

export default function PickupScheduler({ itemId, itemStatus, onScheduled }: PickupSchedulerProps) {
  const [step, setStep] = useState<'date' | 'time' | 'review'>('date');
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [timeWindows, setTimeWindows] = useState<TimeWindow[]>([]);
  const queryClient = useQueryClient();

  const now = new Date();
  const twoWeeksFromNow = addDays(now, 14);

  const mutation = useMutation({
    mutationFn: async () => {
      const windows = timeWindows.map(window => ({
        pickupStart: window.startTime.toISOString(),
        pickupEnd: addHours(window.startTime, 1).toISOString(),
      }));

      const response = await fetch(`/api/items/${itemId}/schedule`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ proposedPickupWindows: windows }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to schedule pickup");
      }
      return response.json();
    },
    onSuccess: () => {
      onScheduled();
      queryClient.invalidateQueries({ queryKey: [`/api/items/${itemId}`] });
      toast({
        title: "Pickup windows proposed!",
        description: "The recipient will choose one of the proposed time windows.",
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

  const addTimeWindow = (hour: number) => {
    if (!selectedDate) return;

    const startTime = new Date(selectedDate);
    startTime.setHours(hour, 0, 0, 0);

    if (isBefore(startTime, now)) {
      toast({
        title: "Invalid time",
        description: "Cannot select a time in the past",
        variant: "destructive",
      });
      return;
    }

    if (timeWindows.length >= 10) {
      toast({
        title: "Maximum windows reached",
        description: "You can only propose up to 10 time windows",
        variant: "destructive",
      });
      return;
    }

    const exists = timeWindows.some(
      window => window.startTime.getTime() === startTime.getTime()
    );

    if (exists) {
      toast({
        title: "Time window already added",
        description: "Please select a different time",
        variant: "destructive",
      });
      return;
    }

    setTimeWindows([...timeWindows, { date: selectedDate, startTime }]);
  };

  const removeTimeWindow = (index: number) => {
    setTimeWindows(timeWindows.filter((_, i) => i !== index));
  };

  const isTimeDisabled = (hour: number) => {
    if (!selectedDate) return true;
    const time = new Date(selectedDate);
    time.setHours(hour, 0, 0, 0);
    return isBefore(time, now);
  };

  const renderStep = () => {
    switch (step) {
      case 'date':
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-medium">1. Select a date</h3>
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={setSelectedDate}
              disabled={(date) => 
                isBefore(date, startOfDay(now)) || 
                isAfter(date, endOfDay(twoWeeksFromNow))
              }
              className="rounded-md border"
            />
            <Button 
              className="w-full"
              onClick={() => setStep('time')}
              disabled={!selectedDate}
            >
              Continue <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        );

      case 'time':
        return (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium">2. Select time slots</h3>
              <Button variant="ghost" size="sm" onClick={() => setStep('date')}>
                <CalendarIcon className="mr-2 h-4 w-4" />
                Change date
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">
              Selected date: {selectedDate && format(selectedDate, 'EEEE, MMMM d')}
            </p>
            <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
              {HOURS.map((hour) => (
                <Button
                  key={hour}
                  variant="outline"
                  size="sm"
                  disabled={isTimeDisabled(hour)}
                  onClick={() => addTimeWindow(hour)}
                  className="p-2 h-auto"
                >
                  {format(new Date().setHours(hour, 0), 'h:mm a')}
                </Button>
              ))}
            </div>
            <Button 
              className="w-full"
              onClick={() => setStep('review')}
              disabled={timeWindows.length === 0}
            >
              Review selections <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        );

      case 'review':
        return (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium">3. Review and confirm</h3>
              <Button variant="ghost" size="sm" onClick={() => setStep('time')}>
                Add more times
              </Button>
            </div>
            <ScrollArea className="h-[200px]">
              <div className="space-y-2">
                {timeWindows.map((window, index) => (
                  <Card key={index} className="p-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span>
                        {format(window.startTime, "EEE, MMM d 'at' h:mm a")} - {" "}
                        {format(addHours(window.startTime, 1), "h:mm a")}
                      </span>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeTimeWindow(index)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </Card>
                ))}
              </div>
            </ScrollArea>
            <Button
              className="w-full"
              onClick={() => mutation.mutate()}
              disabled={timeWindows.length === 0 || mutation.isPending}
            >
              {mutation.isPending ? "Scheduling..." : "Confirm time windows"}
            </Button>
          </div>
        );
    }
  };

  return (
    <div className="space-y-4">
      {renderStep()}
    </div>
  );
}