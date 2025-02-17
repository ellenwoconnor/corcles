import {
  users,
  items,
  favoriteTable,
  itemRequests,
  itemBids,
  type User,
  type InsertUser,
  type Item,
  type InsertItem,
  type ItemRequest,
  type InsertItemRequest,
  type ItemBid,
  type InsertItemBid,
  ITEM_STATUS,
  REQUEST_STATUS
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, sql, ilike } from "drizzle-orm";
import session from "express-session";
import connectPg from "connect-pg-simple";
import { pool } from "./db";
import logger from './logger';

const PostgresSessionStore = connectPg(session);

export interface IStorage {
  // Existing methods
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByAddress(address: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  getItems(
    community: string,
    userId?: number,
    search?: string,
    userItemsOnly?: boolean
  ): Promise<(Item & { userHasFavorited: boolean })[]>;
  getItem(
    id: number,
    userId?: number,
  ): Promise<(Item & { userHasFavorited: boolean }) | undefined>;
  createItem(item: InsertItem & { userId: number }): Promise<Item>;
  createItemRequest(request: InsertItemRequest): Promise<ItemRequest>;
  getItemRequests(itemId: number): Promise<ItemRequest[]>;
  getUserRequests(userId: number): Promise<(ItemRequest & { item: Item })[]>;
  updateItemRequestStatus(id: number, status: string): Promise<ItemRequest>;
  createItemBid(bid: InsertItemBid): Promise<ItemBid>;
  getItemBids(itemId: number): Promise<ItemBid[]>;
  getUserBids(userId: number): Promise<(ItemBid & { item: Item })[]>;
  updateItemBidStatus(id: number, status: string): Promise<ItemBid>;
  updateItemStatusAfterPickupSchedule(itemId: number): Promise<void>;
  updateItem(id: number, item: Partial<InsertItem>): Promise<Item>;
  sessionStore: session.Store;
}

export class DatabaseStorage implements IStorage {
  public sessionStore: session.Store;

  constructor() {
    this.sessionStore = new PostgresSessionStore({
      pool,
      createTableIfMissing: true,
    });
  }

