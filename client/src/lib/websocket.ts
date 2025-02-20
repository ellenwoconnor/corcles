let socket: WebSocket | null = null;
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 5;
const INITIAL_RETRY_DELAY = 1000; // 1 second
const MAX_RETRY_DELAY = 5000; // 5 seconds

export function setupWebSocket() {
  // Don't try to reconnect if we already have an open connection
  if (socket?.readyState === WebSocket.OPEN) return socket;

  try {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;

    socket = new WebSocket(wsUrl);

    socket.addEventListener('open', () => {
      console.log('WebSocket connection established');
      reconnectAttempts = 0; // Reset attempts on successful connection
    });

    socket.addEventListener('message', (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'connection_established') {
          console.log('WebSocket authenticated:', data.data);
        }
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    });

    socket.addEventListener('close', (event) => {
      console.log('WebSocket connection closed:', event.code, event.reason);
      socket = null;

      // Calculate exponential backoff delay
      const retryDelay = Math.min(
        INITIAL_RETRY_DELAY * Math.pow(2, reconnectAttempts),
        MAX_RETRY_DELAY
      );

      // Attempt to reconnect if we haven't exceeded the maximum attempts
      if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
        reconnectAttempts++;
        console.log(`Attempting to reconnect (${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS}) in ${retryDelay}ms`);
        setTimeout(setupWebSocket, retryDelay);
      } else {
        console.error('Maximum reconnection attempts reached');
      }
    });

    socket.addEventListener('error', (error) => {
      console.error('WebSocket error:', error);
    });

    return socket;
  } catch (error) {
    console.error('Error setting up WebSocket:', error);
    return null;
  }
}

export function getWebSocket(): WebSocket | null {
  try {
    if (!socket || socket.readyState === WebSocket.CLOSED) {
      return setupWebSocket();
    }
    return socket;
  } catch (error) {
    console.error('Error getting WebSocket:', error);
    return null;
  }
}

export function closeWebSocket() {
  if (socket) {
    socket.close();
    socket = null;
    reconnectAttempts = 0;
  }
}

// Add heartbeat to detect connection issues early
let heartbeatInterval: NodeJS.Timeout | null = null;

export function startHeartbeat() {
  if (heartbeatInterval) return;

  heartbeatInterval = setInterval(() => {
    const ws = getWebSocket();
    if (ws?.readyState === WebSocket.OPEN) {
      try {
        ws.send(JSON.stringify({ type: 'heartbeat' }));
      } catch (error) {
        console.error('Error sending heartbeat:', error);
      }
    }
  }, 30000); // Send heartbeat every 30 seconds
}

export function stopHeartbeat() {
  if (heartbeatInterval) {
    clearInterval(heartbeatInterval);
    heartbeatInterval = null;
  }
}