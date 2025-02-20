import { pgTable, text, serial, integer, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Define status constants first
export const ITEM_STATUS = {
  AVAILABLE: 'available',
  REQUESTED: 'requested',
  SCHEDULING: 'scheduling',
  SCHEDULED: 'scheduled',
  COMPLETED: 'completed'
} as const;

export const REQUEST_STATUS = {
  PENDING: 'pending',
  READY_FOR_DRAWING: 'ready_for_drawing',
  AWAITING_PICKUP_CONFIRMATION: 'awaiting_pickup_confirmation',
  ACCEPTED: 'accepted',
  BACKUP: 'backup',
  CANCELED: 'canceled'
} as const;

// Schema definitions
export const pickupWindowSchema = z.object({
  pickupStart: z.string(),
  pickupEnd: z.string(),
  order: z.number().optional()
});

export type PickupWindow = z.infer<typeof pickupWindowSchema>;

// Community-related tables
export const communities = pgTable("communities", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  createdBy: integer("created_by").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  zipCode: text("zip_code").notNull(),
});

export const communityMembers = pgTable("community_members", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  communityId: integer("community_id").notNull(),
  joinedAt: timestamp("joined_at").notNull().defaultNow(),
  role: text("role").notNull().default('member'), // 'admin' or 'member'
});

export const communityInvitations = pgTable("community_invitations", {
  id: serial("id").primaryKey(),
  communityId: integer("community_id").notNull(),
  invitedBy: integer("invited_by").notNull(),
  invitedEmail: text("invited_email").notNull(),
  status: text("status").notNull().default('pending'), // 'pending', 'accepted', 'declined'
  createdAt: timestamp("created_at").notNull().defaultNow(),
  acceptedAt: timestamp("accepted_at"),
});

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  displayName: text("display_name").notNull(),
  avatarUrl: text("avatar_url"),
  address: text("address").notNull(),
  zipCode: text("zip_code").notNull(),
  community: text("community").notNull(), // Keep for backward compatibility
});

export const items = pgTable("items", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  price: integer("price"),
  isGift: boolean("is_gift").notNull().default(false),
  imageUrl: text("image_url").notNull(),
  userId: integer("user_id").notNull(),
  community: text("community").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  status: text("status").notNull().default(ITEM_STATUS.AVAILABLE),
  recipientId: integer("recipient_id"),
  pickupStart: timestamp("pickup_start"),
  pickupEnd: timestamp("pickup_end"),
  proposedPickupWindows: jsonb("proposed_pickup_windows").array(),
});

export const itemRequests = pgTable("item_requests", {
  id: serial("id").primaryKey(),
  itemId: integer("item_id").notNull(),
  requesterId: integer("requester_id").notNull(),
  status: text("status").notNull().default(REQUEST_STATUS.PENDING),
  message: text("message"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  cancellationInfo: jsonb("cancellation_info"),
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

export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  senderId: integer("sender_id").notNull(),
  recipientId: integer("recipient_id").notNull(),
  content: text("content").notNull(),
  requestId: integer("request_id").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  readAt: timestamp("read_at"),
});

// Zod schemas for validation
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
  status: true,
  recipientId: true,
  pickupStart: true,
  pickupEnd: true,
  proposedPickupWindows: true
}).extend({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  price: z.number().nullable().optional(),
  imageFile: z.instanceof(File).optional(),
}).refine((data) => {
  if (!data.isGift && (!data.price || data.price < 0.01)) {
    return false;
  }
  return true;
}, {
  message: "Price must be greater than zero for non-free items",
  path: ["price"],
});

export const insertItemRequestSchema = createInsertSchema(itemRequests).omit({
  id: true,
  createdAt: true,
  status: true,
  cancellationInfo: true
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

export const insertMessageSchema = createInsertSchema(messages).omit({
  id: true,
  createdAt: true,
  readAt: true,
}).extend({
  content: z.string().min(1, "Message cannot be empty").max(1000, "Message is too long"),
});

// Community schemas
export const insertCommunitySchema = createInsertSchema(communities).extend({
  name: z.string().min(3, "Community name must be at least 3 characters"),
  description: z.string().optional(),
  zipCode: z.string()
    .min(5, "Zip code must be 5 digits")
    .max(5, "Zip code must be 5 digits")
    .refine((val) => /^\d{5}$/.test(val), "Zip code must be exactly 5 digits"),
}).omit({
  id: true,
  createdAt: true
});

export const insertCommunityInvitationSchema = createInsertSchema(communityInvitations).extend({
  invitedEmail: z.string().email("Invalid email address"),
}).omit({
  id: true,
  createdAt: true,
  acceptedAt: true,
  status: true
});

// Export types
export type InsertCommunity = z.infer<typeof insertCommunitySchema>;
export type Community = typeof communities.$inferSelect;
export type CommunityMember = typeof communityMembers.$inferSelect;
export type CommunityInvitation = typeof communityInvitations.$inferSelect;

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertItem = z.infer<typeof insertItemSchema>;
export type Item = typeof items.$inferSelect & {
  userDisplayName?: string;
  proposedPickupWindows?: PickupWindow[];
};
export type InsertItemRequest = z.infer<typeof insertItemRequestSchema>;
export type ItemRequest = typeof itemRequests.$inferSelect & {
  cancellationInfo?: CancellationInfo;
};
export type InsertItemBid = z.infer<typeof insertItemBidSchema>;
export type ItemBid = typeof itemBids.$inferSelect;
export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type Message = typeof messages.$inferSelect;

export const MOCK_COMMUNITIES = [
  "Downtown Seattle",
  "East Village NYC",
  "Mission District SF",
  "Wicker Park Chicago",
  "South End Boston"
];

export const cancellationInfoSchema = z.object({
  canceledBy: z.number(),
  canceledAt: z.string(),
  reason: z.string().optional()
});

export type CancellationInfo = z.infer<typeof cancellationInfoSchema>;