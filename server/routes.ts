import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from 'ws';
import multer from "multer";
import { setupAuth } from "./auth";
import { storage } from "./storage";
import * as schema from "@shared/schema";
import { ITEM_STATUS, REQUEST_STATUS } from "@shared/constants";
import { z } from "zod";
import { eq, and, not, or } from "drizzle-orm";
import { db } from "./db";
import logger from './logger';
import session from 'express-session';
import connectPg from "connect-pg-simple";
import { pool } from "./db";
import cookieParser from "cookie-parser";
import { promisify } from "util";
import passport from "passport";
import { hashPassword } from "./utils/auth";
import { 
  insertCommunityInviteSchema, 
  insertItemSchema, 
  insertItemRequestSchema,
  insertItemBidSchema,
  insertMessageSchema 
} from "@shared/schema";
import { addDays, addHours, isBefore, isAfter } from "date-fns";

const PostgresSessionStore = connectPg(session);

const sessionStore = new PostgresSessionStore({
  pool,
  createTableIfMissing: true,
  tableName: 'session'
});

const sessionMiddleware = session({
  store: sessionStore,
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
  app.use(cookieParser());
  app.use(sessionMiddleware);
  app.use(passport.initialize());
  app.use(passport.session());

  setupAuth(app);

  const httpServer = createServer(app);
  const wss = new WebSocketServer({ 
    server: httpServer,
    path: '/ws',
    verifyClient: async (info, cb) => {
      try {
        const req = info.req;

        logger.debug('WebSocket connection attempt:', {
          cookies: req.headers.cookie,
          sessionID: req.headers['sec-websocket-key']
        });

        const runSessionMiddleware = promisify(sessionMiddleware);
        await runSessionMiddleware(req as any, {} as any);

        const session = (req as any).session;
        if (!session) {
          logger.warn('WebSocket unauthorized - no session');
          cb(false, 401, 'No session found');
          return;
        }

        const userId = session.passport?.user;
        if (!userId) {
          logger.warn('WebSocket unauthorized - no user', {
            sessionId: session.id
          });
          cb(false, 401, 'Not authenticated');
          return;
        }

        logger.info('WebSocket connection authenticated:', {
          userId,
          sessionId: session.id
        });

        cb(true);
      } catch (error) {
        logger.error('WebSocket authentication error:', error);
        cb(false, 500, 'Server error');
      }
    }
  });

  const connectedClients = new Map<number, WebSocket>();

  logger.info('WebSocket server initialized on path: /ws');

  wss.on('connection', async (ws, req) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        logger.warn('WebSocket connection rejected - no authenticated user');
        ws.close(1008, 'Authentication required');
        return;
      }

      connectedClients.set(userId, ws);

      logger.info('WebSocket client connected:', { 
        userId,
        totalConnections: connectedClients.size
      });

      ws.send(JSON.stringify({
        type: 'connection_established',
        data: { 
          userId,
          timestamp: new Date().toISOString()
        }
      }));

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

    } catch (error) {
      logger.error('Error during WebSocket connection setup:', error);
      ws.close(1011, 'Internal server error');
    }
  });

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

      const canAccess = req.user.id === item.userId || req.user.id === itemRequest.requesterId;
      if (!canAccess) {
        return res.status(403).json({ error: "You cannot view these messages" });
      }

      const messages = await storage.getConversation(item.userId, itemRequest.requesterId, requestId);

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

  app.get("/api/items", async (req, res) => {
    try {
      const { search, communities: communityParam, freeOnly } = req.query;
      const searchTerm = typeof search === 'string' ? search : undefined;

      logger.debug('Raw query parameters:', {
        communityParam,
        search,
        freeOnly,
        type: typeof communityParam
      });

      let communities: number[] = [];
      if (typeof communityParam === 'string') {
        communities = communityParam.split(',').map(c => parseInt(c)).filter(c => !isNaN(c));
      }

      logger.debug('Parsed communities:', {
        communities,
        length: communities.length
      });

      if (communities.length === 0) {
        return res.status(400).json({ error: "At least one valid community ID is required" });
      }

      const items = await storage.getItems(
        communities,
        req.user?.id,
        searchTerm,
        false,
        freeOnly === 'true'
      );

      logger.debug('Items fetched:', {
        communities,
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
        userId: req.user.id,
        price: Number(req.body.price),
        isGift: !!req.body.isGift,
        communityId: parseInt(req.body.communityId),
      };

      logger.debug('Creating item with data:', data);

      const parseResult = insertItemSchema.safeParse(data);

      if (!parseResult.success) {
        return res.status(400).json(parseResult.error);
      }

      const item = await storage.createItem(parseResult.data);

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
        logger.error('Item request validation failed:', parseResult.error);
        return res.status(400).json(parseResult.error);
      }

      const request = await storage.createItemRequest(parseResult.data);
      logger.info('Item request created:', {
        itemId,
        requesterId: req.user.id,
        requestId: request.id
      });

      const requests = await storage.getItemRequests(itemId);
      if (requests.length === 1) {
        await db
          .update(schema.items)
          .set({ status: ITEM_STATUS.REQUESTED })
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
      const userCommunities = await storage.getUserCommunities(req.user.id);
      const userItems = await storage.getItems(
        userCommunities.map(c => c.id),
        req.user.id,
        undefined,
        true 
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

      const requests = await storage.getItemRequests(itemId);
      const pendingRequests = requests.filter(r => r.status === 'pending');

      if (pendingRequests.length === 0) {
        return res.status(400).json({ error: "No pending requests available for drawing" });
      }

      const winningRequest = pendingRequests[Math.floor(Math.random() * pendingRequests.length)];

      await db
        .update(schema.items)
        .set({ 
          recipientId: winningRequest.requesterId,
          status: 'pending_pickup'
        })
        .where(eq(schema.items.id, itemId));

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

      // Get the pending request to set the recipient
      const [activeRequest] = await db
        .select()
        .from(schema.itemRequests)
        .where(
          and(
            eq(schema.itemRequests.itemId, itemId),
            or(
              eq(schema.itemRequests.status, REQUEST_STATUS.PENDING),
              eq(schema.itemRequests.status, REQUEST_STATUS.ACCEPTED)
            )
          )
        );

      if (!activeRequest) {
        return res.status(400).json({ error: "No active request found for scheduling" });
      }

      logger.debug('Found active request for scheduling:', {
        requestId: activeRequest.id,
        requesterId: activeRequest.requesterId,
        status: activeRequest.status
      });

      const { timeWindows } = req.body;

      logger.debug('Received time windows:', timeWindows);

      if (!Array.isArray(timeWindows) || timeWindows.length === 0 || timeWindows.length > 10) {
        return res.status(400).json({ error: "Must provide between 1 and 10 time windows" });
      }

      const now = new Date();
      const twoWeeksFromNow = addDays(now, 14);

      const validatedWindows = [];
      for (const window of timeWindows) {
        try {
          const startDate = new Date(window.pickupStart);
          const endDate = new Date(window.pickupEnd);

          if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
            return res.status(400).json({ error: "Invalid date format" });
          }

          if (isBefore(startDate, now)) {
            return res.status(400).json({ error: "Pickup start time must be in the future" });
          }

          if (isAfter(startDate, twoWeeksFromNow)) {
            return res.status(400).json({ error: "Pickup must be within the next two weeks" });
          }

          if (isAfter(endDate, addHours(startDate, 1))) {
            return res.status(400).json({ error: "Pickup window cannot exceed 1 hour" });
          }

          validatedWindows.push({
            pickupStart: startDate.toISOString(),
            pickupEnd: endDate.toISOString()
          });
        } catch (error) {
          logger.error('Date validation error:', error);
          return res.status(400).json({ error: "Invalid date format in time windows" });
        }
      }

      const proposedWindows = validatedWindows.map((window, index) => ({
        ...window,
        order: index
      }));

      logger.debug('Validated windows:', proposedWindows);

      // Update item with pickup windows and recipient
      await db
        .update(schema.items)
        .set({ 
          proposedPickupWindows: proposedWindows,
          status: ITEM_STATUS.SCHEDULING,
          recipientId: activeRequest.requesterId
        })
        .where(eq(schema.items.id, itemId));

      // Update the pending request status
      await db
        .update(schema.itemRequests)
        .set({ status: REQUEST_STATUS.AWAITING_PICKUP_CONFIRMATION })
        .where(eq(schema.itemRequests.id, activeRequest.id));

      // Reject other requests
      await db
        .update(schema.itemRequests)
        .set({ status: REQUEST_STATUS.REJECTED })
        .where(
          and(
            eq(schema.itemRequests.itemId, itemId),
            not(eq(schema.itemRequests.id, activeRequest.id))
          )
        );

      logger.info('Updated item with pickup windows and recipient:', { 
        itemId,
        recipientId: activeRequest.requesterId,
        windowsCount: proposedWindows.length,
        newStatus: ITEM_STATUS.SCHEDULING
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

      const [request] = await db
        .select()
        .from(schema.itemRequests)
        .where(
          and(
            eq(schema.itemRequests.itemId, itemId),
            eq(schema.itemRequests.requesterId, req.user.id),
            eq(schema.itemRequests.status, REQUEST_STATUS.AWAITING_PICKUP_CONFIRMATION)
          )
        );

      if (!request) {
        return res.status(404).json({ error: "No pending pickup confirmation found" });
      }

      await db
        .update(schema.itemRequests)
        .set({ 
          status: confirmed 
            ? REQUEST_STATUS.ACCEPTED
            : REQUEST_STATUS.PENDING 
        })
        .where(eq(schema.itemRequests.id, request.id));

      await db
        .update(schema.itemRequests)
        .set({ 
          status: REQUEST_STATUS.PENDING
        })
        .where(
          and(
            eq(schema.itemRequests.itemId, itemId),
            not(eq(schema.itemRequests.id, request.id))
          )
        );

      if (confirmed) {
        await db
          .update(schema.items)
          .set({ status: ITEM_STATUS.SCHEDULED })
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

      const pickupStart = new Date(selectedWindow.pickupStart);
      const pickupEnd = new Date(selectedWindow.pickupEnd);

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

      await db
        .update(schema.items)
        .set({ 
          pickupStart: pickupStart,
          pickupEnd: pickupEnd,
          status: ITEM_STATUS.SCHEDULED,
          recipientId: req.user.id 
        })
        .where(eq(schema.items.id, itemId));

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
        userId: req.user.id,        requestCount: requests?.length
      });
      res.json(requests);
    } catch (error) {
      logger.error('Error fetching user requests:', error);      res.status(500).json({ error: 'Failed to fetch user requests' });
    }
  });

  app.get("/apiapi/items/:id/bids", async (req, res) => {
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

  app.get("/api/user/communities", async (req, res) => {
    try {
      if (!req.isAuthenticated()) return res.sendStatus(401);

      const communities = await storage.getUserCommunities(req.user.id);
      logger.debug('Retrieved user communities:', { 
        userId: req.user.id,
        communities: communities.map(c => ({
          id: c.id,
          name: c.name,
          role: c.role,
          memberCount: c.memberCount
                }))
      });
      res.json(communities);
    }catch (error) {
      logger.error('Error fetching user communities:', error);
      res.status(500).json({ error: 'Failed to fetch user communities' });
    }
  });

  app.post("/api/communities", async (req, res) => {
    try {
      if (!req.isAuthenticated()) return res.sendStatus(401);

      const { name, description } = req.body;

      if (!name) {
        return res.status(400).json({ error: "Community name is required" });
      }

      const community = await storage.createCommunity({
        name,
        description,
        createdBy: req.user.id,
        isCustom: true
      });

      logger.debug('Created new community:', {
        communityId: community.id,
        name: community.name,
        createdBy: req.user.id
      });

      res.status(201).json(community);
    } catch (error) {
      logger.error('Error creating community:', error);
      res.status(500).json({ error: 'Failed to create community' });
    }
  });

  app.post("/api/communities/:id/invite", async (req, res) => {
    try {
      if (!req.isAuthenticated()) return res.sendStatus(401);

      const communityId = parseInt(req.params.id);
      if (isNaN(communityId)) {
        return res.status(400).json({ error: "Invalid community ID" });
      }

      const userCommunity = await db
        .select()
        .from(schema.userCommunities)
        .where(
          and(
            eq(schema.userCommunities.userId, req.user.id),
            eq(schema.userCommunities.communityId, communityId),
            eq(schema.userCommunities.role, 'admin')
          )
        )
        .limit(1);

      if (!userCommunity.length) {
        return res.status(403).json({ error: "Not authorized to invite to this community" });
      }

      const parseResult = insertCommunityInviteSchema.safeParse({
        ...req.body,
        communityId,
        invitedBy: req.user.id
      });

      if (!parseResult.success) {
        logger.error('Community invite validation failed:', {
          errors: parseResult.error.errors,
          body: req.body,
          communityId,
          invitedBy: req.user.id
        });
        return res.status(400).json({
          error: "Invalid invitation data",
          details: parseResult.error.errors
        });
      }

      const [existingUser] = await db
        .select()
        .from(schema.users)
        .where(eq(schema.users.email, req.body.email))
        .limit(1);

      if (existingUser) {
        await db
          .insert(schema.userCommunities)
          .values({
            userId: existingUser.id,
            communityId,
            role: 'member'
          })
          .onConflictDoNothing();

        return res.json({ autoEnrolled: true });
      }

      const [invite] = await db
        .insert(schema.communityInvites)
        .values(parseResult.data)
        .returning();

      res.status(201).json({ ...invite, autoEnrolled: false });
    } catch (error) {
      logger.error('Error creating community invite:', error);
      res.status(500).json({ error: 'Failed to create community invite' });
    }
  });

  app.post("/api/register", async (req, res, next) => {
    try {
      logger.info('Starting registration process', {
        body: { ...req.body, password: '[REDACTED]' }
      });

      const parseResult = schema.insertUserSchema.safeParse(req.body);
      if (!parseResult.success) {
        logger.warn('Registration validation failed:', {
          errors: parseResult.error.errors,
          body: { ...req.body, password: '[REDACTED]' }
        });
        return res.status(400).json(parseResult.error);
      }

      const email = parseResult.data.email.toLowerCase();
      logger.debug('Checking for existing user/email', { 
        username: parseResult.data.username,
        email 
      });

      const [existingUser, existingEmail] = await Promise.all([
        storage.getUserByUsername(parseResult.data.username),
        storage.getUserByEmail(email)
      ]);

      if (existingUser) {
        logger.warn('Registration blocked - username exists:', {
          username: parseResult.data.username,
          ip: req.ip
        });
        return res.status(400).json({ error: "Username already exists" });
      }

      if (existingEmail) {
        logger.warn('Registration blocked - email exists:', {
          email,
          ip: req.ip
        });
        return res.status(400).json({ error: "Email already exists" });
      }

      logger.info('Starting user creation transaction');
      const hashedPassword = await hashPassword(parseResult.data.password);

      const result = await db.transaction(async (tx) => {
        logger.debug('Transaction step 1: Creating user');
        const [user] = await tx
          .insert(schema.users)
          .values({
            ...parseResult.data,
            email,
            password: hashedPassword,
          })
          .returning();

        logger.info('User created successfully:', {
          userId: user.id,
          username: user.username,
          email
        });

        logger.debug('Transaction step 2: Finding pending invites');
        const pendingInvites = await tx
          .select()
          .from(schema.communityInvites)
          .where(
            and(
              eq(schema.communityInvites.invitedEmail, email),
              eq(schema.communityInvites.status, 'pending')
            )
          );

        logger.info('Found pending invites:', {
          userId: user.id,
          email,
          inviteCount: pendingInvites.length,
          invites: pendingInvites.map(i => ({
            id: i.id,
            communityId: i.communityId,
            invitedBy: i.invitedBy
          }))
        });

        logger.debug('Transaction step 3: Processing invites');
        const processedInvites = [];
        for (const invite of pendingInvites) {
          try {
            logger.debug('Processing invite:', {
              inviteId: invite.id,
              communityId: invite.communityId
            });

            const [community] = await tx
              .select()
              .from(schema.communities)
              .where(eq(schema.communities.id, invite.communityId));

            if (!community) {
              logger.warn('Skipping invite - community not found:', {
                inviteId: invite.id,
                communityId: invite.communityId
              });
              continue;
            }

            await tx
              .insert(schema.userCommunities)
              .values({
                userId: user.id,
                communityId: invite.communityId,
                role: 'member',
                joinedAt: new Date()
              })
              .onConflictDoNothing();

            await tx
              .update(schema.communityInvites)
              .set({
                status: 'accepted',
                acceptedAt: new Date()
              })
              .where(eq(schema.communityInvites.id, invite.id));

            processedInvites.push(invite.id);
            logger.info('Successfully processed invite:', {
              userId: user.id,
              inviteId: invite.id,
              communityId: invite.communityId,
              communityName: community.name
            });
          } catch (err) {
            logger.error('Failed to process invite:', {
              userId: user.id,
              inviteId: invite.id,
              error: err,
              errorStack: err.stack
            });
            throw err;
          }
        }

        logger.debug('Transaction step 4: Handling zip code community');
        const zipCodeCommunityName = `Community ${parseResult.data.zipCode}`;
        let zipCommunity = await tx
          .select()
          .from(schema.communities)
          .where(eq(schema.communities.name, zipCodeCommunityName))
          .limit(1);

        if (zipCommunity.length === 0) {
          logger.info('Creating new zip code community:', {
            zipCode: parseResult.data.zipCode,
            communityName: zipCodeCommunityName
          });

          [zipCommunity] = await tx
            .insert(schema.communities)
            .values({
              name: zipCodeCommunityName,
              description: `Local community for ${parseResult.data.zipCode}`,
              createdBy: user.id,
              isCustom: false
            })
            .returning();

          logger.info('Created zip code community:', {
            userId: user.id,
            communityId: zipCommunity.id,
            zipCode: parseResult.data.zipCode
          });
        } else {
          logger.info('Found existing zip code community:', {
            communityId: zipCommunity[0].id,
            communityName: zipCodeCommunityName
          });
        }

        await tx
          .insert(schema.userCommunities)
          .values({
            userId: user.id,
            communityId: zipCommunity[0].id,
            role: 'member',
            joinedAt: new Date()
          })
          .onConflictDoNothing();

        logger.info('Added user to zip code community:', {
          userId: user.id,
          communityId: zipCommunity[0].id,
          zipCode: parseResult.data.zipCode
        });

        return { 
          user, 
          enrolledCommunities: processedInvites.length + 1,
          processedInvites 
        };
      });

      logger.info('Registration completed successfully:', {
        userId: result.user.id,
        username: result.user.username,
        enrolledCommunities: result.enrolledCommunities,
        processedInvites: result.processedInvites
      });

      req.login(result.user, (err) => {
        if (err) {
          logger.error('Error during login after registration:', {
            error: err,
            errorStack: err.stack,
            userId: result.user.id
          });
          return next(err);
        }

        logger.info('User logged in after registration:', {
          userId: result.user.id,
          username: result.user.username
        });

        res.status(201).json(result.user);
      });
    } catch (error) {
      logger.error('Error during user registration:', {
        error,
        errorStack: error.stack,
        username: req.body?.username
      });
      next(error);
    }
  });

  return httpServer;
}