  async getUser(id: number): Promise<User | undefined> {
    try {
      const [user] = await db.select().from(users).where(eq(users.id, id));
      logger.debug('Retrieved user:', { userId: id, user: user});
      return user;
    } catch (error) {
      logger.error('Error retrieving user:', { error, userId: id });
      throw error;
    }
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    try {
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.username, username));
      logger.debug('Retrieved user by username:', { username, user: user });
      return user;
    } catch (error) {
      logger.error('Error retrieving user by username:', { error, username });
      throw error;
    }
  }

  async getUserByAddress(address: string): Promise<User | undefined> {
    try {
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.address, address));
      logger.debug('Retrieved user by address:', { address, user: user });
      return user;
    } catch (error) {
      logger.error('Error retrieving user by address:', { error, address });
      throw error;
    }
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    try {
      // Generate the community name based on zip code
      const community = `home-circle-${insertUser.zipCode}`;

      const [user] = await db.insert(users).values({
        ...insertUser,
        community,
      }).returning();

      logger.debug('Created new user:', { 
        userId: user.id, 
        username: user.username,
        community
      });

      return user;
    } catch (error) {
      logger.error('Error creating user:', { error, username: insertUser.username });
      throw error;
    }
  }

  async getItems(
    community: string,
    userId?: number,
    search?: string,
    userItemsOnly?: boolean
  ): Promise<(Item & { userHasFavorited: boolean })[]> {
    try {
      const query = db
        .select({
          ...items,
          userDisplayName: sql<string>`(
            SELECT username FROM ${users} WHERE ${users.id} = ${items.userId}
          )`.as("userDisplayName"),
          userHasFavorited: sql<boolean>`EXISTS (
            SELECT 1 FROM ${favoriteTable}
            WHERE ${favoriteTable.itemId} = ${items.id}
            AND ${favoriteTable.userId} = ${userId ?? 0}
          )::boolean`.as("userHasFavorited"),
        })
        .from(items);

      // When fetching user's items, only filter by userId
      if (userItemsOnly) {
        query.where(eq(items.userId, userId!));
      } else {
        // For community browsing, filter by community and exclude completed items
        query.where(
          and(
            eq(items.community, community),
            sql`${items.status} != 'completed'`
          )
        );
      }

      if (search) {
        const searchTerm = `%${search}%`;
        query.where(
          sql`(${items.title} ILIKE ${searchTerm} OR ${items.description} ILIKE ${searchTerm})`
        );
      }

      const itemResults = await query.orderBy(desc(items.createdAt));

      // Process the pickup windows for all items
      const processedItems = itemResults.map(item => ({
        ...item,
        proposedPickupWindows: item.proposedPickupWindows 
          ? (item.proposedPickupWindows as PickupWindow[])
          : undefined
      }));

      logger.debug('Retrieved items:', { 
        community, 
        userId,
        userItemsOnly,
        searchTerm: search, 
        count: processedItems.length,
        items: processedItems.map(item => ({
          id: item.id,
          title: item.title,
          userId: item.userId,
          status: item.status
        }))
      });

      return processedItems as (Item & { userHasFavorited: boolean })[];
    } catch (error) {
      logger.error('Error retrieving items:', { error, community, searchTerm: search });
      throw error;
    }
  }

  async getItem(
    id: number,
    userId?: number,
  ): Promise<(Item & { userHasFavorited: boolean }) | undefined> {
    try {
      const [item] = await db
        .select({
          ...items,
          userDisplayName: sql<string>`(
            SELECT username FROM ${users} WHERE ${users.id} = ${items.userId}
          )`.as("userDisplayName"),
          userHasFavorited: sql<boolean>`
            CASE WHEN EXISTS (
              SELECT 1 FROM ${favoriteTable}
              WHERE ${favoriteTable.itemId} = ${items.id}
              AND ${favoriteTable.userId} = ${userId ?? 0}
            ) THEN true ELSE false END
          `.as("userHasFavorited"),
        })
        .from(items)
        .where(eq(items.id, id));

      if (!item) return undefined;

      // Cast the pickup windows to the correct type
      const processedItem = {
        ...item,
        proposedPickupWindows: item.proposedPickupWindows 
          ? (item.proposedPickupWindows as PickupWindow[])
          : undefined
      };

      logger.debug("getItem query result:", {
        id,
        userId,
        found: !!processedItem,
        item: processedItem
      });

      return processedItem as (Item & { userHasFavorited: boolean });
    } catch (error) {
      logger.error('Error retrieving item:', { error, id });
      throw error;
    }
  }

  async createItem(item: InsertItem & { userId: number }): Promise<Item> {
    try {
      const [newItem] = await db.insert(items).values(item).returning();
      logger.debug('Created new item:', { itemId: newItem.id, item: newItem });
      return newItem;
    } catch (error) {
      logger.error('Error creating item:', { error, item });
      throw error;
    }
  }

  async favoriteItem(id: number, userId: number): Promise<void> {
    try {
      const item = await this.getItem(id, userId);
      if (!item) {
        logger.warn('Attempted to favorite non-existent item:', { id, userId });
        return;
      }

      const [favorite] = await db
        .select()
        .from(favoriteTable)
        .where(
          and(eq(favoriteTable.itemId, id), eq(favoriteTable.userId, userId)),
        );

      if (!favorite) {
        await db.insert(favoriteTable).values({ itemId: id, userId });
        await db
          .update(items)
          .set({ favorites: item.favorites + 1 })
          .where(eq(items.id, id));
        logger.debug('Item favorited:', { id, userId });
      }
    } catch (error) {
      logger.error('Error favoriting item:', { error, id, userId });
      throw error;
    }
  }

  async unfavoriteItem(id: number, userId: number): Promise<void> {
    try {
      const item = await this.getItem(id, userId);
      if (!item) {
        logger.warn('Attempted to unfavorite non-existent item:', { id, userId });
        return;
      }

      const [favorite] = await db
        .select()
        .from(favoriteTable)
        .where(
          and(eq(favoriteTable.itemId, id), eq(favoriteTable.userId, userId)),
        );

      if (favorite) {
        await db
          .delete(favoriteTable)
          .where(
            and(eq(favoriteTable.itemId, id), eq(favoriteTable.userId, userId)),
          );
        await db
          .update(items)
          .set({ favorites: Math.max(0, item.favorites - 1) })
          .where(eq(items.id, id));
        logger.debug('Item unfavorited:', { id, userId });
      }
    } catch (error) {
      logger.error('Error unfavoriting item:', { error, id, userId });
      throw error;
    }
  }

  async createItemRequest(request: InsertItemRequest): Promise<ItemRequest> {
    try {
      const [newRequest] = await db.insert(itemRequests).values(request).returning();
      logger.debug('Created new item request:', { requestId: newRequest.id, request: newRequest });
      return newRequest;
    } catch (error) {
      logger.error('Error creating item request:', { error, request });
      throw error;
    }
  }

  async getItemRequests(itemId: number): Promise<ItemRequest[]> {
    try {
      const requests = await db
        .select()
        .from(itemRequests)
        .where(eq(itemRequests.itemId, itemId))
        .orderBy(desc(itemRequests.createdAt));

      logger.debug('Retrieved item requests:', {
        itemId,
        count: requests.length,
        requests
      });

      return requests;
    } catch (error) {
      logger.error('Error getting item requests:', { error, itemId });
      throw error;
    }
  }

  async getUserRequests(userId: number): Promise<(ItemRequest & { item: Item })[]> {
    try {
      const requests = await db
        .select({
          request: itemRequests,
          item: items,
        })
        .from(itemRequests)
        .innerJoin(items, eq(itemRequests.itemId, items.id))
        .where(eq(itemRequests.requesterId, userId))
        .orderBy(desc(itemRequests.createdAt));

      logger.debug('Retrieved user requests:', { userId, count: requests.length, requests });
      return requests.map(({ request, item }) => ({
        ...request,
        item,
      }));
    } catch (error) {
      logger.error('Error getting user requests:', { error, userId });
      throw error;
    }
  }

  async updateItemRequestStatus(id: number, status: string): Promise<ItemRequest> {
    try {
      const [updatedRequest] = await db
        .update(itemRequests)
        .set({ status })
        .where(eq(itemRequests.id, id))
        .returning();
      logger.debug('Updated item request status:', { requestId: id, status, updatedRequest });
      return updatedRequest;
    } catch (error) {
      logger.error('Error updating item request status:', { error, id, status });
      throw error;
    }
  }

  async createItemBid(bid: InsertItemBid): Promise<ItemBid> {
    try {
      const [newBid] = await db.insert(itemBids).values(bid).returning();
      logger.debug('Created new item bid:', { bidId: newBid.id, bid: newBid });
      return newBid;
    } catch (error) {
      logger.error('Error creating item bid:', { error, bid });
      throw error;
    }
  }

  async getItemBids(itemId: number): Promise<ItemBid[]> {
    try {
      const bids = await db
        .select()
        .from(itemBids)
        .where(eq(itemBids.itemId, itemId))
        .orderBy(desc(itemBids.amount));
      logger.debug('Retrieved item bids:', { itemId, count: bids.length, bids });
      return bids;
    } catch (error) {
      logger.error('Error getting item bids:', { error, itemId });
      throw error;
    }
  }

  async getUserBids(userId: number): Promise<(ItemBid & { item: Item })[]> {
    try {
      const bids = await db
        .select({
          bid: itemBids,
          item: items,
        })
        .from(itemBids)
        .innerJoin(items, eq(itemBids.itemId, items.id))
        .where(eq(itemBids.bidderId, userId))
        .orderBy(desc(itemBids.createdAt));

      logger.debug('Retrieved user bids:', { userId, count: bids.length, bids });
      return bids.map(({ bid, item }) => ({
        ...bid,
        item,
      }));
    } catch (error) {
      logger.error('Error getting user bids:', { error, userId });
      throw error;
    }
  }

  async updateItemBidStatus(id: number, status: string): Promise<ItemBid> {
    try {
      const [updatedBid] = await db
        .update(itemBids)
        .set({ status })
        .where(eq(itemBids.id, id))
        .returning();
      logger.debug('Updated item bid status:', { bidId: id, status, updatedBid });
      return updatedBid;
    } catch (error) {
      logger.error('Error updating item bid status:', { error, id, status });
      throw error;
    }
  }

  async updateItemStatusAfterPickupSchedule(itemId: number): Promise<void> {
    try {
      await db
        .update(items)
        .set({ status: 'pending_pickup' })
        .where(eq(items.id, itemId));

      // Update all requests for this item to awaiting_pickup_confirmation
      await db
        .update(itemRequests)
        .set({ status: 'awaiting_pickup_confirmation' })
        .where(
          and(
            eq(itemRequests.itemId, itemId),
            eq(itemRequests.status, 'ready_for_drawing')
          )
        );

      logger.debug('Updated item and request statuses after pickup schedule:', { itemId });
    } catch (error) {
      logger.error('Error updating item status after pickup schedule:', { error, itemId });
      throw error;
    }
  }

  async updateItem(id: number, item: Partial<InsertItem>): Promise<Item> {
    try {
      const [updatedItem] = await db
        .update(items)
        .set(item)
        .where(eq(items.id, id))
        .returning();

      logger.debug('Updated item:', { itemId: id, updates: item, updatedItem });
      return updatedItem;
    } catch (error) {
      logger.error('Error updating item:', { error, id, item });
      throw error;
    }
  }
}

export const storage = new DatabaseStorage();