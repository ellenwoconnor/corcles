
import { db } from "./db";
import { messages, itemRequests, itemBids, items, userCommunities, communityInvites, users, wishlists } from "@shared/schema";
import { and, eq, inArray, or } from "drizzle-orm";
import logger from './logger';

async function removeUser() {
  try {
    // Find the user ID by email
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, 'eoconnor9484@gmail.com'));
    
    if (!user) {
      logger.error('User not found with email eoconnor9484@gmail.com');
      return;
    }
    
    const userId = user.id;
    logger.info('Starting removal of user eoconnor9484 and related records', { userId });

    // First remove wishlists
    const deletedWishlists = await db.delete(wishlists)
      .where(eq(wishlists.userId, userId))
      .returning();
    
    logger.info('Removed wishlists', { count: deletedWishlists.length });

    // Remove related messages
    const deletedMessages = await db.delete(messages)
      .where(
        or(
          eq(messages.senderId, userId),
          eq(messages.recipientId, userId),
          inArray(
            messages.requestId,
            db.select({ id: itemRequests.id })
              .from(itemRequests)
              .where(
                or(
                  eq(itemRequests.requesterId, userId),
                  inArray(
                    itemRequests.itemId,
                    db.select({ id: items.id })
                      .from(items)
                      .where(eq(items.userId, userId))
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
          eq(itemRequests.requesterId, userId),
          inArray(
            itemRequests.itemId,
            db.select({ id: items.id })
              .from(items)
              .where(eq(items.userId, userId))
          )
        )
      )
      .returning();
    
    logger.info('Removed item requests', { count: deletedRequests.length });

    // Remove related bids
    const deletedBids = await db.delete(itemBids)
      .where(
        or(
          eq(itemBids.bidderId, userId),
          inArray(
            itemBids.itemId,
            db.select({ id: items.id })
              .from(items)
              .where(eq(items.userId, userId))
          )
        )
      )
      .returning();
    
    logger.info('Removed item bids', { count: deletedBids.length });

    // Remove items
    const deletedItems = await db.delete(items)
      .where(eq(items.userId, userId))
      .returning();
    
    logger.info('Removed items', { count: deletedItems.length });

    // Remove community invites
    const deletedInvites = await db.delete(communityInvites)
      .where(
        or(
          eq(communityInvites.invitedBy, userId),
          eq(communityInvites.invitedEmail, 'eoconnor9484@gmail.com')
        )
      )
      .returning();
    
    logger.info('Removed community invites', { count: deletedInvites.length });

    // Remove user community memberships
    const deletedMemberships = await db.delete(userCommunities)
      .where(eq(userCommunities.userId, userId))
      .returning();
    
    logger.info('Removed user community memberships', { count: deletedMemberships.length });

    // Finally remove the user
    const [deletedUser] = await db.delete(users)
      .where(eq(users.id, userId))
      .returning();

    logger.info('Successfully removed user and related records', {
      user: deletedUser,
      itemsRemoved: deletedItems.length,
      requestsRemoved: deletedRequests.length,
      bidsRemoved: deletedBids.length,
      messagesRemoved: deletedMessages.length,
      invitesRemoved: deletedInvites.length,
      membershipsRemoved: deletedMemberships.length,
      wishlistsRemoved: deletedWishlists.length
    });

  } catch (error) {
    logger.error('Error removing user:', error);
    throw error;
  }
}

// Execute the migration
removeUser().catch(error => {
  logger.error('Script execution failed:', error);
  process.exit(1);
});
