import createMemoryStore from "memorystore";
import session from "express-session";
import { InsertUser, User, Item, InsertItem } from "@shared/schema";

const MemoryStore = createMemoryStore(session);

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  getItems(community: string): Promise<Item[]>;
  getItem(id: number): Promise<Item | undefined>;
  createItem(item: InsertItem & { userId: number }): Promise<Item>;
  favoriteItem(id: number): Promise<void>;
  unfavoriteItem(id: number): Promise<void>;
  
  sessionStore: session.Store;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private items: Map<number, Item>;
  public sessionStore: session.Store;
  private currentUserId: number;
  private currentItemId: number;

  constructor() {
    this.users = new Map();
    this.items = new Map();
    this.currentUserId = 1;
    this.currentItemId = 1;
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000,
    });
  }

  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentUserId++;
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  async getItems(community: string): Promise<Item[]> {
    return Array.from(this.items.values())
      .filter(item => item.community === community)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async getItem(id: number): Promise<Item | undefined> {
    return this.items.get(id);
  }

  async createItem(item: InsertItem & { userId: number }): Promise<Item> {
    const id = this.currentItemId++;
    const newItem: Item = {
      ...item,
      id,
      createdAt: new Date(),
      favorites: 0
    };
    this.items.set(id, newItem);
    return newItem;
  }

  async favoriteItem(id: number): Promise<void> {
    const item = this.items.get(id);
    if (item) {
      item.favorites++;
      this.items.set(id, item);
    }
  }

  async unfavoriteItem(id: number): Promise<void> {
    const item = this.items.get(id);
    if (item && item.favorites > 0) {
      item.favorites--;
      this.items.set(id, item);
    }
  }
}

export const storage = new MemStorage();
