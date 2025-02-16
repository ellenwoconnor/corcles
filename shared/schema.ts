import { pgTable, text, serial, integer, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  displayName: text("display_name").notNull(),
  avatarUrl: text("avatar_url"),
  address: text("address").notNull(),
  zipCode: text("zip_code").notNull(),
  community: text("community").notNull(),
});

export const favoriteTable = pgTable("favorites", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  itemId: integer("item_id").notNull(),
});

export const items = pgTable("items", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  price: integer("price"),
  isGift: boolean("is_gift").notNull().default(false),
  imageUrl: text("image_url").notNull(),
  userId: integer("user_id").notNull(),
  community: text("community").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  favorites: integer("favorites").notNull().default(0),
  status: text("status").notNull().default('available'),
});

export const itemRequests = pgTable("item_requests", {
  id: serial("id").primaryKey(),
  itemId: integer("item_id").notNull(),
  requesterId: integer("requester_id").notNull(),
  status: text("status").notNull().default('pending'),
  message: text("message"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const itemBids = pgTable("item_bids", {
  id: serial("id").primaryKey(),
  itemId: integer("item_id").notNull(),
  bidderId: integer("bidder_id").notNull(),
  amount: integer("amount").notNull(),
  status: text("status").notNull().default('pending'),
  message: text("message"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertUserSchema = createInsertSchema(users).extend({
  password: z.string().min(6, "Password must be at least 6 characters"),
  displayName: z.string().min(2, "Display name must be at least 2 characters"),
  address: z.string()
    .min(5, "Address must be at least 5 characters")
    .refine((val) => {
      const hasNumber = /\d/.test(val);
      const hasStreet = /[a-zA-Z]/.test(val);
      return hasNumber && hasStreet;
    }, "Address must contain both numbers and street name"),
  zipCode: z.string()
    .min(5, "Zip code must be 5 digits")
    .max(5, "Zip code must be 5 digits")
    .refine((val) => /^\d{5}$/.test(val), "Zip code must be exactly 5 digits"),
}).omit({ 
  community: true
});

export const insertItemSchema = createInsertSchema(items).omit({ 
  id: true,
  userId: true,
  createdAt: true,
  favorites: true,
  status: true
}).extend({
  imageFile: z.instanceof(File).optional(),
});

export const insertItemRequestSchema = createInsertSchema(itemRequests).omit({
  id: true,
  createdAt: true,
  status: true
}).extend({
  message: z.string().optional()
});

export const insertItemBidSchema = createInsertSchema(itemBids).omit({
  id: true,
  createdAt: true,
  status: true
}).extend({
  amount: z.number().min(1, "Bid amount must be greater than 0"),
  message: z.string().optional()
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertItem = z.infer<typeof insertItemSchema>;
export type Item = typeof items.$inferSelect;
export type InsertItemRequest = z.infer<typeof insertItemRequestSchema>;
export type ItemRequest = typeof itemRequests.$inferSelect;
export type InsertItemBid = z.infer<typeof insertItemBidSchema>;
export type ItemBid = typeof itemBids.$inferSelect;

export const MOCK_COMMUNITIES = [
  "Downtown Seattle",
  "East Village NYC", 
  "Mission District SF",
  "Wicker Park Chicago",
  "South End Boston"
];