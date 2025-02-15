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
    // Only send the actual item data, not the table structure
    res.json(items.map(item => ({
      id: item.id,
      title: item.title,
      description: item.description,
      price: item.price,
      isGift: item.isGift,
      imageUrl: item.imageUrl,
      userId: item.userId,
      community: item.community,
      createdAt: item.createdAt,
      favorites: item.favorites
    })));
  });

  app.post("/api/items", upload.single('imageFile'), async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    const data = {
      ...req.body,
      price: Number(req.body.price),
      isGift: req.body.isGift === 'true',
      imageUrl: req.file ? `/api/uploads/${req.file.originalname}` : MOCK_IMAGES[Math.floor(Math.random() * MOCK_IMAGES.length)]
    };
    
    const parseResult = insertItemSchema.safeParse(data);
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
