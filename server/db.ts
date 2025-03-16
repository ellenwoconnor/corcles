import { Pool, neonConfig } from '@neondatabase/serverless';
import * as schema from "@shared/schema";
import logger from './logger';
import pkg from 'pg';
import dotenv from 'dotenv';
import { drizzle } from "drizzle-orm/node-postgres";

dotenv.config();
console.log("Starting database in prod environment");
console.log("Using local environmental variables", process.env);

const { Pool } = pkg;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

export const db = drizzle(pool, { schema });
console.log('Initialized DrizzleDB with database connection');

// Run initial migration
async function migrate() {
  logger.info('Starting database migration');
  const migrations = [
    `CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      username TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL,
      display_name TEXT NOT NULL,
      avatar_url TEXT,
      address TEXT NOT NULL,
      zip_code TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE
    )`,
    `CREATE TABLE IF NOT EXISTS communities (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      mascot TEXT DEFAULT '🏠',
      created_by INTEGER NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      is_custom BOOLEAN NOT NULL DEFAULT false
    )`,
    `CREATE TABLE IF NOT EXISTS user_communities (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id),
      community_id INTEGER NOT NULL REFERENCES communities(id),
      joined_at TIMESTAMP NOT NULL DEFAULT NOW(),
      role TEXT NOT NULL DEFAULT 'member',
      UNIQUE(user_id, community_id)
    )`,
    `CREATE TABLE IF NOT EXISTS community_invites (
      id SERIAL PRIMARY KEY,
      community_id INTEGER NOT NULL REFERENCES communities(id),
      invited_by INTEGER NOT NULL REFERENCES users(id),
      invited_email TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      accepted_at TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS items (
      id SERIAL PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT,
      price INTEGER,
      is_gift BOOLEAN NOT NULL DEFAULT FALSE,
      image_url TEXT NOT NULL,
      user_id INTEGER NOT NULL,
      community_id INTEGER NOT NULL REFERENCES communities(id),
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      status TEXT NOT NULL DEFAULT 'available',
      recipient_id INTEGER,
      pickup_start TIMESTAMP,
      pickup_end TIMESTAMP,
      proposed_pickup_windows JSONB[],
      pickup_location TEXT,
      wishlist_id INTEGER
    )`,
    `CREATE TABLE IF NOT EXISTS item_requests (
      id SERIAL PRIMARY KEY,
      item_id INTEGER NOT NULL,
      requester_id INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      message TEXT,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      cancellation_info JSONB
    )`,
    `CREATE TABLE IF NOT EXISTS wishlists (
      id SERIAL PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT,
      user_id INTEGER NOT NULL REFERENCES users(id),
      community_id INTEGER NOT NULL REFERENCES communities(id),
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      status TEXT NOT NULL DEFAULT 'active',
      budget INTEGER,
      urgency TEXT DEFAULT 'normal',
      is_private BOOLEAN NOT NULL DEFAULT false
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
      sender_id INTEGER NOT NULL REFERENCES users(id),
      recipient_id INTEGER NOT NULL REFERENCES users(id),
      content TEXT NOT NULL,
      request_id INTEGER NOT NULL REFERENCES item_requests(id),
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      read_at TIMESTAMP
    )`,
    `DO $$
    BEGIN
      -- Create home communities for each zip code if they don't exist
      INSERT INTO communities (name, description, created_by, is_custom)
      SELECT DISTINCT 
        'Community ' || u.zip_code,
        'Local community for ' || u.zip_code,
        u.id,
        false
      FROM users u
      WHERE NOT EXISTS (
        SELECT 1 FROM communities c 
        WHERE c.name = 'Community ' || u.zip_code
      )
      AND u.id IN (
        SELECT MIN(id) 
        FROM users 
        GROUP BY zip_code
      );

      -- Add users to their home communities if they're not already members
      INSERT INTO user_communities (user_id, community_id, role)
      SELECT 
        u.id,
        c.id,
        CASE 
          WHEN u.id = c.created_by THEN 'admin'
          ELSE 'member'
        END
      FROM users u
      JOIN communities c ON c.name = 'Community ' || u.zip_code
      WHERE NOT EXISTS (
        SELECT 1 FROM user_communities uc
        WHERE uc.user_id = u.id AND uc.community_id = c.id
      );
    END $$;`
  ];

  for (const migration of migrations) {
    try {
      await pool.query(migration);
      logger.info('Successfully executed migration:', { migration });
    } catch (error) {
      logger.error('Error executing migration:', { error, migration });
      throw error;
    }
  }
}

// Run migrations on startup
migrate().catch(error => {
  logger.error('Failed to run migrations:', error);
  process.exit(1);
});

// Handle pool errors
pool.on('error', (err) => {
  logger.error('Unexpected error on idle client:', err);
});