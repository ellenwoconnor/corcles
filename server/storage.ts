import { users, items, favoriteTable, type User, type InsertUser, type Item, type InsertItem } from "@shared/schema";
import { db } from "./db";
import { eq, and } from "drizzle-orm";
import session from "express-session";
import connectPg from "connect-pg-simple";
import { pool } from "./db";

const PostgresSessionStore = connectPg(session);

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  getItems(community: string): Promise<Item[]>;
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

  async getItems(community: string): Promise<Item[]> {
    return await db
      .select()
      .from(items)
      .where(eq(items.community, community))
      .orderBy(items.createdAt);
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
      item.favorites += 1;
      await db.insert(favoriteTable).values({ itemId: id, userId });
      await db
        .update(items)
        .set({ favorites: item.favorites })
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
      item.favorites = Math.max(0, item.favorites - 1);
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
        .set({ favorites: item.favorites })
        .where(eq(items.id, id));
    }
  }
}

export const storage = new DatabaseStorage();