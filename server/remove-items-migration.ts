
import { db } from "./db";
import { messages, itemRequests, itemBids, items } from "@shared/schema";
import { and, lte, inArray } from "drizzle-orm";
import logger from './logger';

async function removeItems() {
  try {
    // Get all item IDs from 1-15
    const itemIds = Array.from({length: 15}, (_, i) => i + 1);
    
    logger.info('Starting removal of items 1-15 and related records');

    // First remove related messages
    const deletedMessages = await db.delete(messages)
      .where(
        inArray(
          messages.requestId,
          db.select({ id: itemRequests.id })
            .from(itemRequests)
            .where(inArray(itemRequests.itemId, itemIds))
        )
      );

    // Remove related requests
    const deletedRequests = await db.delete(itemRequests)
      .where(inArray(itemRequests.itemId, itemIds));

    // Remove related bids
    const deletedBids = await db.delete(itemBids)
      .where(inArray(itemBids.itemId, itemIds));

    // Finally remove the items
    const deletedItems = await db.delete(items)
      .where(inArray(items.id, itemIds));

    logger.info('Successfully removed items and related records', {
      itemsRemoved: deletedItems.length,
      requestsRemoved: deletedRequests.length,
      bidsRemoved: deletedBids.length,
      messagesRemoved: deletedMessages.length
    });

  } catch (error) {
    logger.error('Error removing items:', error);
    throw error;
  }
}

// Execute the migration
removeItems().catch(console.error);
