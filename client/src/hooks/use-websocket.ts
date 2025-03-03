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
  const pingIntervalRef = useRef<NodeJS.Timeout>();

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      console.log('WebSocket already connected');
      return;
    }

    if (reconnectAttemptRef.current >= maxReconnectAttempts) {
      console.log('Max reconnection attempts reached');
      toast({
        title: "Connection Error",
        description: "Unable to establish real-time connection. Please refresh the page.",
        variant: "destructive"
      });
      return;
    }

    try {
      // Clean up existing connection
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }

      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/ws`;

      console.log('Attempting WebSocket connection to:', wsUrl);

      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('WebSocket connected');
        setIsConnected(true);
        reconnectAttemptRef.current = 0;

        // Start ping interval
        if (pingIntervalRef.current) {
          clearInterval(pingIntervalRef.current);
        }
        pingIntervalRef.current = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            try {
              ws.send(JSON.stringify({ type: 'ping' }));
            } catch (error) {
              console.error('Error sending ping:', error);
              ws.close();
            }
          }
        }, 30000); // Send heartbeat every 30 seconds
      };

      ws.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          console.log('Received:', message);

          switch (message.type) {
            case 'pong':
              console.log('Server pong received');
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

            case 'connection_established':
              console.log('Connection confirmed:', message.data);
              break;
          }
        } catch (error) {
          console.error('Message parsing error:', error);
        }
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        setIsConnected(false);
        if (ws.readyState === WebSocket.OPEN) {
          ws.close();
        }
      };

      ws.onclose = (event) => {
        console.log('WebSocket closed:', event.code, event.reason);
        setIsConnected(false);
        wsRef.current = null;

        // Clear ping interval
        if (pingIntervalRef.current) {
          clearInterval(pingIntervalRef.current);
          pingIntervalRef.current = undefined;
        }

        if (reconnectAttemptRef.current < maxReconnectAttempts) {
          reconnectAttemptRef.current += 1;
          const delay = Math.min(1000 * Math.pow(2, reconnectAttemptRef.current), 10000);

          console.log(`Reconnecting (${reconnectAttemptRef.current}/${maxReconnectAttempts}) in ${delay}ms`);

          if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current);
          }
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

      return ws;
    } catch (error) {
      console.error('Error setting up WebSocket:', error);
      setIsConnected(false);
      return null;
    }
  }, [toast]);

  useEffect(() => {
    connect();

    return () => {
      if (pingIntervalRef.current) {
        clearInterval(pingIntervalRef.current);
      }
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