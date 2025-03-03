import { useEffect, useState } from 'react';
import { useToast } from './use-toast';
import { queryClient } from '@/lib/queryClient';

export function useSSE() {
  const { toast } = useToast();
  const [isConnected, setIsConnected] = useState(false);
  const [eventSource, setEventSource] = useState<EventSource | null>(null);

  useEffect(() => {
    const setupSSE = () => {
      try {
        const source = new EventSource('/api/events');
        console.log('Initializing SSE connection');

        source.onopen = () => {
          console.log('SSE connection established');
          setIsConnected(true);
        };

        source.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data);
            console.log('Received SSE message:', message);

            switch (message.type) {
              case 'connected':
                console.log('SSE connection confirmed');
                break;

              case 'new_message':
                queryClient.invalidateQueries({ 
                  queryKey: ['/api/messages', message.data.requestId]
                });
                if (isConnected) {
                  toast({
                    title: "New Message",
                    description: "You have received a new message",
                  });
                }
                break;

              case 'notification':
                queryClient.invalidateQueries({ 
                  queryKey: ['/api/notifications']
                });
                if (isConnected && message.data.showToast !== false) {
                  toast({
                    title: message.data.title || "New Notification",
                    description: message.data.message,
                  });
                }
                break;
            }
          } catch (error) {
            console.error('Error parsing SSE message:', error);
          }
        };

        source.onerror = (error) => {
          console.error('SSE error:', error);
          setIsConnected(false);
          source.close();
          setEventSource(null);

          // Show error toast only if connection was previously established
          if (isConnected) {
            toast({
              title: "Connection Error",
              description: "Lost connection to notification service. Please refresh the page.",
              variant: "destructive"
            });
          }
        };

        setEventSource(source);
      } catch (error) {
        console.error('Error setting up SSE:', error);
        setIsConnected(false);
      }
    };

    setupSSE();

    return () => {
      if (eventSource) {
        console.log('Cleaning up SSE connection');
        eventSource.close();
        setEventSource(null);
        setIsConnected(false);
      }
    };
  }, [toast, isConnected]);

  return { isConnected };
}