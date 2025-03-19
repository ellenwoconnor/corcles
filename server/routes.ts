import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import multer from "multer";
import { setupAuth } from "./auth";
import { storage } from "./storage";
import * as schema from "@shared/schema";
import { ITEM_STATUS, REQUEST_STATUS } from "@shared/constants";
import { z } from "zod";
import { eq, and, not, or, inArray, desc } from "drizzle-orm";
import { addDays, addHours, isBefore, isAfter } from "date-fns";
import {
  insertItemBidSchema,
  insertItemRequestSchema,
  insertItemSchema,
  insertMessageSchema,
  insertWishlistSchema,
  insertCommunityInviteSchema,
} from "@shared/schema";
import { db } from "./db";
import logger from "./logger";
import { generateCommunityInviteEmail } from "./utils/mail";
import session from "express-session";
import connectPg from "connect-pg-simple";
import { pool } from "./db";
import cookieParser from "cookie-parser";
import passport from "passport";
import {
  uploadToDigitalOcean,
  isS3Configured,
  uploadFileToDigitalOcean,
} from "./storage-do";
import configRoutes from "./routes/config";

const PostgresSessionStore = connectPg(session);

const sessionStore = new PostgresSessionStore({
  pool,
  createTableIfMissing: true,
  tableName: "session",
});

const sessionMiddleware = session({
  store: sessionStore,
  secret: process.env.SESSION_SECRET || "your-secret-key",
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false,
    httpOnly: true,
    sameSite: "lax",
    maxAge: 24 * 60 * 60 * 1000,
  },
});

// Track SSE clients
const sseClients = new Map<number, Response>();

// Helper function to send SSE message to a specific user
function sendSSEMessage(userId: number, data: any) {
  const client = sseClients.get(userId);
  if (client) {
    try {
      client.write(`data: ${JSON.stringify(data)}\n\n`);
      logger.debug("SSE message sent successfully:", {
        userId,
        messageType: data.type,
      });
    } catch (error) {
      logger.error("Failed to send SSE message:", { userId, error });
      // Remove failed connection
      sseClients.delete(userId);
    }
  }
}

