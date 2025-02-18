import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertMessageSchema } from "@shared/schema";
import { useQueryClient, useMutation, useQuery } from "@tanstack/react-query";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useWebSocket } from "@/hooks/use-websocket";
import { apiRequest } from "@/lib/queryClient";
import { format } from "date-fns";

interface Message {
  id: number;
  content: string;
  senderId: number;
  recipientId: number;
  createdAt: string;
}

interface MessageDialogProps {
  recipientId: number;
  requestId: number;
  currentUserId: number;
}

export function MessageDialog({ recipientId, requestId, currentUserId }: MessageDialogProps) {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();
  const ws = useWebSocket();

  const form = useForm({
    resolver: zodResolver(insertMessageSchema),
    defaultValues: {
      content: "",
      recipientId,
      requestId
    }
  });

  const { data: messages = [] } = useQuery({
    queryKey: ['/api/messages', recipientId, requestId],
    queryFn: () => fetch(`/api/messages/${recipientId}/${requestId}`).then(res => res.json()),
    enabled: open
  });

  const { mutate: sendMessage, isPending } = useMutation({
    mutationFn: (values: any) => {
      return fetch('/api/messages/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(values)
      }).then(res => res.json());
    },
    onSuccess: () => {
      form.reset();
      queryClient.invalidateQueries({ queryKey: ['/api/messages', recipientId, requestId] });
    }
  });

  const onSubmit = form.handleSubmit((values) => {
    sendMessage(values);
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">Messages</Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Messages</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col space-y-4">
          <ScrollArea className="h-[300px] pr-4">
            <div className="flex flex-col space-y-2">
              {messages.map((message: Message) => (
                <div
                  key={message.id}
                  className={`rounded-lg p-3 ${
                    message.senderId === currentUserId
                      ? "bg-primary text-primary-foreground ml-auto"
                      : "bg-muted"
                  }`}
                  style={{ maxWidth: "80%" }}
                >
                  <p className="text-sm">{message.content}</p>
                  <span className="text-xs opacity-70">
                    {format(new Date(message.createdAt), 'MMM d, h:mm a')}
                  </span>
                </div>
              ))}
            </div>
          </ScrollArea>
          <Form {...form}>
            <form onSubmit={onSubmit} className="space-y-4">
              <FormField
                control={form.control}
                name="content"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Textarea
                        placeholder="Type your message..."
                        {...field}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full" disabled={isPending}>
                Send Message
              </Button>
            </form>
          </Form>
        </div>
      </DialogContent>
    </Dialog>
  );
}