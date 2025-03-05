
import { db } from "./db";
import { sql } from "drizzle-orm";
import logger from "./logger";

async function addPickupLocationColumn() {
  try {
    logger.info("Starting migration to add pickup_location column to items table");
    
    // Check if the column already exists
    const checkColumnQuery = sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'items' AND column_name = 'pickup_location'
    `;
    
    const checkResult = await db.execute(checkColumnQuery);
    
    if (checkResult.rows.length === 0) {
      logger.info("pickup_location column does not exist, adding it now");
      
      // Add the column
      await db.execute(sql`
        ALTER TABLE items 
        ADD COLUMN pickup_location TEXT
      `);
      
      logger.info("pickup_location column added successfully");
      
      // Update existing items to use their owner's address as the pickup location
      await db.execute(sql`
        UPDATE items
        SET pickup_location = (
          SELECT address FROM users WHERE users.id = items.user_id
        )
        WHERE pickup_location IS NULL
      `);
      
      logger.info("Existing items updated with owner's address as pickup location");
    } else {
      logger.info("pickup_location column already exists, skipping migration");
    }
    
    logger.info("Migration completed successfully");
  } catch (error) {
    logger.error("Error during migration:", error);
    throw error;
  }
}

// Run the migration
addPickupLocationColumn()
  .then(() => {
    logger.info("Migration completed successfully");
    process.exit(0);
  })
  .catch((error) => {
    logger.error("Migration failed:", error);
    process.exit(1);
  });
