import { useEffect, useState } from 'react';
import { useToast } from './use-toast';
import { queryClient } from '@/lib/queryClient';

export function useSSE() {
  const { toast } = useToast();
  const [isConnected, setIsConnected] = useState(false);
  const [eventSource, setEventSource] = useState<EventSource | null>(null);

  useEffect(() => {
    let mounted = true;

    const setupSSE = () => {
      try {
        // Clean up existing connection if any
        if (eventSource) {
          console.log('Cleaning up existing SSE connection');
          eventSource.close();
          setEventSource(null);
        }

        console.log('Initializing new SSE connection');
        const source = new EventSource('/api/events');

        source.onopen = () => {
          if (mounted) {
            console.log('SSE connection established');
            setIsConnected(true);
          }
        };

        source.onmessage = (event) => {
          if (!mounted) return;

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
          if (!mounted) return;

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

          // Attempt to reconnect after a delay
          setTimeout(() => {
            if (mounted) {
              console.log('Attempting to reconnect SSE');
              setupSSE();
            }
          }, 5000);
        };

        setEventSource(source);
      } catch (error) {
        console.error('Error setting up SSE:', error);
        if (mounted) {
          setIsConnected(false);
        }
      }
    };

    setupSSE();

    // Cleanup function
    return () => {
      mounted = false;
      if (eventSource) {
        console.log('Cleaning up SSE connection on unmount');
        eventSource.close();
        setEventSource(null);
        setIsConnected(false);
      }
    };
  }, []); // Empty dependency array since we handle cleanup internally

  return { isConnected };
}