import { db } from "./db";
import { sql } from "drizzle-orm";
import logger from './logger';

async function migrateEmailUnique() {
  try {
    logger.info('Starting email uniqueness migration');

    // First, check for duplicate emails
    const duplicates = await db.execute(sql`
      SELECT email, COUNT(*) 
      FROM users 
      GROUP BY email 
      HAVING COUNT(*) > 1
    `);

    if (duplicates.rowCount && duplicates.rowCount > 0) {
      logger.error('Found duplicate emails in users table:', duplicates.rows);
      throw new Error('Cannot add unique constraint: duplicate emails exist');
    }

    // Add unique constraint if no duplicates found
    await db.execute(sql`
      DO $$ 
      BEGIN 
        IF NOT EXISTS (
          SELECT 1 
          FROM pg_constraint 
          WHERE conname = 'users_email_unique'
        ) THEN
          ALTER TABLE users ADD CONSTRAINT users_email_unique UNIQUE (email);
        END IF;
      END $$;
    `);

    logger.info('Successfully added email uniqueness constraint');
  } catch (error) {
    logger.error('Error in email uniqueness migration:', error);
    throw error;
  }
}

// Execute the migration
migrateEmailUnique().catch(console.error);
