
import { db } from "./db";
import * as schema from "@shared/schema";
import { eq, and, isNotNull, sql } from "drizzle-orm";
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
      // Check if notification already exists for owner
      const existingOwnerNotif = await db
        .select()
        .from(schema.notifications)
        .where(
          and(
            eq(schema.notifications.userId, item.userId),
            eq(schema.notifications.type, "pickup_scheduled"),
            sql`${schema.notifications.data}->>'itemId' = ${item.id.toString()}`
          )
        )
        .limit(1);

      if (existingOwnerNotif.length === 0) {
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
      }

      // Create notification for recipient if exists and notification doesn't already exist
      if (item.recipientId) {
        const existingRecipientNotif = await db
          .select()
          .from(schema.notifications)
          .where(
            and(
              eq(schema.notifications.userId, item.recipientId),
              eq(schema.notifications.type, "pickup_scheduled"),
              sql`${schema.notifications.data}->>'itemId' = ${item.id.toString()}`
            )
          )
          .limit(1);

        if (existingRecipientNotif.length === 0) {
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
