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
      console.log('WebSocket already connected');
      return;
    }

    if (reconnectAttemptRef.current >= maxReconnectAttempts) {
      console.log('Max reconnection attempts reached');
      return;
    }

    try {
      if (wsRef.current) {
        wsRef.current.close();
      }

      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/ws`;

      console.log('Attempting WebSocket connection to:', wsUrl);

      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('WebSocket connection established');
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
          console.log('Received WebSocket message:', message);

          switch (message.type) {
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
            case 'connection_established':
              console.log('WebSocket connection confirmed:', message.data);
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
        console.log('WebSocket connection closed');
        setIsConnected(false);
        wsRef.current = null;

        if (reconnectAttemptRef.current < maxReconnectAttempts) {
          reconnectAttemptRef.current += 1;
          const delay = Math.min(1000 * Math.pow(2, reconnectAttemptRef.current), 10000);

          if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current);
          }

          console.log(`Scheduling reconnection attempt ${reconnectAttemptRef.current} in ${delay}ms`);
          reconnectTimeoutRef.current = setTimeout(connect, delay);
        } else {
          console.log('Max reconnection attempts reached');
          toast({
            title: "Connection Error",
            description: "Unable to establish real-time connection. Please refresh the page.",
            variant: "destructive"
          });
        }
      };
    } catch (error) {
      console.error('Error setting up WebSocket:', error);
      setIsConnected(false);
    }
  }, [toast, isConnected]);

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
      reconnectAttemptRef.current = maxReconnectAttempts;
    };
  }, [connect]);

  return {
    socket: wsRef.current,
    isConnected
  };
}