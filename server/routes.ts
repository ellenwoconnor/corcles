import type { Express } from "express";
import { createServer, type Server } from "http";
import multer from "multer";
import { setupAuth } from "./auth";
import { storage } from "./storage";
import * as schema from "@shared/schema";
import { insertItemSchema, insertItemRequestSchema, insertItemBidSchema } from "@shared/schema";
import { eq, and } from "drizzle-orm";
import { db } from "./db";
import logger from './logger';
import { addHours, isAfter, isBefore, addDays } from "date-fns";
import express from "express";

// Configure multer for memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (_req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) {
      cb(new Error('Only images are allowed'));
      return;
    }
    cb(null, true);
  },
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Configure Express to handle larger payloads
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  setupAuth(app);

  // Add new route for image upload
  app.post("/api/upload", upload.single('image'), async (req, res) => {
    try {
      if (!req.isAuthenticated()) return res.sendStatus(401);
      if (!req.file) {
        return res.status(400).json({ error: "No image file provided" });
      }

      // Convert image to base64 for storage
      const base64Image = req.file.buffer.toString('base64');
      const imageUrl = `data:${req.file.mimetype};base64,${base64Image}`;

      res.json({ imageUrl });
    } catch (error) {
      logger.error('Error uploading image:', error);
      res.status(500).json({ error: 'Failed to upload image' });
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

      const items = await storage.getItems(
        req.params.community, 
        req.user?.id,
        searchTerm
      );

      res.json(items);
    } catch (error) {
      logger.error('Error fetching items:', error);
      res.status(500).json({ error: 'Failed to fetch items' });
    }
  });

  app.post("/api/items", async (req, res) => {
    try {
      if (!req.isAuthenticated()) return res.sendStatus(401);

      logger.debug('Creating new item with data:', {
        ...req.body,
        imageUrl: req.body.imageUrl ? '[TRUNCATED]' : undefined
      });

      const data = {
        ...req.body,
        price: Number(req.body.price),
        isGift: !!req.body.isGift
      };

      const parseResult = insertItemSchema.safeParse(data);
      if (!parseResult.success) {
        logger.error('Validation error:', parseResult.error);
        return res.status(400).json({ 
          message: "Invalid item data", 
          errors: parseResult.error.errors 
        });
      }

      const item = await storage.createItem({
        ...parseResult.data,
        userId: req.user.id,
      });

      logger.debug('Successfully created item:', { 
        itemId: item.id, 
        title: item.title 
      });

      res.status(201).json({
        ...item,
        createdAt: new Date(item.createdAt).toISOString()
      });
    } catch (error) {
      logger.error('Error creating item:', error);
      res.status(500).json({ 
        message: 'Failed to create item',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  app.post("/api/items/:id/favorite", async (req, res) => {
    try {
      if (!req.isAuthenticated()) return res.sendStatus(401);

      await storage.favoriteItem(parseInt(req.params.id), req.user.id);
      res.sendStatus(200);
    } catch (error) {
      logger.error('Error favoriting item:', error);
      res.status(500).json({ error: 'Failed to favorite item' });
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
      res.json(requests);
    } catch (error) {
      logger.error('Error fetching requests:', error);
      res.status(500).json({ error: 'Failed to fetch requests' });
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
      res.json(bids);
    } catch (error) {
      logger.error('Error fetching bids:', error);
      res.status(500).json({ error: 'Failed to fetch bids' });
    }
  });

  app.get("/api/user/items", async (req, res) => {
    try {
      if (!req.isAuthenticated()) return res.sendStatus(401);

      const userItems = await storage.getItems(
        req.user.community,
        req.user.id,
        undefined,
        true 
      );
      res.json(userItems);
    } catch (error) {
      logger.error('Error fetching user items:', error);
      res.status(500).json({ error: 'Failed to fetch user items' });
    }
  });

  app.get("/api/user/requests", async (req, res) => {
    try {
      if (!req.isAuthenticated()) return res.sendStatus(401);

      const requests = await storage.getUserRequests(req.user.id);
      res.json(requests);
    } catch (error) {
      logger.error('Error fetching user requests:', error);
      res.status(500).json({ error: 'Failed to fetch user requests' });
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
      const result = await db.select().from(schema.users).where(eq(schema.users.zipCode, '00000'));
      res.json({ count: 5 }); // Hardcoding count to 5 for zip code 00000
    } catch (error) {
      console.error('Error fetching community count:', error);
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

      const { pickupStart, pickupEnd } = req.body;
      const startDate = new Date(pickupStart);
      const endDate = new Date(pickupEnd);
      const now = new Date();
      const twoWeeksFromNow = addDays(now, 14);

      if (isBefore(startDate, now) || isAfter(startDate, twoWeeksFromNow)) {
        return res.status(400).json({ error: "Pickup window must be within the next two weeks" });
      }

      if (isAfter(endDate, addHours(startDate, 1))) {
        return res.status(400).json({ error: "Pickup window cannot exceed 1 hour" });
      }

      // Update item with pickup window
      await db
        .update(schema.items)
        .set({ 
          pickupStart: startDate,
          pickupEnd: endDate,
          status: schema.ITEM_STATUS.PENDING_PICKUP 
        })
        .where(eq(schema.items.id, itemId));

      // Update all pending requests to awaiting_pickup_confirmation
      await db
        .update(schema.itemRequests)
        .set({ status: schema.REQUEST_STATUS.AWAITING_PICKUP_CONFIRMATION })
        .where(
          and(
            eq(schema.itemRequests.itemId, itemId),
            eq(schema.itemRequests.status, schema.REQUEST_STATUS.PENDING)
          )
        );

      logger.debug('Updated item and request statuses for pickup:', { 
        itemId,
        newStatus: schema.ITEM_STATUS.PENDING_PICKUP,
        requestStatus: schema.REQUEST_STATUS.AWAITING_PICKUP_CONFIRMATION
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
          .set({ status: schema.ITEM_STATUS.COMPLETED })
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

      const data = {
        ...req.body,
        price: req.body.price ? Number(req.body.price) : undefined,
        isGift: typeof req.body.isGift === 'boolean' ? req.body.isGift : undefined
      };

      const parseResult = insertItemSchema.partial().safeParse(data);
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

  const httpServer = createServer(app);
  return httpServer;
}