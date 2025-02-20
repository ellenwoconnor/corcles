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
      is_custom BOOLEAN NOT NULL DEFAULT FALSE
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
    DECLARE
      v_zip_code TEXT;
      v_first_user_id INTEGER;
      v_community_id INTEGER;
    BEGIN
      -- First, ensure all users have email addresses
      UPDATE users SET email = username || '@example.com' WHERE email IS NULL;

      -- Create default communities for each zip code if they don't exist
      FOR v_zip_code, v_first_user_id IN 
        SELECT DISTINCT zip_code, MIN(id) as first_user_id
        FROM users
        GROUP BY zip_code
      LOOP
        -- Check if community already exists for this zip code
        IF NOT EXISTS (
          SELECT 1 FROM communities 
          WHERE name = 'Community ' || v_zip_code
        ) THEN
          -- Create the community
          INSERT INTO communities (
            name, 
            description, 
            created_by,
            is_custom
          ) VALUES (
            'Community ' || v_zip_code,
            'Default community for ' || v_zip_code,
            v_first_user_id,
            FALSE
          ) RETURNING id INTO v_community_id;

          -- Add all users from this zip code to the community
          INSERT INTO user_communities (user_id, community_id, role)
          SELECT id, v_community_id, 
            CASE WHEN id = v_first_user_id THEN 'admin' ELSE 'member' END
          FROM users
          WHERE zip_code = v_zip_code;

          -- Update items to belong to this community if they don't have one
          UPDATE items i
          SET community_id = v_community_id
          FROM users u
          WHERE i.user_id = u.id
          AND u.zip_code = v_zip_code
          AND i.community_id IS NULL;
        END IF;
      END LOOP;
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