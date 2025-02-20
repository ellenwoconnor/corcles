import { pgTable, text, serial, integer, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const pickupWindowSchema = z.object({
  pickupStart: z.string(),
  pickupEnd: z.string(),
  order: z.number().optional()
});

export type PickupWindow = z.infer<typeof pickupWindowSchema>;

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  displayName: text("display_name").notNull(),
  avatarUrl: text("avatar_url"),
  address: text("address").notNull(),
  zipCode: text("zip_code").notNull(),
  email: text("email").notNull().unique(),
});

export const communities = pgTable("communities", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  createdBy: integer("created_by").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  isCustom: boolean("is_custom").notNull().default(true),
});

export const userCommunities = pgTable("user_communities", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  communityId: integer("community_id").notNull().references(() => communities.id),
  joinedAt: timestamp("joined_at").notNull().defaultNow(),
  role: text("role").notNull().default('member'),
});

export const communityInvites = pgTable("community_invites", {
  id: serial("id").primaryKey(),
  communityId: integer("community_id").notNull().references(() => communities.id),
  invitedBy: integer("invited_by").notNull().references(() => users.id),
  invitedEmail: text("invited_email").notNull(),
  status: text("status").notNull().default('pending'),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  acceptedAt: timestamp("accepted_at"),
});

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

export const items = pgTable("items", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  price: integer("price"),
  isGift: boolean("is_gift").notNull().default(false),
  imageUrl: text("image_url").notNull(),
  userId: integer("user_id").notNull(),
  communityId: integer("community_id").notNull().references(() => communities.id),
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
  senderId: integer("sender_id").notNull().references(() => users.id),
  recipientId: integer("recipient_id").notNull().references(() => users.id),
  content: text("content").notNull(),
  requestId: integer("request_id").notNull().references(() => itemRequests.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  readAt: timestamp("read_at"),
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
  email: true
});

export const insertItemSchema = createInsertSchema(items).omit({
  id: true,
  userId: true,
  createdAt: true,
  status: true,
  recipientId: true,
  pickupStart: true,
  pickupEnd: true,
  communityId: true
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

export const insertCommunitySchema = createInsertSchema(communities).omit({
  id: true,
  createdAt: true,
}).extend({
  name: z.string().min(3, "Community name must be at least 3 characters"),
  description: z.string().optional(),
});

export const insertUserCommunitySchema = createInsertSchema(userCommunities).omit({
  id: true,
  joinedAt: true,
});

export const insertCommunityInviteSchema = createInsertSchema(communityInvites).omit({
  id: true,
  createdAt: true,
  acceptedAt: true,
  status: true,
}).extend({
  invitedEmail: z.string().email("Invalid email address"),
});


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
export type InsertCommunity = z.infer<typeof insertCommunitySchema>;
export type Community = typeof communities.$inferSelect;
export type UserCommunity = typeof userCommunities.$inferSelect;
export type CommunityInvite = typeof communityInvites.$inferSelect;

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