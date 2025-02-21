
import { db } from "./db";
import { messages, itemRequests, itemBids, items, userCommunities, communityInvites, users } from "@shared/schema";
import { and, inArray } from "drizzle-orm";
import logger from './logger';

async function removeUsers() {
  try {
    // Get user IDs from 12-19
    const userIds = Array.from({length: 8}, (_, i) => i + 12);
    
    logger.info('Starting removal of users 12-19 and related records');

    // First remove related messages
    const deletedMessages = await db.delete(messages)
      .where(
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
      );

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
      );

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
      );

    // Remove items
    const deletedItems = await db.delete(items)
      .where(inArray(items.userId, userIds));

    // Remove community invites
    const deletedInvites = await db.delete(communityInvites)
      .where(inArray(communityInvites.invitedBy, userIds));

    // Remove user community memberships
    const deletedMemberships = await db.delete(userCommunities)
      .where(inArray(userCommunities.userId, userIds));

    // Finally remove the users
    const deletedUsers = await db.delete(users)
      .where(inArray(users.id, userIds));

    logger.info('Successfully removed users and related records', {
      usersRemoved: deletedUsers.length,
      itemsRemoved: deletedItems.length,
      requestsRemoved: deletedRequests.length,
      bidsRemoved: deletedBids.length,
      messagesRemoved: deletedMessages.length,
      invitesRemoved: deletedInvites.length,
      membershipsRemoved: deletedMemberships.length
    });

  } catch (error) {
    logger.error('Error removing users:', error);
    throw error;
  }
}

// Execute the migration
removeUsers().catch(console.error);
