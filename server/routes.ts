import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { storage } from "./storage";
import { insertItemSchema } from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
  setupAuth(app);

  app.get("/api/items/:community", async (req, res) => {
    const items = await storage.getItems(req.params.community);
    res.json(items);
  });

  app.post("/api/items", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    const parseResult = insertItemSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json(parseResult.error);
    }

    const item = await storage.createItem({
      ...parseResult.data,
      userId: req.user.id,
    });
    res.status(201).json(item);
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
