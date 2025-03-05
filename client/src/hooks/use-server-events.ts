import { useEffect, useRef, useState } from 'react';
import { useToast } from './use-toast';
import { queryClient } from '@/lib/queryClient';

interface UseServerEventsOptions {
  endpoint?: string;
  enabled?: boolean;
  onMessage?: (data: any) => void;
}

export function useServerEvents({ 
  endpoint = '/api/events', 
  enabled = true,
  onMessage 
}: UseServerEventsOptions = {}) {
  const [isConnected, setIsConnected] = useState(false);
  const { toast } = useToast();
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    if (!enabled) {
      if (eventSourceRef.current) {
        console.log('Closing SSE connection due to disabled state');
        eventSourceRef.current.close();
        eventSourceRef.current = null;
        setIsConnected(false);
      }
      return;
    }

    // Don't create a new connection if we already have one
    if (eventSourceRef.current?.readyState === EventSource.OPEN) {
      console.log('SSE connection already exists');
      return;
    }

    // Clean up any existing connection
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }

    console.log('Creating new SSE connection');
    const eventSource = new EventSource(endpoint);
    eventSourceRef.current = eventSource;

    eventSource.onopen = () => {
      console.log('SSE connection established');
      setIsConnected(true);
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = undefined;
      }
    };

    eventSource.onerror = (error) => {
      console.error('SSE connection error:', error);
      setIsConnected(false);

      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }

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

        if (onMessage) {
          onMessage(data);
        } else {
          switch (data.type) {
            case 'new_message':
              queryClient.invalidateQueries({ 
                queryKey: ['/api/messages', data.data.requestId]
              });
              break;
            default:
              console.warn('Unknown message type:', data.type);
          }
        }
      } catch (error) {
        console.error('Error processing SSE message:', error);
      }
    });

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (eventSourceRef.current) {
        console.log('Cleaning up SSE connection');
        eventSourceRef.current.close();
        eventSourceRef.current = null;
        setIsConnected(false);
      }
    };
  }, [endpoint, enabled, toast, onMessage]);

  return {
    isConnected
  };
}