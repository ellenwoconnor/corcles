
import { db } from "./db";
import { items, ITEM_STATUS } from "@shared/schema";
import { eq } from "drizzle-orm";
import logger from './logger';

async function migrateItems() {
  try {
    // Get all items
    const allItems = await db.select().from(items);
    
    for (const item of allItems) {
      const updates: any = {};
      
      // Ensure status is set correctly
      if (!item.status) {
        updates.status = ITEM_STATUS.AVAILABLE;
      }
      
      // Initialize proposedPickupWindows if null
      if (!item.proposedPickupWindows) {
        updates.proposedPickupWindows = [];
      }
      
      // If there's a pickup window but no proposedPickupWindows, create it
      if (item.pickupStart && item.pickupEnd && (!item.proposedPickupWindows || item.proposedPickupWindows.length === 0)) {
        updates.proposedPickupWindows = [{
          pickupStart: item.pickupStart.toISOString(),
          pickupEnd: item.pickupEnd.toISOString(),
          order: 0
        }];
      }
      
      // Apply updates if needed
      if (Object.keys(updates).length > 0) {
        await db.update(items)
          .set(updates)
          .where(eq(items.id, item.id));
        
        logger.info(`Migrated item ${item.id}`);
      }
    }
    
    logger.info('Migration completed successfully');
  } catch (error) {
    logger.error('Migration failed:', error);
    throw error;
  }
}

migrateItems().catch(console.error);
