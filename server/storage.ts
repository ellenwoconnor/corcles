import {
  users,
  items,
  favoriteTable,
  type User,
  type InsertUser,
  type Item,
  type InsertItem,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, sql, ilike } from "drizzle-orm";
import session from "express-session";
import connectPg from "connect-pg-simple";
import { pool } from "./db";
import logger from './logger';

const PostgresSessionStore = connectPg(session);

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByAddress(address: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  getItems(
    community: string,
    userId?: number,
    search?: string,
  ): Promise<(Item & { userHasFavorited: boolean })[]>;
  getItem(
    id: number,
    userId?: number,
  ): Promise<(Item & { userHasFavorited: boolean }) | undefined>;
  createItem(item: InsertItem & { userId: number }): Promise<Item>;
  favoriteItem(id: number, userId: number): Promise<void>;
  unfavoriteItem(id: number, userId: number): Promise<void>;
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
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.username, username));
    return user;
  }

  async getUserByAddress(address: string): Promise<User | undefined> {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.address, address));
    return user;
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
  ): Promise<(Item & { userHasFavorited: boolean })[]> {
    try {
      const query = db
        .select({
          id: items.id,
          title: items.title,
          description: items.description,
          price: items.price,
          isGift: items.isGift,
          imageUrl: items.imageUrl,
          userId: items.userId,
          community: items.community,
          createdAt: items.createdAt,
          favorites: items.favorites,
          userHasFavorited: sql<boolean>`EXISTS (
            SELECT 1 FROM ${favoriteTable}
            WHERE ${favoriteTable.itemId} = ${items.id}
            AND ${favoriteTable.userId} = ${userId ?? 0}
          )::boolean`.as("userHasFavorited"),
        })
        .from(items)
        .where(eq(items.community, community));

      // Add search condition if search term is provided
      if (search) {
        const searchTerm = `%${search}%`;
        query.where(
          sql`(${items.title} ILIKE ${searchTerm} OR ${items.description} ILIKE ${searchTerm})`
        );
      }

      const itemResults = await query.orderBy(desc(items.createdAt));

      logger.debug('Retrieved items:', { 
        community, 
        searchTerm: search, 
        count: itemResults.length 
      });

      return itemResults;
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
      const [result] = await db
        .select({
          id: items.id,
          title: items.title,
          description: items.description,
          price: items.price,
          isGift: items.isGift,
          imageUrl: items.imageUrl,
          userId: items.userId,
          community: items.community,
          createdAt: items.createdAt,
          favorites: items.favorites,
          userHasFavorited: sql<boolean>`EXISTS (
            SELECT 1 FROM ${favoriteTable}
            WHERE ${favoriteTable.itemId} = ${id}
            AND ${favoriteTable.userId} = ${userId ?? 0}
          )::boolean`.as("userHasFavorited"),
        })
        .from(items)
        .where(eq(items.id, id));

      logger.debug("getItem query result:", {
        id,
        userId,
        resultValue: result || 'No result found',
      });

      return result;
    } catch (error) {
      logger.error('Error retrieving item:', { error, id });
      throw error;
    }
  }

  async createItem(item: InsertItem & { userId: number }): Promise<Item> {
    try {
      const [newItem] = await db.insert(items).values(item).returning();
      logger.debug('Created new item:', { itemId: newItem.id });
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
}

export const storage = new DatabaseStorage();