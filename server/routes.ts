import type { Express } from "express";
import { createServer, type Server } from "http";
import multer from "multer";
import { setupAuth } from "./auth";
import { storage } from "./storage";
import { insertItemSchema } from "@shared/schema";

const upload = multer();

export async function registerRoutes(app: Express): Promise<Server> {
  setupAuth(app);

  app.get("/api/items/:community", async (req, res) => {
    const items = await storage.getItems(req.params.community, req.user?.id);
    // Handle case where items is null or undefined
    const itemArray = Array.isArray(items) ? items : [];
    // Only send the actual item data, not the table structure
    res.json(itemArray.map(item => ({
      ...item,
      createdAt: new Date(item.createdAt).toISOString(), // Ensure proper date formatting
    })));
  });

  app.get("/api/items/:id", async (req, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: "Invalid item ID" });
    }

    const item = await storage.getItem(id, req.user?.id);
    if (!item) {
      return res.status(404).json({ error: "Item not found" });
    }

    // Convert dates to ISO strings for consistent handling
    res.json({
      ...item,
      createdAt: new Date(item.createdAt).toISOString()
    });
  });

  app.post("/api/items", async (req, res) => {
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
  });

  app.post("/api/items/:id/favorite", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    await storage.favoriteItem(parseInt(req.params.id), req.user.id);
    res.sendStatus(200);
  });

  app.post("/api/items/:id/unfavorite", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    await storage.unfavoriteItem(parseInt(req.params.id), req.user.id);
    res.sendStatus(200);
  });

  const httpServer = createServer(app);
  return httpServer;
}