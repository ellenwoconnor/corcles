import { pgTable, text, serial, integer, boolean, timestamp } from "drizzle-orm/pg-core";
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
  community: text("community").notNull(), // This will be auto-generated as "home-circle-{zipCode}"
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
  community: true // Remove community from the insert schema as it will be auto-generated
});

export const insertItemSchema = createInsertSchema(items).omit({ 
  id: true,
  userId: true,
  createdAt: true,
  favorites: true
}).extend({
  imageFile: z.instanceof(File).optional(),
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertItem = z.infer<typeof insertItemSchema>;
export type Item = typeof items.$inferSelect;

export const MOCK_COMMUNITIES = [
  "Downtown Seattle",
  "East Village NYC", 
  "Mission District SF",
  "Wicker Park Chicago",
  "South End Boston"
];