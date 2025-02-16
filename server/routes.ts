import type { Express } from "express";
import { createServer, type Server } from "http";
import multer from "multer";
import { setupAuth } from "./auth";
import { storage } from "./storage";
import { insertItemSchema } from "@shared/schema";
import logger from './logger';

const upload = multer();

export async function registerRoutes(app: Express): Promise<Server> {
  setupAuth(app);

  app.get("/api/items/:community", async (req, res) => {
    try {
      const { search } = req.query;
      const searchTerm = typeof search === 'string' ? search : undefined;

      const items = await storage.getItems(
        req.params.community, 
        req.user?.id,
        searchTerm
      );

      // Handle case where items is null or undefined
      res.json(items.map(item => ({
        ...item,
        createdAt: new Date(item.createdAt).toISOString(),
      })));
    } catch (error) {
      logger.error('Error fetching items:', error);
      res.status(500).json({ error: 'Failed to fetch items' });
    }
  });

  app.get("/api/items/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid item ID" });
      }

      const item = await storage.getItem(id, req.user?.id);
      if (!item) {
        return res.status(404).json({ error: "Item not found" });
      }

      if (!item.createdAt) {
        return res.status(500).json({ error: "Invalid item data" });
      }

      res.json(item);
    } catch (error) {
      logger.error('Error fetching item:', error);
      res.status(500).json({ error: 'Failed to fetch item' });
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
        createdAt: new Date(item.createdAt).toISOString() // Ensure proper date formatting
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

  

  const httpServer = createServer(app);
  return httpServer;
}