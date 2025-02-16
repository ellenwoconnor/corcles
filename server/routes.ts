import type { Express } from "express";
import { createServer, type Server } from "http";
import multer from "multer";
import { setupAuth } from "./auth";
import { storage } from "./storage";
import { insertItemSchema, insertItemRequestSchema, insertItemBidSchema } from "@shared/schema";
import logger from './logger';

const upload = multer();

export async function registerRoutes(app: Express): Promise<Server> {
  setupAuth(app);

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
      logger.error('Error fetching user requests:', error);
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

  const httpServer = createServer(app);
  return httpServer;
}