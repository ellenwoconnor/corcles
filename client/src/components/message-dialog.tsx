import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertMessageSchema } from "@shared/schema";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useQueryClient, useMutation, useQuery } from "@tanstack/react-query";
import { useServerEvents } from "@/hooks/use-server-events";
import { apiRequest } from "@/lib/queryClient";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { z } from "zod";

interface Message {
  id: number;
  content: string;
  senderId: number;
  recipientId: number;
  createdAt: string;
  senderName?: string;
  recipientName?: string;
}

type MessageFormValues = z.infer<typeof insertMessageSchema>;

interface MessageDialogProps {
  requestId: number;
  currentUserId: number;
  recipientId: number;
  trigger?: React.ReactNode;
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function MessageDialog({
  requestId,
  currentUserId,
  recipientId,
  trigger,
  isOpen: controlledIsOpen,
  onOpenChange: controlledOnOpenChange,
}: MessageDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledIsOpen ?? internalOpen;
  const onOpenChange = controlledOnOpenChange ?? setInternalOpen;

  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Debug log the props
  console.log('MessageDialog mounted with props:', {
    requestId,
    currentUserId,
    recipientId,
    open
  });

  // Use SSE instead of WebSocket
  const { isConnected } = useServerEvents({
    enabled: open, // Only connect when dialog is open
    endpoint: "/api/events",
  });

  const form = useForm<MessageFormValues>({
    resolver: zodResolver(
      insertMessageSchema.extend({
        recipientId: z.number().min(1, "Invalid recipient"),
      }),
    ),
    defaultValues: {
      content: "",
      senderId: currentUserId,
      recipientId: recipientId, // Use recipientId from props
      requestId,
    },
  });

  const { data: messages = [], isLoading: messagesLoading } = useQuery<Message[]>({
    queryKey: ['/api/messages', recipientId, requestId],
    queryFn: async () => {
      console.log('Fetching messages:', {
        recipientId,
        requestId,
        currentUserId,
        enabled: open && !!recipientId && !!requestId
      });

      const response = await apiRequest('GET', `/api/messages/${recipientId}/${requestId}`);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to fetch messages');
      }
      const data = await response.json();
      console.log('Fetched messages:', data.length);
      return data;
    },
    enabled: open && !!recipientId && !!requestId
  });

  const sendMessageMutation = useMutation({
    mutationFn: async (data: MessageFormValues) => {
      if (!data.content.trim()) {
        throw new Error("Message cannot be empty");
      }

      if (!data.recipientId || data.recipientId < 1) {
        throw new Error("Invalid recipient ID");
      }

      console.log('Sending message with data:', {
        recipientId: data.recipientId,
        requestId,
        content: data.content.substring(0, 20) // Log just the start for privacy
      });

      const response = await apiRequest('POST', '/api/messages/send', {
        content: data.content,
        recipientId: data.recipientId,
        requestId: requestId,
        senderId: currentUserId
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to send message');
      }

      return response.json();
    },
    onSuccess: () => {
      form.reset();
      queryClient.invalidateQueries({ 
        queryKey: ['/api/messages', recipientId, requestId]
      });
    },
    onError: (error: Error) => {
      console.error('Message send error:', error);
      toast({
        title: "Failed to send message",
        description: error.message || "There was an error sending your message.",
        variant: "destructive"
      });
    }
  });

  const handleSubmit = form.handleSubmit((values) => {
    console.log('Submitting form with values:', {
      ...values,
      content: values.content.substring(0, 20) // Log just the start for privacy
    });
    sendMessageMutation.mutate(values);
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Messages</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col space-y-4">
          <ScrollArea className="h-[300px] pr-4">
            {messagesLoading ? (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : messages.length > 0 ? (
              <div className="flex flex-col space-y-2">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex flex-col rounded-lg p-3 ${
                      message.senderId === currentUserId
                        ? "bg-primary text-primary-foreground ml-auto"
                        : "bg-muted"
                    }`}
                    style={{ maxWidth: "80%" }}
                  >
                    <span className="text-xs font-semibold mb-1">
                      {message.senderId === currentUserId
                        ? "You"
                        : message.senderName}
                    </span>
                    <p className="text-sm">{message.content}</p>
                    <span className="text-xs opacity-70">
                      {format(new Date(message.createdAt), "MMM d, h:mm a")}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                No messages yet
              </div>
            )}
          </ScrollArea>
          <Form {...form}>
            <form onSubmit={handleSubmit} className="space-y-4">
              <FormField
                control={form.control}
                name="content"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Textarea placeholder="Type your message..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button
                type="submit"
                className="w-full"
                disabled={sendMessageMutation.isPending || !isConnected}
              >
                {sendMessageMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sending...
                  </>
                ) : !isConnected ? (
                  "Connecting..."
                ) : (
                  "Send Message"
                )}
              </Button>
            </form>
          </Form>
        </div>
      </DialogContent>
    </Dialog>
  );
}