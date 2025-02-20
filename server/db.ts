import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import logger from './logger';

neonConfig.webSocketConstructor = ws;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

export const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// Import schema after pool setup to avoid circular dependencies
import * as schema from "@shared/schema";
export const db = drizzle(pool, { schema });

// Run initial migration
async function migrate() {
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
      proposed_pickup_windows JSONB[]
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
      logger.info('Successfully executed migration');
    } catch (error) {
      logger.error('Error executing migration:', error);
      throw error;
    }
  }
}

// Run migrations on startup
migrate().catch(console.error);