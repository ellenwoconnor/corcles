let socket: WebSocket | null = null;
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 5;
const INITIAL_RETRY_DELAY = 1000; // 1 second
const MAX_RETRY_DELAY = 5000; // 5 seconds

export function setupWebSocket() {
  if (socket?.readyState === WebSocket.OPEN) return;

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
}

export function getWebSocket(): WebSocket | null {
  if (!socket || socket.readyState === WebSocket.CLOSED) {
    return setupWebSocket();
  }
  return socket;
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
      ws.send(JSON.stringify({ type: 'heartbeat' }));
    }
  }, 30000); // Send heartbeat every 30 seconds
}

export function stopHeartbeat() {
  if (heartbeatInterval) {
    clearInterval(heartbeatInterval);
    heartbeatInterval = null;
  }
}