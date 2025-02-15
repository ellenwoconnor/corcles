import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";

neonConfig.webSocketConstructor = ws;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Run initial migration
async function migrate() {
  const migrations = [
    // Create tables if they don't exist
    `CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      username TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL,
      display_name TEXT NOT NULL,
      avatar_url TEXT,
      community TEXT NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS items (
      id SERIAL PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      price INTEGER,
      is_gift BOOLEAN NOT NULL DEFAULT FALSE,
      image_url TEXT NOT NULL,
      user_id INTEGER NOT NULL,
      community TEXT NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      favorites INTEGER NOT NULL DEFAULT 0
    )`,
    `CREATE TABLE IF NOT EXISTS favorites (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL,
      item_id INTEGER NOT NULL
    )`
  ];

  for (const migration of migrations) {
    await db.execute(sql.raw(migration));
  }
}

// Run migrations on startup
migrate().catch(console.error);



export const pool = new Pool({ connectionString: process.env.DATABASE_URL });
export const db = drizzle({ client: pool, schema });
