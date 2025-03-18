
import { db } from "./db";
import * as schema from "@shared/schema";
import { eq, and, isNotNull } from "drizzle-orm";
import logger from "./logger";

async function backfillPickupNotifications() {
  try {
    // Get all items with scheduled pickup times
    const items = await db
      .select()
      .from(schema.items)
      .where(
        and(
          isNotNull(schema.items.pickupStart),
          isNotNull(schema.items.pickupEnd)
        )
      );

    logger.info(`Found ${items.length} items with scheduled pickups`);

    for (const item of items) {
      // Create notification for the item owner
      await db.insert(schema.notifications).values({
        userId: item.userId,
        type: "pickup_scheduled",
        data: {
          itemId: item.id,
          itemTitle: item.title,
          pickupStart: item.pickupStart?.toISOString(),
          pickupEnd: item.pickupEnd?.toISOString()
        },
      });

      // Create notification for the recipient if it exists
      if (item.recipientId) {
        await db.insert(schema.notifications).values({
          userId: item.recipientId,
          type: "pickup_scheduled", 
          data: {
            itemId: item.id,
            itemTitle: item.title,
            pickupStart: item.pickupStart?.toISOString(),
            pickupEnd: item.pickupEnd?.toISOString()
          },
        });
      }
    }

    logger.info('Successfully backfilled pickup notifications');
  } catch (error) {
    logger.error('Error backfilling notifications:', error);
    throw error;
  }
}

// Run the migration
backfillPickupNotifications().then(() => {
  logger.info('Migration completed');
  process.exit(0);
}).catch((error) => {
  logger.error('Migration failed:', error);
  process.exit(1);
});
