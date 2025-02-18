import { useEffect, useRef, useCallback, useState } from 'react';
import { useToast } from './use-toast';
import { queryClient } from '@/lib/queryClient';

interface WebSocketMessage {
  type: string;
  data: any;
}

export function useWebSocket() {
  const { toast } = useToast();
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();
  const [isConnected, setIsConnected] = useState(false);
  const maxReconnectAttempts = 5;
  const reconnectAttemptRef = useRef(0);

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    if (reconnectAttemptRef.current >= maxReconnectAttempts) {
      return;
    }

    try {
      // Close existing connection if any
      if (wsRef.current) {
        wsRef.current.close();
      }

      // Create WebSocket URL with same protocol and host as current page
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/ws`;

      // Create WebSocket - credentials (cookies) will be sent automatically
      const ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        setIsConnected(true);
        reconnectAttemptRef.current = 0;
        if (reconnectTimeoutRef.current) {
          clearTimeout(reconnectTimeoutRef.current);
          reconnectTimeoutRef.current = undefined;
        }
      };

      ws.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);

          switch (message.type) {
            case 'new_message':
              // Invalidate queries to refresh message list
              queryClient.invalidateQueries({ 
                queryKey: ['/api/messages', message.data.requestId]
              });
              break;
            case 'connection_established':
              // Connection confirmed with user ID
              break;
            default:
              console.warn('Unknown message type:', message.type);
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        setIsConnected(false);
      };

      ws.onclose = () => {
        setIsConnected(false);
        reconnectAttemptRef.current += 1;

        if (reconnectAttemptRef.current < maxReconnectAttempts) {
          if (!reconnectTimeoutRef.current) {
            const delay = Math.min(1000 * Math.pow(2, reconnectAttemptRef.current), 10000);
            reconnectTimeoutRef.current = setTimeout(() => {
              connect();
              reconnectTimeoutRef.current = undefined;
            }, delay);
          }
        } else {
          toast({
            title: "Connection Error",
            description: "Unable to establish real-time connection. Please refresh the page.",
            variant: "destructive"
          });
        }
      };

      wsRef.current = ws;
    } catch (error) {
      console.error('Error setting up WebSocket:', error);
      setIsConnected(false);
    }
  }, [toast]);

  useEffect(() => {
    connect();

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      setIsConnected(false);
    };
  }, [connect]);

  return {
    socket: wsRef.current,
    isConnected
  };
}