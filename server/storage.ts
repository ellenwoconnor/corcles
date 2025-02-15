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
import { eq, and, desc, sql } from "drizzle-orm";
import session from "express-session";
import connectPg from "connect-pg-simple";
import { pool } from "./db";

const PostgresSessionStore = connectPg(session);

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByAddress(address: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  getItems(
    community: string,
    userId?: number,
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
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async getItems(
    community: string,
    userId?: number,
  ): Promise<(Item & { userHasFavorited: boolean })[]> {
    return await db
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
        userHasFavorited: sql`EXISTS (
        SELECT 1 FROM ${favoriteTable}
        WHERE ${favoriteTable.itemId} = ${items.id}
        AND ${favoriteTable.userId} = ${userId ?? 0}
      )`.as("userHasFavorited"),
      })
      .from(items)
      .where(eq(items.community, community))
      .orderBy(desc(items.createdAt));
  }

  async getItem(
    id: number,
    userId?: number,
  ): Promise<(Item & { userHasFavorited: boolean }) | undefined> {
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
        userHasFavorited: sql`EXISTS (
          SELECT 1 FROM ${favoriteTable}
          WHERE ${favoriteTable.itemId} = ${items.id}
          AND ${favoriteTable.userId} = ${userId ?? 0}
        )`.as("userHasFavorited"),
      })
      .from(items)
      .where(eq(items.id, id));
    return result;
  }

  async createItem(item: InsertItem & { userId: number }): Promise<Item> {
    const [newItem] = await db.insert(items).values(item).returning();
    return newItem;
  }

  async favoriteItem(id: number, userId: number): Promise<void> {
    const item = await this.getItem(id, userId);
    if (!item) return;

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
    }
  }

  async unfavoriteItem(id: number, userId: number): Promise<void> {
    const item = await this.getItem(id, userId);
    if (!item) return;

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
    }
  }
}

export const storage = new DatabaseStorage();
