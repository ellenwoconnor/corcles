
import { db } from "./db";
import { messages, itemRequests, itemBids, items, userCommunities, communityInvites, users, wishlists } from "@shared/schema";
import { and, eq, gt, inArray, or } from "drizzle-orm";
import logger from './logger';

async function removeUsers() {
  try {
    // Find all users with id > 38
    const usersToRemove = await db
      .select()
      .from(users)
      .where(gt(users.id, 38));
    
    if (!usersToRemove.length) {
      logger.info('No users found with ID > 38');
      return;
    }
    
    const userIds = usersToRemove.map(u => u.id);
    logger.info('Starting removal of users and related records', { userIds });

    // Remove wishlists
    const deletedWishlists = await db.delete(wishlists)
      .where(inArray(wishlists.userId, userIds))
      .returning();
    
    logger.info('Removed wishlists', { count: deletedWishlists.length });

    // Remove related messages
    const deletedMessages = await db.delete(messages)
      .where(
        or(
          inArray(messages.senderId, userIds),
          inArray(messages.recipientId, userIds),
          inArray(
            messages.requestId,
            db.select({ id: itemRequests.id })
              .from(itemRequests)
              .where(
                or(
                  inArray(itemRequests.requesterId, userIds),
                  inArray(
                    itemRequests.itemId,
                    db.select({ id: items.id })
                      .from(items)
                      .where(inArray(items.userId, userIds))
                  )
                )
              )
          )
        )
      )
      .returning();
    
    logger.info('Removed messages', { count: deletedMessages.length });

    // Remove related requests
    const deletedRequests = await db.delete(itemRequests)
      .where(
        or(
          inArray(itemRequests.requesterId, userIds),
          inArray(
            itemRequests.itemId,
            db.select({ id: items.id })
              .from(items)
              .where(inArray(items.userId, userIds))
          )
        )
      )
      .returning();
    
    logger.info('Removed item requests', { count: deletedRequests.length });

    // Remove related bids
    const deletedBids = await db.delete(itemBids)
      .where(
        or(
          inArray(itemBids.bidderId, userIds),
          inArray(
            itemBids.itemId,
            db.select({ id: items.id })
              .from(items)
              .where(inArray(items.userId, userIds))
          )
        )
      )
      .returning();
    
    logger.info('Removed item bids', { count: deletedBids.length });

    // Remove items
    const deletedItems = await db.delete(items)
      .where(inArray(items.userId, userIds))
      .returning();
    
    logger.info('Removed items', { count: deletedItems.length });

    // Remove community invites
    const deletedInvites = await db.delete(communityInvites)
      .where(inArray(communityInvites.invitedBy, userIds))
      .returning();
    
    logger.info('Removed community invites', { count: deletedInvites.length });

    // Remove user community memberships
    const deletedMemberships = await db.delete(userCommunities)
      .where(inArray(userCommunities.userId, userIds))
      .returning();
    
    logger.info('Removed user community memberships', { count: deletedMemberships.length });

    // Finally remove the users
    const deletedUsers = await db.delete(users)
      .where(gt(users.id, 38))
      .returning();

    logger.info('Successfully removed users and related records', {
      users: deletedUsers,
      itemsRemoved: deletedItems.length,
      requestsRemoved: deletedRequests.length,
      bidsRemoved: deletedBids.length,
      messagesRemoved: deletedMessages.length,
      invitesRemoved: deletedInvites.length,
      membershipsRemoved: deletedMemberships.length,
      wishlistsRemoved: deletedWishlists.length
    });

  } catch (error) {
    logger.error('Error removing users:', error);
    throw error;
  }
}

// Execute the script
removeUsers().catch(error => {
  logger.error('Script execution failed:', error);
  process.exit(1);
});
