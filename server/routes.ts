import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import multer from "multer";
import { setupAuth } from "./auth";
import { storage } from "./storage";
import * as schema from "@shared/schema";
import { z } from "zod";
import { insertItemSchema, insertItemRequestSchema, insertItemBidSchema, insertMessageSchema } from "@shared/schema";
import { eq, and, not, or } from "drizzle-orm";
import { db } from "./db";
import logger from './logger';
import { addHours, isAfter, isBefore, addDays } from "date-fns";
import session from 'express-session';
import connectPg from "connect-pg-simple";
import { pool } from "./db";

const PostgresSessionStore = connectPg(session);

// Create session middleware configuration
const sessionMiddleware = session({
  store: new PostgresSessionStore({ 
    pool,
    createTableIfMissing: true,
    tableName: 'session'
  }),
  secret: process.env.SESSION_SECRET || 'your-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Apply session middleware to Express app
  app.use(sessionMiddleware);

  setupAuth(app);

  // Initialize WebSocket server and connected clients map
  const httpServer = createServer(app);
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });
  const connectedClients = new Map<number, WebSocket>();

  // Log WebSocket server initialization
  logger.info('WebSocket server initialized on path: /ws');

  // WebSocket connection handling with enhanced session parsing
  wss.on('connection', async (ws, req) => {
    try {
      // Parse session using Promise wrapper
      await new Promise<void>((resolve, reject) => {
        sessionMiddleware(req as any, {} as any, (err: any) => {
          if (err) {
            logger.error('Session parsing error:', err);
            reject(err);
            return;
          }
          resolve();
        });
      });

      // @ts-ignore - req.user is added by passport session
      const userId = req.user?.id;

      // Enhanced logging for connection attempt
      logger.debug('WebSocket connection attempt:', { 
        userId,
        hasSession: !!req.user,
        headers: req.headers['cookie'] ? 'Cookie present' : 'No cookie'
      });

      if (!userId) {
        logger.warn('WebSocket connection rejected - no authenticated user');
        ws.close(1008, 'Authentication required');
        return;
      }

      // Store connection
      connectedClients.set(userId, ws);

      logger.info('WebSocket client connected:', { 
        userId,
        totalConnections: connectedClients.size
      });

      // Handle WebSocket events
      ws.on('close', () => {
        logger.info('WebSocket client disconnected:', { 
          userId,
          remainingConnections: connectedClients.size - 1
        });
        connectedClients.delete(userId);
      });

      ws.on('error', (error) => {
        logger.error('WebSocket error:', { error, userId });
        ws.close();
        connectedClients.delete(userId);
      });

      // Send connection success message
      ws.send(JSON.stringify({
        type: 'connection_established',
        data: { 
          userId,
          timestamp: new Date().toISOString()
        }
      }));

    } catch (error) {
      logger.error('Error during WebSocket connection setup:', error);
      ws.close(1011, 'Internal server error');
    }
  });

  // Add messaging routes
  app.post("/api/messages/send", async (req, res) => {
    try {
      if (!req.isAuthenticated()) return res.sendStatus(401);

      const { recipientId, content, requestId } = req.body;
      logger.info('Received message request:', { recipientId, requestId });

      const parseResult = insertMessageSchema.safeParse({
        senderId: req.user.id,
        recipientId,
        content,
        requestId
      });

      if (!parseResult.success) {
        return res.status(400).json(parseResult.error);
      }

      const message = await storage.sendMessage(parseResult.data);

      // Notify both sender and recipient via WebSocket
      const recipientWs = connectedClients.get(recipientId);
      const senderWs = connectedClients.get(req.user.id);

      const notificationPayload = JSON.stringify({
        type: 'new_message',
        data: message
      });

      if (recipientWs?.readyState === WebSocket.OPEN) {
        recipientWs.send(notificationPayload);
        logger.info('Sent WebSocket notification to recipient:', { recipientId });
      }

      if (senderWs?.readyState === WebSocket.OPEN) {
        senderWs.send(notificationPayload);
        logger.info('Sent WebSocket notification to sender:', { senderId: req.user.id });
      }

      res.status(201).json(message);
    } catch (error) {
      logger.error('Error sending message:', error);
      res.status(500).json({ error: 'Failed to send message' });
    }
  });

  app.get("/api/messages/:userId/:requestId", async (req, res) => {
    try {
      if (!req.isAuthenticated()) return res.sendStatus(401);

      const userId = parseInt(req.params.userId);
      const requestId = parseInt(req.params.requestId);

      if (isNaN(userId) || isNaN(requestId)) {
        return res.status(400).json({ error: "Invalid user ID or request ID" });
      }

      // Check if the current user is either the sender or recipient of the request
      const request = await db
        .select()
        .from(schema.itemRequests)
        .where(eq(schema.itemRequests.id, requestId))
        .limit(1);

      if (!request.length) {
        return res.status(404).json({ error: "Request not found" });
      }

      const [itemRequest] = request;
      const item = await storage.getItem(itemRequest.itemId);

      if (!item) {
        return res.status(404).json({ error: "Item not found" });
      }

      // Allow message access if user is either the item owner or requester
      const canAccess = req.user.id === item.userId || req.user.id === itemRequest.requesterId;
      if (!canAccess) {
        return res.status(403).json({ error: "You cannot view these messages" });
      }

      // Get messages for both sender and recipient
      const messages = await storage.getConversation(item.userId, itemRequest.requesterId, requestId);

      // Mark messages as read for the current user
      await storage.markMessagesAsRead(req.user.id, userId, requestId);

      res.json(messages);
    } catch (error) {
      logger.error('Error fetching messages:', error);
      res.status(500).json({ error: 'Failed to fetch messages' });
    }
  });

  app.get("/api/messages/unread-count", async (req, res) => {
    try {
      if (!req.isAuthenticated()) return res.sendStatus(401);

      const count = await storage.getUnreadMessageCount(req.user.id);
      res.json({ count });
    } catch (error) {
      logger.error('Error getting unread message count:', error);
      res.status(500).json({ error: 'Failed to get unread message count' });
    }
  });

  app.get("/api/items/:id([0-9]+)", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid item ID" });
      }

      const item = await storage.getItem(id, req.user?.id);
      if (!item) {
        return res.status(404).json({ error: "Item not found" });
      }

      res.json({
        ...item,
        createdAt: new Date(item.createdAt).toISOString()
      });
    } catch (error) {
      logger.error('Error fetching item:', error);
      res.status(500).json({ error: 'Failed to fetch item' });
    }
  });

  app.get("/api/items/:community", async (req, res) => {
    try {
      const { search } = req.query;
      const searchTerm = typeof search === 'string' ? search : undefined;

      // Log the request parameters for debugging
      logger.debug('Fetching items:', {
        community: req.params.community,
        userId: req.user?.id,
        searchTerm,
        authenticated: req.isAuthenticated()
      });

      const items = await storage.getItems(
        req.params.community, 
        req.user?.id,
        searchTerm
      );

      // Log the number of items returned
      logger.debug('Items fetched:', {
        community: req.params.community,
        itemCount: items.length
      });

      res.json(items.map(item => ({
        ...item,
        createdAt: new Date(item.createdAt).toISOString()
      })));
    } catch (error) {
      logger.error('Error fetching items:', error);
      res.status(500).json({ error: 'Failed to fetch items' });
    }
  });

  app.post("/api/items", async (req, res) => {
    try {
      if (!req.isAuthenticated()) return res.sendStatus(401);

      const data = {
        ...req.body,
        price: Number(req.body.price),
        isGift: !!req.body.isGift
      };

      const parseResult = insertItemSchema.safeParse(data);
      if (!parseResult.success) {
        return res.status(400).json(parseResult.error);
      }

      const item = await storage.createItem({
        ...parseResult.data,
        userId: req.user.id,
      });

      res.status(201).json({
        ...item,
        createdAt: new Date(item.createdAt).toISOString()
      });
    } catch (error) {
      logger.error('Error creating item:', error);
      res.status(500).json({ error: 'Failed to create item' });
    }
  });

  app.post("/api/items/:id/request", async (req, res) => {
    try {
      if (!req.isAuthenticated()) return res.sendStatus(401);

      const itemId = parseInt(req.params.id);
      if (isNaN(itemId)) {
        return res.status(400).json({ error: "Invalid item ID" });
      }

      const item = await storage.getItem(itemId);
      if (!item) {
        return res.status(404).json({ error: "Item not found" });
      }

      if (!item.isGift) {
        return res.status(400).json({ error: "Item is not available for request" });
      }

      const parseResult = insertItemRequestSchema.safeParse({
        ...req.body,
        itemId,
        requesterId: req.user.id,
      });

      if (!parseResult.success) {
        return res.status(400).json(parseResult.error);
      }

      const request = await storage.createItemRequest(parseResult.data);
      
      // Check if this is the first request and update item status
      const requests = await storage.getItemRequests(itemId);
      if (requests.length === 1) {
        await db
          .update(schema.items)
          .set({ status: schema.ITEM_STATUS.REQUESTED })
          .where(eq(schema.items.id, itemId));
      }
      
      res.status(201).json(request);
    } catch (error) {
      logger.error('Error creating request:', error);
      res.status(500).json({ error: 'Failed to create request' });
    }
  });

  app.post("/api/items/:id/bid", async (req, res) => {
    try {
      if (!req.isAuthenticated()) return res.sendStatus(401);

      const itemId = parseInt(req.params.id);
      if (isNaN(itemId)) {
        return res.status(400).json({ error: "Invalid item ID" });
      }

      const item = await storage.getItem(itemId);
      if (!item) {
        return res.status(404).json({ error: "Item not found" });
      }

      if (item.isGift) {
        return res.status(400).json({ error: "Cannot bid on a free item" });
      }

      const parseResult = insertItemBidSchema.safeParse({
        ...req.body,
        itemId,
        bidderId: req.user.id,
      });

      if (!parseResult.success) {
        return res.status(400).json(parseResult.error);
      }

      const bid = await storage.createItemBid(parseResult.data);
      res.status(201).json(bid);
    } catch (error) {
      logger.error('Error creating bid:', error);
      res.status(500).json({ error: 'Failed to create bid' });
    }
  });

  app.get("/api/items/:id/my-requests", async (req, res) => {
    try {
      if (!req.isAuthenticated()) return res.sendStatus(401);

      const itemId = parseInt(req.params.id);
      if (isNaN(itemId)) {
        return res.status(400).json({ error: "Invalid item ID" });
      }

      const requests = await storage.getItemRequests(itemId);
      res.json(requests.filter(request => request.requesterId === req.user.id));
    } catch (error) {
      logger.error('Error fetching requests:', error);
      res.status(500).json({ error: 'Failed to fetch requests' });
    }
  });

  app.get("/api/user/items", async (req, res) => {
    try {
      if (!req.isAuthenticated()) return res.sendStatus(401);

      const userItems = await storage.getItems(
        req.user.community,
        req.user.id,
        undefined,
        true // This is userOnly flag
      );

      logger.debug('Fetching user items:', {
        userId: req.user.id,
        community: req.user.community,
        itemCount: userItems.length
      });

      res.json(userItems);
    } catch (error) {
      logger.error('Error fetching user items:', error);
      res.status(500).json({ error: 'Failed to fetch user items' });
    }
  });

  app.get("/api/items/:id/requests", async (req, res) => {
    try {
      if (!req.isAuthenticated()) return res.sendStatus(401);

      const itemId = parseInt(req.params.id);
      if (isNaN(itemId)) {
        return res.status(400).json({ error: "Invalid item ID" });
      }

      const item = await storage.getItem(itemId);
      if (!item) {
        return res.status(404).json({ error: "Item not found" });
      }

      if (item.userId !== req.user.id) {
        return res.sendStatus(403);
      }

      const requests = await storage.getItemRequests(itemId);
      logger.debug('Fetching item requests:', {
        itemId,
        requestCount: requests.length,
        ownerId: item.userId,
        requesterId: req.user.id
      });

      res.json(requests);
    } catch (error) {
      logger.error('Error fetching requests:', error);
      res.status(500).json({ error: 'Failed to fetch requests' });
    }
  });

  app.get("/api/user/bids", async (req, res) => {
    try {
      if (!req.isAuthenticated()) return res.sendStatus(401);

      const bids = await storage.getUserBids(req.user.id);
      res.json(bids);
    } catch (error) {
      logger.error('Error fetching user bids:', error);
      res.status(500).json({ error: 'Failed to fetch user bids' });
    }
  });

  app.get("/api/user", (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    res.json(req.user);
  });

  app.get("/api/community/:community/count", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const result = await db.select().from(schema.users).where(eq(schema.users.community, req.params.community));
      logger.debug('Community count query result:', { 
        community: req.params.community,
        count: result.length
      });
      res.json({ count: result.length });
    } catch (error) {
      logger.error('Error fetching community count:', error);
      res.status(500).json({ error: 'Failed to fetch community count' });
    }
  });

  app.post("/api/items/:id/draw", async (req, res) => {
    try {
      if (!req.isAuthenticated()) return res.sendStatus(401);

      const itemId = parseInt(req.params.id);
      if (isNaN(itemId)) {
        return res.status(400).json({ error: "Invalid item ID" });
      }

      const item = await storage.getItem(itemId);
      if (!item) {
        return res.status(404).json({ error: "Item not found" });
      }

      if (item.userId !== req.user.id) {
        return res.status(403).json({ error: "Not authorized to draw for this item" });
      }

      if (!item.isGift) {
        return res.status(400).json({ error: "Can only draw for free items" });
      }

      if (item.recipientId) {
        return res.status(400).json({ error: "Drawing already completed" });
      }

      // Get all pending requests
      const requests = await storage.getItemRequests(itemId);
      const pendingRequests = requests.filter(r => r.status === 'pending');

      if (pendingRequests.length === 0) {
        return res.status(400).json({ error: "No pending requests available for drawing" });
      }

      // Randomly select a recipient
      const winningRequest = pendingRequests[Math.floor(Math.random() * pendingRequests.length)];

      // Update item with recipient
      await db
        .update(schema.items)
        .set({ 
          recipientId: winningRequest.requesterId,
          status: 'pending_pickup'
        })
        .where(eq(schema.items.id, itemId));

      // Update request statuses
      for (const request of requests) {
        await storage.updateItemRequestStatus(
          request.id,
          request.id === winningRequest.id ? 'awaiting_pickup_confirmation' : 'rejected'
        );
      }

      res.json({ success: true });
    } catch (error) {
      logger.error('Error performing drawing:', error);
      res.status(500).json({ error: 'Failed to perform drawing' });
    }
  });

  app.post("/api/items/:id/schedule", async (req, res) => {
    try {
      if (!req.isAuthenticated()) return res.sendStatus(401);

      const itemId = parseInt(req.params.id);
      if (isNaN(itemId)) {
        return res.status(400).json({ error: "Invalid item ID" });
      }

      const item = await storage.getItem(itemId);
      if (!item) {
        return res.status(404).json({ error: "Item not found" });
      }

      if (item.userId !== req.user.id) {
        return res.status(403).json({ error: "Not authorized to schedule pickup for this item" });
      }

      // Get all pending requests first
      const requests = await storage.getItemRequests(itemId);
      const pendingRequests = requests.filter(r => r.status === 'pending');

      if (pendingRequests.length === 0) {
        return res.status(400).json({ error: "No pending requests available for scheduling" });
      }

      // Randomly select one recipient from pending requests
      const selectedRequest = pendingRequests[Math.floor(Math.random() * pendingRequests.length)];

      const { timeWindows } = req.body;
      if (!Array.isArray(timeWindows) || timeWindows.length === 0 || timeWindows.length > 10) {
        return res.status(400).json({ error: "Must provide between 1 and 10 time windows" });
      }

      for (const window of timeWindows) {
        const startDate = new Date(window.pickupStart);
        const endDate = new Date(window.pickupEnd);
        const now = new Date();
        const twoWeeksFromNow = addDays(now, 14);

        if (isBefore(startDate, now) || isAfter(startDate, twoWeeksFromNow)) {
          return res.status(400).json({ error: "Pickup window must be within the next two weeks" });
        }

        if (isAfter(endDate, addHours(startDate, 1))) {
          return res.status(400).json({ error: "Pickup window cannot exceed 1 hour" });
        }
      }

      // Store the proposed time windows in the database
      const proposedWindows = timeWindows.map((window, index) => ({
        ...window,
        order: index
      }));

      // Update item with recipient and pickup windows
      await db
        .update(schema.items)
        .set({ 
          proposedPickupWindows: proposedWindows,
          status: schema.ITEM_STATUS.SCHEDULING,
          recipientId: selectedRequest.requesterId
        })
        .where(eq(schema.items.id, itemId));

      // Update the selected request to awaiting_pickup_confirmation
      await db
        .update(schema.itemRequests)
        .set({ status: schema.REQUEST_STATUS.AWAITING_PICKUP_CONFIRMATION })
        .where(eq(schema.itemRequests.id, selectedRequest.id));

      // Update other requests to rejected
      await db
        .update(schema.itemRequests)
        .set({ status: schema.REQUEST_STATUS.REJECTED })
        .where(
          and(
            eq(schema.itemRequests.itemId, itemId),
            not(eq(schema.itemRequests.id, selectedRequest.id))
          )
        );

      logger.debug('Updated item and request statuses for pickup:', { 
        itemId,
        selectedRequestId: selectedRequest.id,
        newStatus: schema.ITEM_STATUS.PENDING_PICKUP,
        requestStatus: schema.REQUEST_STATUS.AWAITING_PICKUP_CONFIRMATION,
        proposedWindows
      });

      res.json({ success: true });
    } catch (error) {
      logger.error('Error scheduling pickup:', error);
      res.status(500).json({ error: 'Failed to schedule pickup' });
    }
  });

  app.post("/api/items/:id/confirm-pickup", async (req, res) => {
    try {
      if (!req.isAuthenticated()) return res.sendStatus(401);

      const itemId = parseInt(req.params.id);
      if (isNaN(itemId)) {
        return res.status(400).json({ error: "Invalid item ID" });
      }

      const { confirmed } = req.body;
      if (typeof confirmed !== 'boolean') {
        return res.status(400).json({ error: "Confirmation status is required" });
      }

      const item = await storage.getItem(itemId);
      if (!item) {
        return res.status(404).json({ error: "Item not found" });
      }

      // Get the user's request for this item
      const [request] = await db
        .select()
        .from(schema.itemRequests)
        .where(
          and(
            eq(schema.itemRequests.itemId, itemId),
            eq(schema.itemRequests.requesterId, req.user.id),
            eq(schema.itemRequests.status, schema.REQUEST_STATUS.AWAITING_PICKUP_CONFIRMATION)
          )
        );

      if (!request) {
        return res.status(404).json({ error: "No pending pickup confirmation found" });
      }

      // Update request status based on confirmation
      await db
        .update(schema.itemRequests)
        .set({ 
          status: confirmed 
            ? schema.REQUEST_STATUS.ACCEPTED 
            : schema.REQUEST_STATUS.REJECTED 
        })
        .where(eq(schema.itemRequests.id, request.id));

      // If confirmed, update item status to completed
      if (confirmed) {
        await db
          .update(schema.items)
          .set({ status: schema.ITEM_STATUS.SCHEDULED })
          .where(eq(schema.items.id, itemId));
      }

      logger.debug('Updated pickup confirmation:', { 
        itemId,
        requestId: request.id,
        confirmed,
        newStatus: confirmed ? 'completed' : 'available'
      });

      res.json({ success: true });
    } catch (error) {
      logger.error('Error confirming pickup:', error);
      res.status(500).json({ error: 'Failed to confirm pickup' });
    }
  });

  app.patch("/api/items/:id", async (req, res) => {
    try {
      if (!req.isAuthenticated()) return res.sendStatus(401);

      const itemId = parseInt(req.params.id);
      if (isNaN(itemId)) {
        return res.status(400).json({ error: "Invalid item ID" });
      }

      const item = await storage.getItem(itemId);
      if (!item) {
        return res.status(404).json({ error: "Item not found" });
      }

      if (item.userId !== req.user.id) {
        return res.status(403).json({ error: "Not authorized to edit this item" });
      }

      // Make all fields optional for updates
      const partialItemSchema = z.object({
        title: z.string().optional(),
        description: z.string().optional(),
        price: z.number().optional(),
        isGift: z.boolean().optional(),
        imageUrl: z.string().optional(),
        community: z.string().optional()
      });
      const data = {
        ...req.body,
        price: req.body.price ? Number(req.body.price) : undefined,
        isGift: typeof req.body.isGift === 'boolean' ? req.body.isGift : undefined
      };

      const parseResult = partialItemSchema.safeParse(data);
      if (!parseResult.success) {
        return res.status(400).json(parseResult.error);
      }

      const updatedItem = await storage.updateItem(itemId, parseResult.data);
      res.json(updatedItem);
    } catch (error) {
      logger.error('Error updating item:', error);
      res.status(500).json({ error: 'Failed to update item' });
    }
  });

  app.post("/api/items/:id/select-pickup-time", async (req, res) => {
    try {
      if (!req.isAuthenticated()) return res.sendStatus(401);

      const itemId = parseInt(req.params.id);
      if (isNaN(itemId)) {
        return res.status(400).json({ error: "Invalid item ID" });
      }

      const { windowIndex } = req.body;

      // Handle acceptance case
      if (typeof windowIndex !== 'number') {
        return res.status(400).json({ error: "Window index is required" });
      }

      const item = await storage.getItem(itemId);
      if (!item) {
        return res.status(404).json({ error: "Item not found" });
      }

      if (!item.proposedPickupWindows || !item.proposedPickupWindows[windowIndex]) {
        return res.status(400).json({ error: "Invalid pickup window selected" });
      }

      const selectedWindow = item.proposedPickupWindows[windowIndex];

      // Convert string dates to Date objects
      const pickupStart = new Date(selectedWindow.pickupStart);
      const pickupEnd = new Date(selectedWindow.pickupEnd);

      // Validate dates
      if (isNaN(pickupStart.getTime()) || isNaN(pickupEnd.getTime())) {
        return res.status(400).json({ error: "Invalid pickup window dates" });
      }

      logger.debug('Selected pickup window:', {
        windowIndex,
        pickupStart,
        pickupEnd,
        originalStart: selectedWindow.pickupStart,
        originalEnd: selectedWindow.pickupEnd
      });

      // Update item with selected pickup time and status
      await db
        .update(schema.items)
        .set({ 
          pickupStart: pickupStart,
          pickupEnd: pickupEnd,
          status: schema.ITEM_STATUS.SCHEDULED,
          recipientId: req.user.id 
        })
        .where(eq(schema.items.id, itemId));

      // Update the requester's request to accepted
      await db
        .update(schema.itemRequests)
        .set({ 
          status: 'accepted'
        })
        .where(
          and(
            eq(schema.itemRequests.itemId, itemId),
            eq(schema.itemRequests.requesterId, req.user.id)
          )
        );

      // Update other requests to rejected
      await db
        .update(schema.itemRequests)
        .set({ 
          status: 'rejected'
        })
        .where(
          and(
            eq(schema.itemRequests.itemId, itemId),
            not(eq(schema.itemRequests.requesterId, req.user.id))
          )
        );

      res.json({ success: true });
    } catch (error) {
      logger.error('Error selecting pickup time:', error);
      res.status(500).json({ error: 'Failed to select pickup time' });
    }
  });

  app.get("/api/user/requests", async (req, res) => {
    try {
      if (!req.isAuthenticated()) return res.sendStatus(401);

      const requests = await storage.getUserRequests(req.user.id);
      logger.debug('Fetching user requests:', {
        userId: req.user.id,
        requestCount: requests?.length
      });
      res.json(requests);
    } catch (error) {
      logger.error('Error fetching user requests:', error);
      res.status(500).json({ error: 'Failed to fetch user requests' });
    }
  });

  app.get("/api/items/:id/bids", async (req, res) => {
    try {
      if (!req.isAuthenticated()) return res.sendStatus(401);

      const itemId = parseInt(req.params.id);
      if (isNaN(itemId)) {
        return res.status(400).json({ error: "Invalid item ID" });
      }

      const item = await storage.getItem(itemId);
      if (!item) {
        return res.status(404).json({ error: "Item not found" });
      }

      if (item.userId !== req.user.id) {
        return res.sendStatus(403);
      }

      const bids = await storage.getItemBids(itemId);
      logger.debug('Fetching item bids:', {
        itemId,
        bidCount: bids.length,
        ownerId: item.userId
      });
      res.json(bids);
    } catch (error) {
      logger.error('Error fetching bids:', error);
      res.status(500).json({ error: 'Failed to fetch bids' });
    }
  });

  app.post("/api/items/:id/cancel-pickup", async (req, res) => {
    try {
      if (!req.isAuthenticated()) return res.sendStatus(401);

      const itemId = parseInt(req.params.id);
      if (isNaN(itemId)) {
        return res.status(400).json({ error: "Invalid item ID" });
      }

      const { reason } = req.body;

      const item = await storage.getItem(itemId);
      if (!item) {
        return res.status(404).json({ error: "Item not found" });
      }

      // Get the current request for this item
      const [request] = await db
        .select()
        .from(schema.itemRequests)
        .where(
          and(
            eq(schema.itemRequests.itemId, itemId),
            or(
              eq(schema.itemRequests.status, schema.REQUEST_STATUS.AWAITING_PICKUP_CONFIRMATION),
              eq(schema.itemRequests.status, schema.REQUEST_STATUS.ACCEPTED)
            )
          )
        );

      if (!request) {
        return res.status(404).json({ error: "No active pickup request found" });
      }

      // Only allow cancellation by item owner or recipient
      const canCancel = req.user.id === item.userId || req.user.id === request.requesterId;
      if (!canCancel) {
        return res.status(403).json({ error: "Not authorized to cancel this pickup" });
      }

      // Reset item status and clear pickup windows
      await db
        .update(schema.items)
        .set({ 
          status: schema.ITEM_STATUS.AVAILABLE,
          proposedPickupWindows: null,
          pickupStart: null,
          pickupEnd: null,
          recipientId: null
        })
        .where(eq(schema.items.id, itemId));

      // Mark cancelled request as rejected
      await db
        .update(schema.itemRequests)
        .set({ 
          status: schema.REQUEST_STATUS.REJECTED,
          cancellationInfo: reason ? { reason, canceledBy: req.user.id } : null
        })
        .where(eq(schema.itemRequests.id, request.id));

      // Other requests remain in their current state

      logger.debug('Pickup canceled:', { 
        itemId,
        requestId: request.id,
        canceledBy: req.user.id,
        reason: reason || 'No reason provided'
      });

      res.json({ success: true });
    } catch (error) {
      logger.error('Error canceling pickup:', error);
      res.status(500).json({ error: 'Failed to cancel pickup' });
    }
  });

  app.get("/api/user/requests", async (req, res) => {
    try {
      if (!req.isAuthenticated()) return res.sendStatus(401);

      const requests = await storage.getUserRequests(req.user.id);
      logger.debug('Fetching user requests:', {
        userId: req.user.id,
        requestCount: requests?.length
      });
      res.json(requests);
    } catch (error) {
      logger.error('Error fetching user requests:', error);
      res.status(500).json({ error: 'Failed to fetch user requests' });
    }
  });

  app.get("/api/items/:id/bids", async (req, res) => {
    try {
      if (!req.isAuthenticated()) return res.sendStatus(401);

      const itemId = parseInt(req.params.id);
      if (isNaN(itemId)) {
        return res.status(400).json({ error: "Invalid item ID" });
      }

      const item = await storage.getItem(itemId);
      if (!item) {
        return res.status(404).json({ error: "Item not found" });
      }

      if (item.userId !== req.user.id) {
        return res.sendStatus(403);
      }

      const bids = await storage.getItemBids(itemId);
      logger.debug('Fetching item bids:', {
        itemId,
        bidCount: bids.length,
        ownerId: item.userId
      });
      res.json(bids);
    } catch (error) {
      logger.error('Error fetching bids:', error);
      res.status(500).json({ error: 'Failed to fetch bids' });
    }
  });

  return httpServer;
}