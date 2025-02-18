import { useEffect, useRef, useCallback } from 'react';
import { useToast } from './use-toast';

interface WebSocketMessage {
  type: string;
  data: any;
}

export function useWebSocket() {
  const { toast } = useToast();
  const wsRef = useRef<WebSocket | null>(null);

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log('WebSocket connected');
    };

    ws.onmessage = (event) => {
      try {
        const message: WebSocketMessage = JSON.parse(event.data);
        
        switch (message.type) {
          case 'new_message':
            toast({
              title: "New Message",
              description: "You have received a new message",
            });
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
      toast({
        variant: "destructive",
        title: "Connection Error",
        description: "Failed to connect to messaging service",
      });
    };

    ws.onclose = () => {
      console.log('WebSocket disconnected');
      // Attempt to reconnect after 5 seconds
      setTimeout(connect, 5000);
    };
  }, [toast]);

  useEffect(() => {
    connect();

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [connect]);

  return wsRef.current;
}
