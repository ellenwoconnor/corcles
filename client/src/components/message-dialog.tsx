import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertMessageSchema } from "@shared/schema";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useQueryClient, useMutation, useQuery } from "@tanstack/react-query";
import { useWebSocket } from "@/hooks/use-websocket";
import { apiRequest } from "@/lib/queryClient";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { Loader2, MessageSquare } from "lucide-react";
import { z } from "zod";

interface Message {
  id: number;
  content: string;
  senderId: number;
  recipientId: number;
  createdAt: string;
}

type MessageFormValues = z.infer<typeof insertMessageSchema>;

interface MessageDialogProps {
  requestId: number;
  currentUserId: number;
  otherPartyId: number;
  recipientId: number;
}

export function MessageDialog({ requestId, currentUserId, otherPartyId, recipientId }: MessageDialogProps) {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();
  const { socket, isConnected } = useWebSocket();
  const { toast } = useToast();

  console.log('MessageDialog mounted with props:', { 
    requestId, 
    currentUserId, 
    otherPartyId,
    recipientId,
    socketConnected: isConnected 
  });

  const form = useForm<MessageFormValues>({
    resolver: zodResolver(insertMessageSchema),
    defaultValues: {
      content: "",
      senderId: currentUserId,
      recipientId: otherPartyId,
      requestId
    }
  });

  // Fix: Query using currentUserId instead of otherPartyId for the conversation endpoint
  const { data: messages = [], isLoading: messagesLoading } = useQuery<Message[]>({
    queryKey: ['/api/messages', currentUserId, requestId],
    queryFn: async () => {
      console.log('Fetching messages for:', { currentUserId, requestId });
      const response = await apiRequest('GET', `/api/messages/${currentUserId}/${requestId}`);
      if (!response.ok) {
        const error = await response.json();
        console.error('Error fetching messages:', error);
        throw new Error(error.message || 'Failed to fetch messages');
      }
      const data = await response.json();
      console.log('Fetched messages:', data);
      return data;
    },
    enabled: open
  });

  useEffect(() => {
    if (!socket || !isConnected) return;

    console.log('Setting up WebSocket listener for requestId:', requestId);
    const handleMessage = (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data);
        console.log('Received WebSocket message:', data);
        if (data.type === 'new_message' && data.requestId === requestId) {
          queryClient.invalidateQueries({ queryKey: ['/api/messages', currentUserId, requestId] });
        }
      } catch (error) {
        console.error('Error handling WebSocket message:', error);
      }
    };

    socket.addEventListener('message', handleMessage);

    return () => {
      socket.removeEventListener('message', handleMessage);
    };
  }, [socket, isConnected, requestId, currentUserId, queryClient]);

  const sendMessageMutation = useMutation({
    mutationFn: async (data: MessageFormValues) => {
      if (!data.content.trim()) {
        throw new Error("Message cannot be empty");
      }

      console.log('Sending message:', {
        content: data.content,
        senderId: currentUserId,
        recipientId: otherPartyId,
        requestId
      });

      const response = await apiRequest('POST', '/api/messages/send', {
        content: data.content,
        recipientId: otherPartyId,
        requestId: requestId,
        senderId: currentUserId
      });

      if (!response.ok) {
        const error = await response.json();
        console.error('Server error:', error);
        throw new Error(error.message || 'Failed to send message');
      }

      return response.json();
    },
    onSuccess: () => {
      form.reset();
      queryClient.invalidateQueries({ queryKey: ['/api/messages', currentUserId, requestId] });
      toast({
        title: "Message sent",
        description: "Your message has been sent successfully."
      });
    },
    onError: (error: Error) => {
      console.error('Failed to send message:', error);
      toast({
        title: "Failed to send message",
        description: error.message || "There was an error sending your message.",
        variant: "destructive"
      });
    }
  });

  const handleSubmit = form.handleSubmit((values) => {
    console.log('Form submitted with values:', values);
    sendMessageMutation.mutate(values);
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="flex gap-2 w-full">
          <MessageSquare className="h-4 w-4" />
          Messages
        </Button>
      </DialogTrigger>
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
                      <Textarea
                        placeholder="Type your message..."
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button 
                type="submit" 
                className="w-full" 
                disabled={sendMessageMutation.isPending}
              >
                {sendMessageMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sending...
                  </>
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