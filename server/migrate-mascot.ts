
import { db } from "./db";
import { sql } from "drizzle-orm";
import logger from "./logger";

async function addMascotColumn() {
  try {
    logger.info("Starting migration to add mascot column");
    
    await db.execute(sql`
      ALTER TABLE communities 
      ADD COLUMN IF NOT EXISTS mascot TEXT DEFAULT '🏠'
    `);
    
    logger.info("Successfully added mascot column");
    
    // Update existing communities
    await db.execute(sql`
      UPDATE communities 
      SET mascot = '🏠' 
      WHERE mascot IS NULL
    `);
    
    logger.info("Updated existing communities with default mascot");
  } catch (error) {
    logger.error("Error during migration:", error);
    throw error;
  }
}

addMascotColumn()
  .then(() => {
    logger.info("Migration completed successfully");
    process.exit(0);
  })
  .catch((error) => {
    logger.error("Migration failed:", error);
    process.exit(1);
  });
