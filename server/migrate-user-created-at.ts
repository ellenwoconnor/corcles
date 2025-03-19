
import { db } from "./db";
import { sql } from "drizzle-orm";
import logger from "./logger";

async function addCreatedAtColumn() {
  try {
    logger.info("Starting migration to add createdAt column to users table");
    
    await db.execute(sql`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS created_at TIMESTAMP NOT NULL DEFAULT NOW()
    `);
    
    logger.info("Successfully added createdAt column to users table");
  } catch (error) {
    logger.error("Error during migration:", error);
    throw error;
  }
}

addCreatedAtColumn()
  .then(() => {
    logger.info("Migration completed successfully");
    process.exit(0);
  })
  .catch((error) => {
    logger.error("Migration failed:", error);
    process.exit(1);
  });
