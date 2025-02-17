import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format, addHours, isBefore, startOfToday } from "date-fns";
import { cn } from "@/lib/utils";
import { Calendar as CalendarIcon } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

const timeSlots = Array.from({ length: 24 }, (_, i) => {
  const hour = i.toString().padStart(2, '0');
  return { value: `${hour}:00`, label: `${hour}:00` };
});

const scheduleSchema = z.object({
  date: z.date(),
  time: z.string(),
});

type ScheduleForm = z.infer<typeof scheduleSchema>;

interface PickupSchedulerProps {
  itemId: number;
  onScheduled: () => void;
}

export default function PickupScheduler({ itemId, onScheduled }: PickupSchedulerProps) {
  const { toast } = useToast();
  const form = useForm<ScheduleForm>({
    resolver: zodResolver(scheduleSchema),
  });

  const scheduleMutation = useMutation({
    mutationFn: async (values: ScheduleForm) => {
      const [hours] = values.time.split(':').map(Number);
      const pickupStart = new Date(values.date);
      pickupStart.setHours(hours, 0, 0, 0);
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
        throw new Error(error.message || "Failed to schedule pickup");
      }

      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Pickup scheduled",
        description: "The pickup window has been set.",
      });
      form.reset();
      onScheduled();
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to schedule pickup",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (values: ScheduleForm) => {
    scheduleMutation.mutate(values);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid gap-4">
          <FormField
            control={form.control}
            name="date"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Pickup Date</FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant="outline"
                        className={cn(
                          "pl-3 text-left font-normal",
                          !field.value && "text-muted-foreground"
                        )}
                      >
                        {field.value ? (
                          format(field.value, "PPP")
                        ) : (
                          <span>Pick a date</span>
                        )}
                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={field.value}
                      onSelect={field.onChange}
                      disabled={(date) => isBefore(date, startOfToday())}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="time"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Pickup Time</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a time" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {timeSlots.map((slot) => (
                      <SelectItem key={slot.value} value={slot.value}>
                        {slot.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <Button type="submit" disabled={scheduleMutation.isPending}>
          Schedule Pickup
        </Button>
      </form>
    </Form>
  );
}
