# SSE Message Flow

## 1. Client Initiates Connection
```typescript
// In MessageDialog.tsx
const { isConnected } = useServerEvents({
  enabled: open, // Only connect when dialog is open
  endpoint: '/api/events'
});
```

## 2. Server Establishes Connection
```typescript
// In server/routes.ts
app.get("/api/events", requireAuth, (req, res) => {
  const userId = req.user?.id;
  
  // Set SSE headers
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive'
  });

  // Store client connection
  sseClients.set(userId, res);
});
```

## 3. Sending Messages
```typescript
// When user sends a message:
const message = await storage.sendMessage(parseResult.data);

// Notify both parties
const notificationPayload = {
  type: "new_message",
  data: message
};

sendSSEMessage(recipientId, notificationPayload);
sendSSEMessage(senderId, notificationPayload);
```

## 4. Client Receives Updates
```typescript
// In use-server-events.ts
eventSource.addEventListener('message', (event) => {
  const data = JSON.parse(event.data);
  if (data.type === 'new_message') {
    // Invalidate queries to refresh message list
    queryClient.invalidateQueries({ 
      queryKey: ['/api/messages', data.data.requestId]
    });
  }
});
```

This creates a real-time messaging system that is:
- More reliable than WebSockets in environments like Replit
- Simpler to implement and maintain
- Automatically handles reconnection
- Works well with HTTP/2 and proxy servers
