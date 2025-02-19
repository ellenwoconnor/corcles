
import { db } from "./db";
import { messages, itemRequests, itemBids, items } from "@shared/schema";
import { and, inArray } from "drizzle-orm";
import logger from './logger';

async function removeItem() {
  try {
    const itemId = 17;
    
    logger.info('Starting removal of item 17 and related records');

    // First remove related messages
    const deletedMessages = await db.delete(messages)
      .where(
        inArray(
          messages.requestId,
          db.select({ id: itemRequests.id })
            .from(itemRequests)
            .where(inArray(itemRequests.itemId, [itemId]))
        )
      );

    // Remove related requests
    const deletedRequests = await db.delete(itemRequests)
      .where(inArray(itemRequests.itemId, [itemId]));

    // Remove related bids
    const deletedBids = await db.delete(itemBids)
      .where(inArray(itemBids.itemId, [itemId]));

    // Finally remove the item
    const deletedItems = await db.delete(items)
      .where(inArray(items.id, [itemId]));

    logger.info('Successfully removed item and related records', {
      itemsRemoved: deletedItems.length,
      requestsRemoved: deletedRequests.length,
      bidsRemoved: deletedBids.length,
      messagesRemoved: deletedMessages.length
    });

  } catch (error) {
    logger.error('Error removing item:', error);
    throw error;
  }
}

// Execute the migration
removeItem().catch(console.error);
