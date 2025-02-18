
import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";
import logger from './logger';

neonConfig.webSocketConstructor = ws;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

export const pool = new Pool({ connectionString: process.env.DATABASE_URL });
export const db = drizzle({ client: pool, schema });

// Run initial migration
async function migrate() {
  const migrations = [
    // Create tables if they don't exist with current schema
    `CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      username TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL,
      display_name TEXT NOT NULL,
      avatar_url TEXT,
      address TEXT NOT NULL,
      zip_code TEXT NOT NULL,
      community TEXT NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS items (
      id SERIAL PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT,
      price INTEGER,
      is_gift BOOLEAN NOT NULL DEFAULT FALSE,
      image_url TEXT NOT NULL,
      user_id INTEGER NOT NULL,
      community TEXT NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      favorites INTEGER NOT NULL DEFAULT 0,
      recipient_id INTEGER REFERENCES users(id),
      pickup_start TIMESTAMP,
      pickup_end TIMESTAMP,
      status TEXT NOT NULL DEFAULT 'available',
      proposed_pickup_windows JSONB[]
    )`,
    `CREATE TABLE IF NOT EXISTS favorites (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id),
      item_id INTEGER NOT NULL REFERENCES items(id),
      UNIQUE(user_id, item_id)
    )`,
    `CREATE TABLE IF NOT EXISTS item_requests (
      id SERIAL PRIMARY KEY,
      item_id INTEGER NOT NULL,
      requester_id INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      message TEXT,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    )`,
    `CREATE TABLE IF NOT EXISTS item_bids (
      id SERIAL PRIMARY KEY,
      item_id INTEGER NOT NULL,
      bidder_id INTEGER NOT NULL,
      amount INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      message TEXT,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    )`,
    `CREATE TABLE IF NOT EXISTS messages (
      id SERIAL PRIMARY KEY,
      content TEXT NOT NULL,
      sender_id INTEGER NOT NULL REFERENCES users(id),
      recipient_id INTEGER NOT NULL REFERENCES users(id),
      request_id INTEGER NOT NULL REFERENCES item_requests(id),
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      read_at TIMESTAMP
    )`,
    // Add missing columns to existing tables
    `DO $$ 
    BEGIN 
      BEGIN
        ALTER TABLE users ADD COLUMN address TEXT NOT NULL DEFAULT '';
      EXCEPTION
        WHEN duplicate_column THEN NULL;
      END;
      
      BEGIN
        ALTER TABLE users ADD COLUMN zip_code TEXT NOT NULL DEFAULT '';
      EXCEPTION
        WHEN duplicate_column THEN NULL;
      END;
      
      BEGIN
        ALTER TABLE items ADD COLUMN proposed_pickup_windows JSONB[];
      EXCEPTION
        WHEN duplicate_column THEN NULL;
      END;
      
      BEGIN
        ALTER TABLE messages ADD COLUMN read_at TIMESTAMP;
      EXCEPTION
        WHEN duplicate_column THEN NULL;
      END;
    END $$;`
  ];

  for (const migration of migrations) {
    try {
      await pool.query(migration);
      logger.info('Successfully executed migration');
    } catch (error) {
      logger.error('Error executing migration:', error);
      throw error;
    }
  }
}

// Run migrations on startup
migrate().catch(console.error);
