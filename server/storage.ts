import { users, items, favoriteTable, type User, type InsertUser, type Item, type InsertItem } from "@shared/schema";
import { db } from "./db";
import { eq, and, desc } from "drizzle-orm";
import session from "express-session";
import connectPg from "connect-pg-simple";
import { pool } from "./db";

const PostgresSessionStore = connectPg(session);

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  getItems(community: string, userId?: number): Promise<(Item & { userHasFavorited: boolean })[]>;
  getItem(id: number): Promise<Item | undefined>;
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
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async getItems(community: string, userId?: number): Promise<(Item & { userHasFavorited: boolean })[]> {
    const results = await db
      .select({
        ...items,
        userHasFavorited: db
          .select()
          .from(favoriteTable)
          .where(
            and(
              eq(favoriteTable.itemId, items.id),
              eq(favoriteTable.userId, userId ?? 0)
            )
          )
          .limit(1)
          .then(rows => rows.length > 0)
      })
      .from(items)
      .where(eq(items.community, community))
      .orderBy(desc(items.createdAt));

    return results as (Item & { userHasFavorited: boolean })[];
  }

  async getItem(id: number): Promise<Item | undefined> {
    const [item] = await db.select().from(items).where(eq(items.id, id));
    return item;
  }

  async createItem(item: InsertItem & { userId: number }): Promise<Item> {
    const [newItem] = await db.insert(items).values(item).returning();
    return newItem;
  }

  async favoriteItem(id: number, userId: number): Promise<void> {
    const item = await this.getItem(id);
    if (!item) return;

    const [favorite] = await db
      .select()
      .from(favoriteTable)
      .where(
        and(
          eq(favoriteTable.itemId, id),
          eq(favoriteTable.userId, userId)
        )
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
    const item = await this.getItem(id);
    if (!item) return;

    const [favorite] = await db
      .select()
      .from(favoriteTable)
      .where(
        and(
          eq(favoriteTable.itemId, id),
          eq(favoriteTable.userId, userId)
        )
      );

    if (favorite) {
      await db
        .delete(favoriteTable)
        .where(
          and(
            eq(favoriteTable.itemId, id),
            eq(favoriteTable.userId, userId)
          )
        );
      await db
        .update(items)
        .set({ favorites: Math.max(0, item.favorites - 1) })
        .where(eq(items.id, id));
    }
  }
}

export const storage = new DatabaseStorage();