export async function registerRoutes(app: Express): Promise<Server> {
  app.use(cookieParser());
  app.use(sessionMiddleware);
  app.use(passport.initialize());
  app.use(passport.session());

  setupAuth(app);

  // Register config routes
  app.use(configRoutes);

  // Middleware to check authentication
  const requireAuth = (req: Request, res: Response, next: NextFunction) => {
    if (!req.isAuthenticated()) {
      logger.warn("Unauthenticated request:", {
        path: req.path,
        method: req.method,
        sessionID: req.sessionID,
      });
      return res.status(401).json({ error: "Authentication required" });
    }
    next();
  };

  // SSE endpoint setup
  app.get("/api/events", requireAuth, (req, res) => {
    const userId = req.user?.id;
    if (!userId) {
      logger.warn("SSE connection attempt without user ID");
      return res.status(401).json({ error: "Authentication required" });
    }

    logger.info("New SSE connection established:", { userId });

    // Set headers for SSE
    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    });

    // Send initial connection message
    res.write(`data: ${JSON.stringify({ type: "connected" })}\n\n`);

    // Store client connection
    sseClients.set(userId, res);

    // Remove client on connection close
    req.on("close", () => {
      logger.info("SSE connection closed:", { userId });
      sseClients.delete(userId);
      res.end();
    });

    // Handle errors
    res.on("error", (error) => {
      logger.error("SSE connection error:", { userId, error });
      sseClients.delete(userId);
      res.end();
    });
  });

  app.post("/api/wishlists", requireAuth, async (req, res) => {
    try {
      const data = {
        ...req.body,
        userId: req.user.id,
        budget: req.body.budget ? Number(req.body.budget) : undefined,
      };

      const parseResult = insertWishlistSchema.safeParse(data);
      if (!parseResult.success) {
        return res.status(400).json(parseResult.error);
      }

      const wishlist = await storage.createWishlist(parseResult.data);
      logger.info("Created new wishlist:", {
        wishlistId: wishlist.id,
        userId: req.user.id,
      });

      res.status(201).json(wishlist);
    } catch (error) {
      logger.error("Error creating wishlist:", error);
      res.status(500).json({ error: "Failed to create wishlist" });
    }
  });

  app.get("/api/wishlists/:id", requireAuth, async (req, res) => {
    try {
      const wishlistId = parseInt(req.params.id);
      if (isNaN(wishlistId)) {
        return res.status(400).json({ error: "Invalid wishlist ID" });
      }

      const wishlist = await storage.getWishlist(wishlistId);
      if (!wishlist) {
        return res.status(404).json({ error: "Wishlist not found" });
      }

      if (wishlist.isPrivate && wishlist.userId !== req.user.id) {
        return res.status(403).json({ error: "Access denied" });
      }

      res.json(wishlist);
    } catch (error) {
      logger.error("Error fetching wishlist:", error);
      res.status(500).json({ error: "Failed to fetch wishlist" });
    }
  });

  app.get("/api/user/wishlists", requireAuth, async (req, res) => {
    try {
      const wishlists = await storage.getUserWishlists(req.user.id);
      res.json(wishlists);
    } catch (error) {
      logger.error("Error fetching user wishlists:", error);
      res.status(500).json({ error: "Failed to fetch wishlists" });
    }
  });

  app.get("/api/community/:id/wishlists", requireAuth, async (req, res) => {
    try {
      const communityId = parseInt(req.params.id);
      if (isNaN(communityId)) {
        return res.status(400).json({ error: "Invalid community ID" });
      }

      const isMember = await storage.isUserInCommunity(
        req.user.id,
        communityId,
      );
      if (!isMember) {
        return res
          .status(403)
          .json({ error: "Not a member of this community" });
      }

      const wishlists = await storage.getCommunityWishlists(communityId);
      res.json(wishlists);
    } catch (error) {
      logger.error("Error fetching community wishlists:", error);
      res.status(500).json({ error: "Failed to fetch wishlists" });
    }
  });

  app.get("/api/communities/wishlists", requireAuth, async (req, res) => {
    try {
      const userCommunities = await storage.getUserCommunities(req.user.id);
      const communityIds = userCommunities.map((c) => c.id);

      logger.debug("Fetching wishlists for communities:", {
        userId: req.user.id,
        communityIds,
      });

      if (communityIds.length === 0) {
        return res.json([]);
      }

      const wishlists = await db
        .select({
          ...schema.wishlists,
          userDisplayName: schema.users.displayName,
          communityMascot: schema.communities.mascot,
        })
        .from(schema.wishlists)
        .leftJoin(schema.users, eq(schema.wishlists.userId, schema.users.id))
        .leftJoin(
          schema.communities,
          eq(schema.wishlists.communityId, schema.communities.id)
        )
        .where(
          and(
            inArray(schema.wishlists.communityId, communityIds),
            or(
              eq(schema.wishlists.isPrivate, false),
              eq(schema.wishlists.userId, req.user.id),
            ),
          ),
        );

      res.json(wishlists);
    } catch (error) {
      logger.error("Error fetching community wishlists:", error);
      res.status(500).json({ error: "Failed to fetch community wishlists" });
    }
  });

  app.patch("/api/wishlists/:id", requireAuth, async (req, res) => {
    try {
      const wishlistId = parseInt(req.params.id);
      if (isNaN(wishlistId)) {
        return res.status(400).json({ error: "Invalid wishlist ID" });
      }

      const updates = {
        ...req.body,
        budget: req.body.budget ? Number(req.body.budget) : undefined,
      };

      const partialWishlistSchema = insertWishlistSchema.partial();
      const parseResult = partialWishlistSchema.safeParse(updates);
      if (!parseResult.success) {
        return res.status(400).json(parseResult.error);
      }

      const updatedWishlist = await storage.updateWishlist(
        wishlistId,
        req.user.id,
        parseResult.data,
      );

      if (!updatedWishlist) {
        return res
          .status(404)
          .json({ error: "Wishlist not found or unauthorized" });
      }

      res.json(updatedWishlist);
    } catch (error) {
      logger.error("Error updating wishlist:", error);
      res.status(500).json({ error: "Failed to update wishlist" });
    }
  });

  app.post("/api/messages/send", requireAuth, async (req, res) => {
    try {
      const { recipientId, content, requestId } = req.body;
      logger.info("Received message request:", {
        recipientId,
        requestId,
        content: content?.substring(0, 20), // Log just the start of content for privacy
        senderId: req.user?.id,
      });

      // Validate recipient exists
      const recipient = await db
        .select()
        .from(schema.users)
        .where(eq(schema.users.id, recipientId))
        .limit(1);

      if (!recipient.length) {
        logger.error("Invalid recipient:", { recipientId });
        return res.status(400).json({ error: "Invalid recipient" });
      }

      const parseResult = insertMessageSchema.safeParse({
        senderId: req.user?.id,
        recipientId,
        content,
        requestId,
      });

      if (!parseResult.success) {
        logger.error("Message validation failed:", parseResult.error);
        return res.status(400).json(parseResult.error);
      }

      const message = await storage.sendMessage(parseResult.data);

      // Send SSE notifications
      const notificationPayload = {
        type: "new_message",
        data: message,
      };

      // Get the item data from the request
      const [itemRequest] = await db
        .select({
          itemId: schema.itemRequests.itemId,
          itemTitle: schema.items.title
        })
        .from(schema.itemRequests)
        .leftJoin(schema.items, eq(schema.itemRequests.itemId, schema.items.id))
        .where(eq(schema.itemRequests.id, requestId))
        .limit(1);

      // Create notification for recipient
      await db.insert(schema.notifications).values({
        userId: recipientId,
        type: "new_message",
        data: {
          messageId: message.id,
          senderId: req.user?.id,
          content: content.substring(0, 100), // First 100 chars of message
          requestId: requestId,
          itemId: itemRequest?.itemId,
          itemTitle: itemRequest?.itemTitle
        },
      });

      // Update notification payload with item data
      notificationPayload.data = {
        ...notificationPayload.data,
        itemId: itemRequest?.itemId,
        itemTitle: itemRequest?.itemTitle
      };

      // Notify recipient
      sendSSEMessage(recipientId, notificationPayload);

      // Notify sender
      if (req.user?.id) {
        sendSSEMessage(req.user.id, notificationPayload);
      }

      res.status(201).json(message);
    } catch (error) {
      logger.error("Error sending message:", error);
      res.status(500).json({ error: "Failed to send message" });
    }
  });

  // Get all messages between these two users for this request
  app.get("/api/messages/:userId/:requestId", requireAuth, async (req, res) => {
    try {
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

      // Check if the current user is either the item owner or requester
      const canAccess =
        req.user.id === item.userId || req.user.id === itemRequest.requesterId;
      if (!canAccess) {
        return res
          .status(403)
          .json({ error: "You cannot view these messages" });
      }

      // Get all messages between these two users for this request
      const messages = await storage.getConversation(
        item.userId,
        itemRequest.requesterId,
        requestId,
      );

      // Mark messages as read
      await storage.markMessagesAsRead(req.user.id, userId, requestId);

      res.json(messages);
    } catch (error) {
      logger.error("Error fetching messages:", error);
      res.status(500).json({ error: "Failed to fetch messages" });
    }
  });

  app.get("/api/messages/unread-count", requireAuth, async (req, res) => {
    try {
      const count = await storage.getUnreadMessageCount(req.user.id);
      res.json({ count });
    } catch (error) {
      logger.error("Error getting unread message count:", error);
      res.status(500).json({ error: "Failed to get unread message count" });
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
        createdAt: new Date(item.createdAt).toISOString(),
      });
    } catch (error) {
      logger.error("Error fetching item:", error);
      res.status(500).json({ error: "Failed to fetch item" });
    }
  });

  app.get("/api/items", requireAuth, async (req, res) => {
    try {
      const { search, communities: communityParam, freeOnly, includeWithRecipients } = req.query;
      const searchTerm = typeof search === "string" ? search.trim() : undefined;

      let communities: number[] = [];
      if (typeof communityParam === "string") {
        communities = communityParam
          .split(",")
          .map((c) => parseInt(c))
          .filter((c) => !isNaN(c));
      }

      // Only log search information when a real search is being performed
      if (searchTerm) {
        logger.info("Search request:", {
          term: searchTerm,
          communityIds: communities.join(","),
          freeOnly: freeOnly === "true" ? true : false,
          includeWithRecipients: includeWithRecipients === "true"
        });
      }

      logger.debug("Parsed communities:", {
        communities,
        length: communities.length,
      });

      if (communities.length === 0) {
        return res
          .status(400)
          .json({ error: "At least one valid community ID is required" });
      }

      // No need for additional search term logging

      const isFreeOnly = freeOnly === "true";
      
      // Log filters being applied
      logger.debug("Applying filters:", {
        communities,
        searchTerm,
        freeOnly: isFreeOnly
      });
      
      const items = await storage.getItems(
        communities,
        req.user?.id,
        searchTerm,
        false,
        isFreeOnly,
        includeWithRecipients !== "true", // Only exclude items with recipients if not explicitly including them
      );

      // Only log item fetches with search terms or if explicitly debugging
      if (searchTerm && logger.level === "debug") {
        logger.debug("Items fetched:", {
          searchTerm,
          itemCount: items.length,
        });
      }

      res.json(
        items.map((item) => ({
          ...item,
          createdAt: new Date(item.createdAt).toISOString(),
        })),
      );
    } catch (error) {
      logger.error("Error fetching items:", error);
      res.status(500).json({ error: "Failed to fetch items" });
    }
  });

  // Set up multer for handling file uploads - either to memory or Digital Ocean
  const memoryUpload = multer({
    storage: multer.memoryStorage(),
    limits: {
      fileSize: 5 * 1024 * 1024, // 5MB file size limit
    },
  });

  // Determine which upload middleware to use based on configuration
  const upload = isS3Configured() ? uploadToDigitalOcean : memoryUpload;

  // Log which storage option is being used
  logger.info(
    `Using ${isS3Configured() ? "Digital Ocean Spaces" : "memory storage"} for file uploads`,
  );

  app.post(
    "/api/items",
    requireAuth,
    upload.single("imageFile"),
    async (req, res) => {
      try {
        // Log received form data for debugging
        logger.debug("Received form data:", req.body);
        logger.debug("Received file:", req.file);

        let imageUrl =
          req.body.imageUrl ||
          "https://images.unsplash.com/photo-1737282836845-555d9214dfe4";

        // Handle file upload if present
        if (req.file) {
          try {
            // If the file has a location property, it was uploaded to S3
            if (req.file.location) {
              // This is from multer-s3 - the file was uploaded to cloud storage
              imageUrl = req.file.location;
              logger.info("Image uploaded to cloud storage:", {
                url: imageUrl,
                originalName: req.file.originalname,
                size: req.file.size,
              });
            } else {
              // Fallback to base64 encoding for development
              // Generate a unique filename
              const timestamp = Date.now();
              const filename = `${timestamp}-${req.file.originalname.replace(/\s+/g, "-")}`;

              // Convert buffer to base64 for demo purposes
              const base64Image = req.file.buffer.toString("base64");

              // Create a data URL that can be used in img src
              imageUrl = `data:${req.file.mimetype};base64,${base64Image}`;

              logger.debug("Processed image upload using base64 fallback:", {
                originalName: req.file.originalname,
                size: req.file.size,
                mimeType: req.file.mimetype,
              });
            }
          } catch (uploadError) {
            logger.error("Error processing uploaded image:", uploadError);
            // Continue with default image if upload fails
          }
        }

        // Parse form data values and convert types appropriately
        const data = {
          title: req.body.title?.trim(),
          description: req.body.description || "",
          isGift: req.body.isGift === "true",
          price: req.body.price ? parseFloat(req.body.price) : undefined,
          userId: req.user?.id,
          communityId: parseInt(req.body.communityId),
          imageUrl: imageUrl,
          pickupLocation: req.body.pickupLocation || null,
        };

        logger.debug("Creating item with data:", data);

        // Use a modified schema for API requests that doesn't require imageFile
        const apiItemSchema = z
          .object({
            title: z.string().min(1, "Title is required"),
            description: z.string().optional(),
            price: z.number().nullable().optional(),
            isGift: z.boolean(),
            imageUrl: z.string(),
            userId: z.number(),
            communityId: z.coerce.number({
              required_error: "Please select a community",
            }),
            pickupLocation: z.string().nullable().optional(),
          })
          .refine(
            (data) => {
              if (!data.isGift && (!data.price || data.price < 0.01)) {
                return false;
              }
              return true;
            },
            {
              message: "Price must be greater than zero for non-free items",
              path: ["price"],
            },
          );

        const parseResult = apiItemSchema.safeParse(data);

        if (!parseResult.success) {
          logger.error("Item validation failed:", parseResult.error);
          return res.status(400).json(parseResult.error);
        }

        const item = await storage.createItem(parseResult.data);

        res.status(201).json({
          ...item,
          createdAt: new Date(item.createdAt).toISOString(),
        });
      } catch (error) {
        logger.error("Error creating item:", error);
        res.status(500).json({ error: "Failed to create item" });
      }
    },
  );

  app.post("/api/items/:id/request", requireAuth, async (req, res) => {
    try {
      const itemId = parseInt(req.params.id);
      if (isNaN(itemId)) {
        return res.status(400).json({ error: "Invalid item ID" });
      }

      const item = await storage.getItem(itemId);
      if (!item) {
        return res.status(404).json({ error: "Item not found" });
      }

      if (!item.isGift) {
        return res
          .status(400)
          .json({ error: "Item is not available for request" });
      }

      const parseResult = insertItemRequestSchema.safeParse({
        ...req.body,
        itemId,
        requesterId: req.user.id,
      });

      if (!parseResult.success) {
        logger.error("Item request validation failed:", parseResult.error);
        return res.status(400).json(parseResult.error);
      }

      const request = await storage.createItemRequest(parseResult.data);
      logger.info("Item request created:", {
        itemId,
        requesterId: req.user.id,
        requestId: request.id,
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
      logger.error("Error creating request:", error);
      res.status(500).json({ error: "Failed to create request" });
    }
  });

  app.post("/api/items/:id/bid", requireAuth, async (req, res) => {
    try {
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
      logger.error("Error creating bid:", error);
      res.status(500).json({ error: "Failed to create bid" });
    }
  });

  app.get("/api/items/:id/my-requests", requireAuth, async (req, res) => {
    try {
      const itemId = parseInt(req.params.id);
      if (isNaN(itemId)) {
        return res.status(400).json({ error: "Invalid item ID" });
      }

      const requests = await storage.getItemRequests(itemId);
      res.json(
        requests.filter((request) => request.requesterId === req.user.id),
      );
    } catch (error) {
      logger.error("Error fetching requests:", error);
      res.status(500).json({ error: "Failed to fetch requests" });
    }
  });

  app.get("/api/user/items", requireAuth, async (req, res) => {
    try {
      const userCommunities = await storage.getUserCommunities(req.user.id);
      const userItems = await storage.getItems(
        userCommunities.map((c) => c.id),
        req.user.id,
        undefined,
        true,
      );

      logger.debug("Fetching user items:", {
        userId: req.user.id,
        community: req.user.community,
        itemCount: userItems.length,
      });

      res.json(userItems);
    } catch (error) {
      logger.error("Error fetching user items:", error);
      res.status(500).json({ error: "Failed to fetch user items" });
    }
  });

  app.get("/api/items/:id/requests", requireAuth, async (req, res) => {
    try {
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
      logger.debug("Fetching item requests:", {
        itemId,
        requestCount: requests.length,
        ownerId: item.userId,
        requesterId: req.user.id,
      });

      res.json(requests);
    } catch (error) {
      logger.error("Error fetching requests:", error);
      res.status(500).json({ error: "Failed to fetch requests" });
    }
  });

  app.get("/api/user/bids", requireAuth, async (req, res) => {
    try {
      const bids = await storage.getUserBids(req.user.id);
      res.json(bids);
    } catch (error) {
      logger.error("Error fetching user bids:", error);
      res.status(500).json({ error: "Failed to fetch user bids" });
    }
  });

  app.get("/api/user", requireAuth, (req, res) => {
    res.json(req.user);
  });

  app.get("/api/community/:community/count", requireAuth, async (req, res) => {
    try {
      const result = await db
        .select()
        .from(schema.users)
        .where(eq(schema.users.community, req.params.community));
      logger.debug("Community count query result:", {
        community: req.params.community,
        count: result.length,
      });
      res.json({ count: result.length });
    } catch (error) {
      logger.error("Error fetching community count:", error);
      res.status(500).json({ error: "Failed to fetch community count" });
    }
  });

  app.post("/api/items/:id/draw", requireAuth, async (req, res) => {
    try {
      const itemId = parseInt(req.params.id);
      if (isNaN(itemId)) {
        return res.status(400).json({ error: "Invalid item ID" });
      }

      const item = await storage.getItem(itemId);
      if (!item) {
        return res.status(404).json({ error: "Item not found" });
      }

      if (item.userId !== req.user.id) {
        return res
          .status(403)
          .json({ error: "Not authorized to draw for this item" });
      }

      if (!item.isGift) {
        return res.status(400).json({ error: "Can only draw for free items" });
      }

      if (item.recipientId) {
        return res.status(400).json({ error: "Drawing already completed" });
      }

      const requests = await storage.getItemRequests(itemId);
      const pendingRequests = requests.filter((r) => r.status === "pending");

      if (pendingRequests.length === 0) {
        return res
          .status(400)
          .json({ error: "No pending requests available for drawing" });
      }

      const winningRequest =
        pendingRequests[Math.floor(Math.random() * pendingRequests.length)];

      await db
        .update(schema.items)
        .set({
          recipientId: winningRequest.requesterId,
          status: "pending_pickup",
        })
        .where(eq(schema.items.id, itemId));

      // Create notification for the recipient
      await db.insert(schema.notifications).values({
        userId: winningRequest.requesterId,
        type: "recipient_selected",
        data: {
          itemId: itemId,
          itemTitle: item.title
        },
      });

      // Send SSE notification
      sendSSEMessage(winningRequest.requesterId, {
        type: "recipient_selected",
        data: {
          itemId: itemId,
          title: item.title
        }
      });


      for (const request of requests) {
        await storage.updateItemRequestStatus(
          request.id,
          request.id === winningRequest.id
            ? "awaiting_pickup_confirmation"
            : "rejected",
        );
      }

      res.json({ success: true });
    } catch (error) {
      logger.error("Error performing drawing:", error);
      res.status(500).json({ error: "Failed to perform drawing" });
    }
  });

  app.post("/api/items/:id/schedule", requireAuth, async (req, res) => {
    try {
      const itemId = parseInt(req.params.id);
      if (isNaN(itemId)) {
        return res.status(400).json({ error: "Invalid item ID" });
      }

      const item = await storage.getItem(itemId);
      if (!item) {
        return res.status(404).json({ error: "Item not found" });
      }

      if (item.userId !== req.user.id) {
        return res
          .status(403)
          .json({ error: "Not authorized to schedule pickup for this item" });
      }

      const [activeRequest] = await db
        .select()
        .from(schema.itemRequests)
        .where(
          and(
            eq(schema.itemRequests.itemId, itemId),
            or(
              eq(schema.itemRequests.status, REQUEST_STATUS.PENDING),
              eq(schema.itemRequests.status, REQUEST_STATUS.ACCEPTED),
            ),
          ),
        );

      if (!activeRequest) {
        return res
          .status(400)
          .json({ error: "No active request found for scheduling" });
      }

      logger.debug("Found active request for scheduling:", {
        requestId: activeRequest.id,
        requesterId: activeRequest.requesterId,
        status: activeRequest.status,
      });

      const { proposedPickupWindows } = req.body;

      logger.debug("Received time windows:", proposedPickupWindows);

      if (
        !Array.isArray(proposedPickupWindows) ||
        proposedPickupWindows.length ===0 ||
        proposedPickupWindows.length > 10
      ) {
        return res
          .status(400)
          .json({ error: "Must provide between 1 and 10 time windows" });
      }

      const now = new Date();
      const twoWeeksFromNow = addDays(now, 14);

      const validatedWindows = [];
      for (const window of proposedPickupWindows) {
        try {
          const startDate = new Date(window.pickupStart);
          const endDate = new Date(window.pickupEnd);

          if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
            return res.status(400).json({ error: "Invalid date format" });
          }

          if (isBefore(startDate, now)) {
            return res
              .status(400)
              .json({ error: "Pickup start time must be in the future" });
          }

          if (isAfter(startDate, twoWeeksFromNow)) {
            return res
              .status(400)
              .json({ error: "Pickup must be within the next two weeks" });
          }

          if (isAfter(endDate, addHours(startDate, 1))) {
            return res
              .status(400)
              .json({ error: "Pickup window cannot exceed 1 hour" });
          }

          validatedWindows.push({
            pickupStart: startDate.toISOString(),
            pickupEnd: endDate.toISOString(),
          });
        } catch (error) {
          logger.error("Date validation error:", error);
          return res
            .status(400)
            .json({ error: "Invalid date format in time windows" });
        }
      }

      const proposedWindows = validatedWindows.map((window, index) => ({
        ...window,
        order: index,
      }));

      logger.debug("Validated windows:", proposedWindows);

      const updates = {
        proposedPickupWindows: proposedWindows,
        status: ITEM_STATUS.SCHEDULING,
        recipientId: activeRequest.requesterId,
      };

      await db
        .update(schema.items)
        .set(updates)
        .where(eq(schema.items.id, itemId));

      await db
        .update(schema.itemRequests)
        .set({ status: REQUEST_STATUS.AWAITING_PICKUP_CONFIRMATION })
        .where(eq(schema.itemRequests.id, activeRequest.id));

      await db
        .update(schema.itemRequests)
        .set({ status: REQUEST_STATUS.REJECTED })
        .where(
          and(
            eq(schema.itemRequests.itemId, itemId),
            not(eq(schema.itemRequests.id, activeRequest.id)),
          ),
        );

      logger.info("Updated item with pickup windows and recipient:", {
        itemId,
        recipientId: activeRequest.requesterId,
        windowsCount: proposedWindows.length,
        newStatus: ITEM_STATUS.SCHEDULING,
      });

      res.json({ success: true });
    } catch (error) {
      logger.error("Error scheduling pickup:", error);
      res.status(500).json({ error: "Failed to schedule pickup" });
    }
  });

  app.post("/api/items/:id/confirm-pickup", requireAuth, async (req, res) => {
    try {
      const itemId = parseInt(req.params.id);
      if (isNaN(itemId)) {
        return res.status(400).json({ error: "Invalid item ID" });
      }

      const { confirmed } = req.body;
      if (typeof confirmed !== "boolean") {
        return res
          .status(400)
          .json({ error: "Confirmation status is required" });
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
            eq(schema.itemRequests.requesterId, req.user?.id),
            eq(
              schema.itemRequests.status,
              REQUEST_STATUS.AWAITING_PICKUP_CONFIRMATION,
            ),
          ),
        );

      if (!request) {
        return res
          .status(404)
          .json({ error: "No pending pickup confirmation found" });
      }

      await db
        .update(schema.itemRequests)
        .set({
          status: confirmed ? REQUEST_STATUS.ACCEPTED : REQUEST_STATUS.PENDING,
        })
        .where(eq(schema.itemRequests.id, request.id));

      // Send SSE notification about the confirmation
      const notificationPayload = {
        type: "pickup_confirmation",
        data: {
          itemId,
          requestId: request.id,
          confirmed,
        },
      };

      // Notify both parties
      if (item.userId) sendSSEMessage(item.userId, notificationPayload);
      if (req.user?.id) sendSSEMessage(req.user.id, notificationPayload);

      res.json({ success: true });
    } catch (error) {
      logger.error("Error confirming pickup:", error);
      res.status(500).json({ error: "Failed to confirm pickup" });
    }
  });

  // Endpoint to set a recipient for an item (for wishlist fulfillment)
  app.post("/api/items/:id/set-recipient", requireAuth, async (req, res) => {
    try {
      const itemId = parseInt(req.params.id);
      if (isNaN(itemId)) {
        return res.status(400).json({ error: "Invalid item ID" });
      }

      const { recipientId, wishlistId } = req.body;
      if (!recipientId || isNaN(parseInt(recipientId.toString()))) {
        return res
          .status(400)
          .json({ error: "Valid recipient ID is required" });
      }

      const item = await storage.getItem(itemId);
      if (!item) {
        return res.status(404).json({ error: "Item not found" });
      }

      // Check if the current user is the owner of the item
      if (item.userId !== req.user.id) {
        return res
          .status(403)
          .json({ error: "Not authorized to set recipient for this item" });
      }

      // If wishlistId is provided, validate it
      let validWishlistId = null;
      if (wishlistId && !isNaN(parseInt(wishlistId.toString()))) {
        const wishlist = await db
          .select()
          .from(schema.wishlists)
          .where(eq(schema.wishlists.id, parseInt(wishlistId.toString())))
          .limit(1);
        

        if (wishlist.length > 0) {
          validWishlistId = parseInt(wishlistId.toString());
        }
      }

      // Update the item with the recipient and wishlist info
      await db
        .update(schema.items)
        .set({
          recipientId: recipientId,
          wishlistId: validWishlistId,
        })
        .where(eq(schema.items.id, itemId));

      // Send notification to recipient
      const notificationPayload = {
        type: "recipient_selected",
        data: {
          itemId,
          title: item.title
        },
      };

      if (recipientId) {
        sendSSEMessage(recipientId, notificationPayload);
      }

      logger.info("Set recipient for item:", {
        itemId,
        recipientId,
        wishlistId: validWishlistId,
        userId: req.user.id,
      });

      res.json({ success: true });
    } catch (error) {
      logger.error("Error setting recipient:", error);
      res.status(500).json({ error: "Failed to set recipient" });
    }
  });

  app.patch(
    "/api/items/:id",
    requireAuth,
    upload.single("imageFile"),
    async (req, res) => {
      try {
        const itemId = parseInt(req.params.id);
        if (isNaN(itemId)) {
          return res.status(400).json({ error: "Invalid item ID" });
        }

        const item = await storage.getItem(itemId);
        if (!item) {
          return res.status(404).json({ error: "Item not found" });
        }

        if (item.userId !== req.user.id) {
          return res
            .status(403)
            .json({ error: "Not authorized to edit this item" });
        }

        // Handle file upload if present
        let imageUrl = req.body.imageUrl;
        if (req.file) {
          try {
            // If the file has a location property, it was uploaded to S3
            if (req.file.location) {
              // This is from multer-s3 - the file was uploaded to cloud storage
              imageUrl = req.file.location;
              logger.info("Image uploaded to cloud storage:", {
                url: imageUrl,
                originalName: req.file.originalname,
                size: req.file.size,
              });
            } else {
              // Fallback to base64 encoding for development
              // Generate a unique filename
              const timestamp = Date.now();
              const filename = `${timestamp}-${req.file.originalname.replace(/\s+/g, "-")}`;

              // Convert buffer to base64 for demo purposes
              const base64Image = req.file.buffer.toString("base64");

              // Create a data URL that can be used in img src
              imageUrl = `data:${req.file.mimetype};base64,${base64Image}`;

              logger.debug("Processed image upload using base64 fallback:", {
                originalName: req.file.originalname,
                size: req.file.size,
                mimeType: req.file.mimetype,
              });
            }
          } catch (uploadError) {
            logger.error("Error processing uploaded image:", uploadError);
            // Continue with existing image URL if upload fails
          }
        }

        const partialItemSchema = z.object({
          title: z.string().optional(),
          description: z.string().optional(),
          price: z.number().optional(),
          isGift: z.boolean().optional(),
          imageUrl: z.string().optional(),
          community: z.string().optional(),
          pickupLocation: z.string().nullable().optional(), //Added pickupLocation
        });

        const data = {
          ...req.body,
          price: req.body.price ? Number(req.body.price) : undefined,
          isGift:
            typeof req.body.isGift === "boolean" ? req.body.isGift : undefined,
          imageUrl: imageUrl,
        };

        const parseResult = partialItemSchema.safeParse(data);
        if (!parseResult.success) {
          return res.status(400).json(parseResult.error);
        }

        const updatedItem = await storage.updateItem(itemId, parseResult.data);
        res.json(updatedItem);
      } catch (error) {
        logger.error("Error updating item:", error);
        res.status(500).json({ error: "Failed to update item" });
      }
    },
  );

  app.post(
    "/api/items/:id/select-pickup-time",
    requireAuth,
    async (req, res) => {
      try {
        const itemId = parseInt(req.params.id);
        if (isNaN(itemId)) {
          return res.status(400).json({ error: "Invalid item ID" });
        }

        const { windowIndex } = req.body;

        if (typeof windowIndex !== "number") {
          return res.status(400).json({ error: "Window index is required" });
        }

        const item = await storage.getItem(itemId);
        if (!item) {
          return res.status(404).json({ error: "Item not found" });
        }

        if (
          !item.proposedPickupWindows ||
          !item.proposedPickupWindows[windowIndex]
        ) {
          return res
            .status(400)
            .json({ error: "Invalid pickup window selected" });
        }

        const selectedWindow = item.proposedPickupWindows[windowIndex];

        const pickupStart = new Date(selectedWindow.pickupStart);
        const pickupEnd = new Date(selectedWindow.pickupEnd);

        if (isNaN(pickupStart.getTime()) || isNaN(pickupEnd.getTime())) {
          return res.status(400).json({ error: "Invalid pickup window dates" });
        }

        logger.debug("Selected pickup window:", {
          windowIndex,
          pickupStart,
          pickupEnd,
          originalStart: selectedWindow.pickupStart,
          originalEnd: selectedWindow.pickupEnd,
        });

        await db
          .update(schema.items)
          .set({
            pickupStart: pickupStart,
            pickupEnd: pickupEnd,
            status: ITEM_STATUS.SCHEDULED,
            recipientId: req.user.id,
          })
          .where(eq(schema.items.id, itemId));

        await db
          .update(schema.itemRequests)
          .set({
            status: "accepted",
          })
          .where(
            and(
              eq(schema.itemRequests.itemId, itemId),
              eq(schema.itemRequests.requesterId, req.user.id),
            ),
          );

        await db
          .update(schema.itemRequests)
          .set({
            status: "rejected",
          })
          .where(
            and(
              eq(schema.itemRequests.itemId, itemId),
              not(eq(schema.itemRequests.requesterId, req.user.id)),
            ),
          );

        res.json({ success: true });
      } catch (error) {
        logger.error("Error selecting pickup time:", error);
        res.status(500).json({ error: "Failed to select pickup time" });
      }
    },
  );

  app.get("/api/user/requests", requireAuth, async (req, res) => {
    try {
      const requests = await storage.getUserRequests(req.user.id);
      logger.debug("Fetching user requests:", {
        userId: req.user.id,
        requestCount: requests?.length,
      });
      res.json(requests);
    } catch (error) {
      logger.error("Error fetching user requests:", error);
      res.status(500).json({ error: "Failed to fetch user requests" });
    }
  });

  app.get("/api/items/:id/bids", requireAuth, async (req, res) => {
    try {
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
      logger.debug("Fetching item bids:", {
        itemId,
        bidCount: bids.length,
        ownerId: item.userId,
      });
      res.json(bids);
    } catch (error) {
      logger.error("Error fetching bids:", error);
      res.status(500).json({ error: "Failed to fetch bids" });
    }
  });

  app.get("/api/user/communities", requireAuth, async (req, res) => {
    try {
      const communities = await storage.getUserCommunities(req.user.id);
      logger.debug("Retrieved user communities:", {
        userId: req.user.id,
        communities: communities.map((c) => ({
          id: c.id,
          name: c.name,
          role: c.role,
          memberCount: c.memberCount,
        })),
      });
      res.json(communities);
    } catch (error) {
      logger.error("Error fetching user communities:", error);
      res.status(500).json({ error: "Failed to fetch user communities" });
    }
  });

  app.post("/api/communities", requireAuth, async (req, res) => {
    try {
      const { name, description } = req.body;

      if (!name) {
        return res.status(400).json({ error: "Community name is required" });
      }

      const community = await storage.createCommunity({
        name,
        description,
        createdBy: req.user.id,
        isCustom: true,
      });

      logger.debug("Created new community:", {
        communityId: community.id,
        name: community.name,
        createdBy: req.user.id,
      });

      res.status(201).json(community);
    } catch (error) {
      logger.error("Error creating community:", error);
      res.status(500).json({ error: "Failed to create community" });
    }
  });

  app.post("/api/communities/:id/invite", requireAuth, async (req, res) => {
    try {
      const communityId = parseInt(req.params.id);
      if (isNaN(communityId)) {
        return res.status(400).json({ error: "Invalid community ID" });
      }

      logger.debug("Processing community invite:", {
        communityId,
        invitedEmail: req.body.invitedEmail,
        invitedBy: req.user.id,
      });

      const isMember = await storage.isUserInCommunity(
        req.user.id,
        communityId,
      );
      if (!isMember) {
        return res
          .status(403)
          .json({ error: "Not authorized to invite to this community" });
      }

      const parseResult = insertCommunityInviteSchema.safeParse({
        invitedEmail: req.body.invitedEmail,
        communityId,
        invitedBy: req.user.id,
      });

      if (!parseResult.success) {
        logger.error("Community invite validation failed:", {
          errors: parseResult.error.errors,
          body: req.body,
        });
        return res.status(400).json({
          error: "Invalid invitation data",
          details: parseResult.error.errors,
        });
      }

      const invite = await storage.createCommunityInvite(parseResult.data);
      if (!invite) {
        logger.error("Failed to create community invite in database");
        return res.status(500).json({ error: "Failed to create invite" });
      }

      const community = await storage.getCommunity(communityId);
      if (!community) {
        logger.error("Community not found after creating invite");
        return res.status(404).json({ error: "Community not found" });
      }

      const emailHtml = generateCommunityInviteEmail({
        communityName: community.name,
        inviterName: req.user.displayName,
      });

      let emailSent = false;

      try {
        emailSent = await sendMail({
          to: parseResult.data.invitedEmail,
          subject: `${req.user.displayName} invited you to join ${community.name} on Corcles`,
          html: emailHtml,
        });
      } catch (emailError) {
        logger.error("Failed to send invite email:", emailError);
        // Continue execution - we'll return the invite even if email fails
      }

      if (!emailSent) {
        logger.warn("Community invite created but email failed to send:", {
          communityId,
          invitedEmail: parseResult.data.invitedEmail,
        });
      } else {
        logger.info("Community invite created and email sent successfully:", {
          communityId,
          invitedEmail: parseResult.data.invitedEmail,
        });
      }

      res.status(201).json({
        ...invite,
        emailSent,
        message: emailSent
          ? "Invitation created and email sent successfully"
          : "Invitation created but email delivery failed",
      });
    } catch (error) {
      logger.error("Error in community invite process:", error);
      res.status(500).json({ error: "Failed to create community invite" });
    }
  });

  app.post("/api/register", async (req, res, next) => {
    try {
      logger.info("Starting registration process", {
        body: { ...req.body, password: "[REDACTED]" },
      });

      const parseResult = schema.insertUserSchema.safeParse(req.body);
      if (!parseResult.success) {
        logger.warn("Registration validation failed:", {
          errors: parseResult.error.errors,
          body: { ...req.body, password: "[REDACTED]" },
        });
        return res.status(400).json(parseResult.error);
      }

      const email = parseResult.data.email.toLowerCase();
      logger.debug("Checking for existing user/email", {
        username: parseResult.data.username,
        email,
      });

      const [existingUser, existingEmail] = await Promise.all([
        storage.getUserByUsername(parseResult.data.username),
        storage.getUserByEmail(email),
      ]);

      if (existingUser) {
        logger.warn("Registration blocked - username exists:", {
          username: parseResult.data.username,
          ip: req.ip,
        });
        return res.status(400).json({ error: "Username already exists" });
      }

      if (existingEmail) {
        logger.warn("Registration blocked - email exists:", {
          email,
          ip: req.ip,
        });
        return res.status(400).json({ error: "Email already exists" });
      }

      logger.info("Starting user creation transaction");
      const hashedPassword = await hashPassword(parseResult.data.password);

      const result = await db.transaction(async (tx) => {
        logger.debug("Transaction step 1: Creating user");
        const [user] = await tx
          .insert(schema.users)
          .values({
            ...parseResult.data,
            email,
            password: hashedPassword,
          })
          .returning();

        logger.info("User created successfully:", {
          userId: user.id,
          username: user.username,
          email,
        });

        logger.debug("Transaction step 2: Finding pending invites");
        const pendingInvites = await tx
          .select()
          .from(schema.communityInvites)
          .where(
            and(
              eq(schema.communityInvites.invitedEmail, email),
              eq(schema.communityInvites.status, "pending"),
            ),
          );

        logger.info("Found pending invites:", {
          userId: user.id,
          email,
          inviteCount: pendingInvites.length,
          invites: pendingInvites.map((i) => ({
            id: i.id,
            communityId: i.communityId,
            invitedBy: i.invitedBy,
          })),
        });

        logger.debug("Transaction step 3: Processing invites");
        const processedInvites = [];
        for (const invite of pendingInvites) {
          try {
            logger.debug("Processing invite:", {
              inviteId: invite.id,
              communityId: invite.communityId,
            });

            const [community] = await tx
              .select()
              .from(schema.communities)
              .where(eq(schema.communities.id, invite.communityId));

            if (!community) {
              logger.warn("Skipping invite - community not found:", {
                inviteId: invite.id,
                communityId: invite.communityId,
              });
              continue;
            }

            // Skip non-custom (zip code) communities
            if (!community.isCustom) {
              logger.warn("Skipping invite - non-custom community:", {
                inviteId: invite.id,
                communityId: invite.communityId,
                communityName: community.name,
              });
              continue;
            }

            await tx
              .insert(schema.userCommunities)
              .values({
                userId: user.id,
                communityId: invite.communityId,
                role: "member",
                joinedAt: new Date(),
              })
              .onConflictDoNothing();

            await tx
              .update(schema.communityInvites)
              .set({
                status: "accepted",
                acceptedAt: new Date(),
              })
              .where(eq(schema.communityInvites.id, invite.id));

            processedInvites.push(invite.id);
            logger.info("Successfully processed invite:", {
              userId: user.id,
              inviteId: invite.id,
              communityId: invite.communityId,
              communityName: community.name,
            });
          } catch (err) {
            logger.error("Failed to process invite:", {
              userId: user.id,
              inviteId: invite.id,
              error: err,
              errorStack: err.stack,
            });
            throw err;
          }
        }

        logger.debug("Transaction step 4: Handling zip code community");
        const zipCodeCommunityName = `Community ${parseResult.data.zipCode}`;
        let zipCommunity = await tx
          .select()
          .from(schema.communities)
          .where(eq(schema.communities.name, zipCodeCommunityName))
          .limit(1);

        if (zipCommunity.length === 0) {
          logger.info("Creating new zip code community:", {
            zipCode: parseResult.data.zipCode,
            communityName: zipCodeCommunityName,
          });

          [zipCommunity] = await tx
            .insert(schema.communities)
            .values({
              name: zipCodeCommunityName,
              description: `Local community for ${parseResult.data.zipCode}`,
              createdBy: user.id,
              isCustom: false,
            })
            .returning();

          logger.info("Created zip code community:", {
            userId: user.id,
            communityId: zipCommunity.id,
            zipCode: parseResult.data.zipCode,
          });
        } else {
          logger.info("Found existing zip code community:", {
            communityId: zipCommunity[0].id,
            communityName: zipCodeCommunityName,
          });
        }

        await tx
          .insert(schema.userCommunities)
          .values({
            userId: user.id,
            communityId: zipCommunity[0].id,
            role: "member",
            joinedAt: new Date(),
          })
          .onConflictDoNothing();

        logger.info("Added user to zip code community:", {
          userId: user.id,
          communityId: zipCommunity[0].id,
          zipCode: parseResult.data.zipCode,
        });

        return {
          user,
          enrolledCommunities: processedInvites.length + 1,
          processedInvites,
        };
      });

      logger.info("Registration completed successfully:", {
        userId: result.user.id,
        username: result.user.username,
        enrolledCommunities: result.enrolledCommunities,
        processedInvites: result.processedInvites,
      });

      req.login(result.user, (err) => {
        if (err) {
          logger.error("Error during login after registration:", {
            error: err,
            errorStack: err.stack,
            userId: result.user.id,
          });
          return next(err);
        }

        logger.info("User logged in after registration:", {
          userId: result.user.id,
          username: result.user.username,
        });

        res.status(201).json(result.user);
      });
    } catch (error) {
      logger.error("Error during user registration:", {
        error,
        errorStack: error.stack,
        username: req.body?.username,
      });
      next(error);
    }
  });

  // Add SSE endpoint
  // Get user notifications
  app.get("/api/notifications", requireAuth, async (req, res) => {
    try {
      logger.debug("Fetching notifications for user:", { userId: req.user?.id });

      const notifications = await db
        .select()
        .from(schema.notifications)
        .where(eq(schema.notifications.userId, req.user.id))
        .orderBy(desc(schema.notifications.createdAt));

      logger.debug("Found notifications:", { count: notifications.length });

      res.json(notifications.map(notification => ({
        id: notification.id.toString(),
        type: notification.type,
        data: notification.data,
        timestamp: new Date(notification.createdAt).getTime(),
        read: notification.read
      })));
    } catch (error) {
      logger.error("Error fetching notifications:", error);
      res.status(500).json({ error: "Failed to fetch notifications" });
    }
  });

  // Mark notification as read
  app.post("/api/notifications/:id/acknowledge", requireAuth, async (req, res) => {
    try {
      const notificationId = parseInt(req.params.id);
      if (isNaN(notificationId)) {
        return res.status(400).json({ error: "Invalid notification ID" });
      }

      await db
        .update(schema.notifications)
        .set({ read: true })
        .where(
          and(
            eq(schema.notifications.id, notificationId),
            eq(schema.notifications.userId, req.user.id)
          )
        );

      res.json({ success: true });
    } catch (error) {
      logger.error("Error acknowledging notification:", error);
      res.status(500).json({ error: "Failed to acknowledge notification" });
    }
  });

  app.delete("/api/items/:id", requireAuth, async (req, res) => {
    try {
      const itemId = parseInt(req.params.id);
      if (isNaN(itemId)) {
        return res.status(400).json({ error: "Invalid item ID" });
      }

      // Get the item to verify ownership
      const item = await storage.getItem(itemId);
      if (!item) {
        return res.status(404).json({ error: "Item not found" });
      }

      // Verify ownership
      if (item.userId !== req.user?.id) {
        return res.status(403).json({ error: "Not authorized to delete this item" });
      }

      // Delete related records first
      await db.delete(schema.messages)
        .where(
          inArray(
            schema.messages.requestId,
            db.select({ id: schema.itemRequests.id })
              .from(schema.itemRequests)
              .where(eq(schema.itemRequests.itemId, itemId))
          )
        );

      // Delete requests
      await db.delete(schema.itemRequests)
        .where(eq(schema.itemRequests.itemId, itemId));

      // Delete bids
      await db.delete(schema.itemBids)
        .where(eq(schema.itemBids.itemId, itemId));

      // Finally delete the item
      await db.delete(schema.items)
        .where(eq(schema.items.id, itemId));

      logger.info('Item deleted successfully:', { itemId, userId: req.user?.id });
      res.json({ success: true });
    } catch (error) {
      logger.error("Error deleting item:", error);
      res.status(500).json({ error: "Failed to delete item" });
    }
  });

  app.post("/api/items/:id/delist", requireAuth, async (req, res) => {
    try {
      const itemId = parseInt(req.params.id);
      if (isNaN(itemId)) {
        return res.status(400).json({ error: "Invalid item ID" });
      }

      // Get the item to verify ownership
      const item = await storage.getItem(itemId);
      if (!item) {
        return res.status(404).json({ error: "Item not found" });
      }

      // Verify ownership
      if (item.userId !== req.user?.id) {
        return res.status(403).json({ error: "Not authorized to delist this item" });
      }

      // Update all associated item requests to canceled status
      await db.update(schema.itemRequests)
        .set({ 
          status: REQUEST_STATUS.CANCELED,
          cancellationInfo: JSON.stringify({
            canceledBy: req.user.id,
            canceledAt: new Date().toISOString(),
            reason: "Item was delisted by owner"
          })
        })
        .where(eq(schema.itemRequests.itemId, itemId));

      // Update item status to delisted
      await db.update(schema.items)
        .set({ status: "delisted" })
        .where(eq(schema.items.id, itemId));

      logger.info('Item delisted successfully and requests canceled:', { 
        itemId, 
        userId: req.user?.id 
      });
      

      res.json({ success: true });
    } catch (error) {
      logger.error("Error delisting item:", error);
      res.status(500).json({ error: "Failed to delist item" });
    }
  });

  const server = createServer(app);
  return server;
}