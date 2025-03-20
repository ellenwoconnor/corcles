
import { db } from "./db";
import { sql } from "drizzle-orm";
import logger from './logger';

async function makeCreatedByNullable() {
  try {
    logger.info('Starting migration to make createdBy nullable in communities table');
    
    // Make the column nullable
    await db.execute(sql`
      ALTER TABLE communities 
      ALTER COLUMN created_by DROP NOT NULL;
    `);
    
    // Update existing default communities to have null creator
    await db.execute(sql`
      UPDATE communities 
      SET created_by = NULL 
      WHERE is_custom = false;
    `);
    
    logger.info('Successfully made createdBy nullable and updated default communities');
  } catch (error) {
    logger.error('Error during migration:', error);
    throw error;
  }
}

// Execute the migration
makeCreatedByNullable()
  .then(() => {
    logger.info("Migration completed successfully");
    process.exit(0);
  })
  .catch((error) => {
    logger.error("Migration failed:", error);
    process.exit(1);
  });
