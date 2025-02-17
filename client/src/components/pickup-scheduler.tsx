import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { format, addMinutes } from "date-fns";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { 
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { Calendar as CalendarIcon, Clock } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface PickupSchedulerProps {
  itemId: number;
  onScheduled?: () => void;
}

export default function PickupScheduler({ itemId, onScheduled }: PickupSchedulerProps) {
  const { toast } = useToast();
  const [date, setDate] = useState<Date>();
  const [time, setTime] = useState<string>("12:00");
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [isTimeOpen, setIsTimeOpen] = useState(false);

  const scheduleMutation = useMutation({
    mutationFn: async () => {
      if (!date) return;

      const [hours, minutes] = time.split(":").map(Number);
      const pickupStart = new Date(date);
      pickupStart.setHours(hours, minutes, 0, 0);

      const pickupEnd = addMinutes(pickupStart, 60);

      const response = await apiRequest("POST", `/api/items/${itemId}/schedule-pickup`, {
        pickupStart: pickupStart.toISOString(),
        pickupEnd: pickupEnd.toISOString(),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to schedule pickup");
      }

      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Pickup scheduled",
        description: "Recipients can now confirm their pickup time.",
      });
      onScheduled?.();
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to schedule pickup",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const generateTimeSlots = () => {
    const slots: string[] = [];
    for (let i = 0; i < 24; i++) {
      for (let j = 0; j < 60; j += 30) {
        slots.push(
          `${i.toString().padStart(2, "0")}:${j.toString().padStart(2, "0")}`
        );
      }
    }
    return slots;
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col sm:flex-row gap-2">
        <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                "justify-start text-left font-normal w-full sm:w-[240px]",
                !date && "text-muted-foreground"
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {date ? format(date, "PPP") : "Pick a date"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={date}
              onSelect={(date) => {
                setDate(date);
                setIsCalendarOpen(false);
              }}
              disabled={(date) => date < new Date()}
              initialFocus
            />
          </PopoverContent>
        </Popover>

        <Popover open={isTimeOpen} onOpenChange={setIsTimeOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                "justify-start text-left font-normal w-full sm:w-[240px]",
                !time && "text-muted-foreground"
              )}
            >
              <Clock className="mr-2 h-4 w-4" />
              {time || "Pick a time"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-48" align="start">
            <div className="flex flex-col h-48 overflow-y-auto">
              {generateTimeSlots().map((slot) => (
                <Button
                  key={slot}
                  variant="ghost"
                  className="justify-start font-normal"
                  onClick={() => {
                    setTime(slot);
                    setIsTimeOpen(false);
                  }}
                >
                  {slot}
                </Button>
              ))}
            </div>
          </PopoverContent>
        </Popover>
      </div>

      <Button
        onClick={() => scheduleMutation.mutate()}
        disabled={!date || !time || scheduleMutation.isPending}
      >
        Schedule Pickup
      </Button>
    </div>
  );
}