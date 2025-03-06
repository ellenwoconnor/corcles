import { useEffect, useState } from 'react';
import { useToast } from './use-toast';
import { queryClient } from '@/lib/queryClient';

interface UseServerEventsOptions {
  endpoint?: string;
  enabled?: boolean;
}

export function useServerEvents({ endpoint = '/api/events', enabled = true }: UseServerEventsOptions = {}) {
  const [isConnected, setIsConnected] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (!enabled) {
      return;
    }

    const eventSource = new EventSource(endpoint);
    
    eventSource.onopen = () => {
      console.log('SSE connection established');
      setIsConnected(true);
    };

    eventSource.onerror = (error) => {
      console.error('SSE connection error:', error);
      setIsConnected(false);
      
      toast({
        title: "Connection Error",
        description: "Real-time updates may be delayed. Please refresh the page.",
        variant: "destructive"
      });
    };

    eventSource.addEventListener('message', (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log('Received SSE message:', data);

        switch (data.type) {
          case 'new_message':
            // Invalidate queries to refresh message list
            queryClient.invalidateQueries({ 
              queryKey: ['/api/messages', data.data.requestId]
            });

            toast({
              title: "New Message",
              description: "You have received a new message",
            });
            break;

          default:
            console.warn('Unknown message type:', data.type);
        }
      } catch (error) {
        console.error('Error processing SSE message:', error);
      }
    });

    return () => {
      console.log('Closing SSE connection');
      eventSource.close();
      setIsConnected(false);
    };
  }, [endpoint, enabled, toast]);

  return {
    isConnected
  };
}
