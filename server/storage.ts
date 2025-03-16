import {
  users,
  items,
  itemRequests,
  itemBids,
  messages,
  communities,
  userCommunities,
  communityInvites,
  type User,
  type InsertUser,
  type Item,
  type InsertItem,
  type ItemRequest,
  type InsertItemRequest,
  type ItemBid,
  type InsertItemBid,
  type Message,
  type InsertMessage,
  type PickupWindow,
  type CancellationInfo,
  type Community,
  type InsertCommunity,
  type UserCommunity,
  type CommunityInvite,
  type InsertCommunityInvite,
  ITEM_STATUS,
  REQUEST_STATUS,
  wishlists,
  type Wishlist,
  type InsertWishlist,
} from "@shared/schema";
import { db, pool } from "./db";
import { eq, and, desc, sql, ilike, or, notInArray, inArray } from "drizzle-orm";
import session from "express-session";
import connectPg from "connect-pg-simple";
import logger from './logger';

const PostgresSessionStore = connectPg(session);

export interface IStorage {
  // Existing methods
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByAddress(address: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  getItems(
    communities: number[],
    userId?: number,
    search?: string,
    userItemsOnly?: boolean,
    freeOnly?: boolean,
    excludeItemsWithRecipients?: boolean
  ): Promise<(Item & { userHasFavorited: boolean })[]>;
  getItem(
    id: number,
    userId?: number,
  ): Promise<(Item & { userHasFavorited: boolean }) | undefined>;
  createItem(item: InsertItem & { userId: number; communityId: number; pickupLocation?: string | null }): Promise<Item>;
  createItemRequest(request: InsertItemRequest): Promise<ItemRequest>;
  getItemRequests(itemId: number): Promise<ItemRequest[]>;
  getUserRequests(userId: number): Promise<(ItemRequest & { item: Item })[]>;
  updateItemRequestStatus(id: number, status: string): Promise<ItemRequest>;
  createItemBid(bid: InsertItemBid): Promise<ItemBid>;
  getItemBids(itemId: number): Promise<ItemBid[]>;
  getUserBids(userId: number): Promise<(ItemBid & { item: Item })[]>;
  updateItemBidStatus(id: number, status: string): Promise<ItemBid>;
  updateItemStatusAfterPickupSchedule(itemId: number): Promise<void>;
  updateItem(id: number, item: Partial<InsertItem>): Promise<Item>;
  sessionStore: session.Store;

  // Message-related methods
  canUsersMessage(senderId: number, recipientId: number): Promise<boolean>;
  sendMessage(message: InsertMessage): Promise<Message>;
  getConversation(userId1: number, userId2: number, requestId: number): Promise<Message[]>;
  markMessagesAsRead(recipientId: number, senderId: number, requestId: number): Promise<void>;
  getUnreadMessageCount(userId: number): Promise<number>;

  // Add new method for canceling requests
  cancelPickupRequest(
    requestId: number,
    itemId: number,
    canceledBy: number,
    reason?: string
  ): Promise<ItemRequest>;

  // Add proper types for community methods
  createCommunity(community: InsertCommunity & { createdBy: number }): Promise<Community>;
  getCommunity(id: number): Promise<Community | undefined>;
  getUserCommunities(userId: number): Promise<(Community & { role: string; memberCount: number })[]>;
  addUserToCommunity(userId: number, communityId: number, role?: string): Promise<UserCommunity>;
  createCommunityInvite(invite: InsertCommunityInvite): Promise<CommunityInvite>;
  getCommunityInvites(communityId: number): Promise<CommunityInvite[]>;
  acceptCommunityInvite(inviteId: number): Promise<CommunityInvite>;
  rejectCommunityInvite(inviteId: number): Promise<CommunityInvite>;
  isUserInCommunity(userId: number, communityId: number): Promise<boolean>;
  getUserRole(userId: number, communityId: number): Promise<string | undefined>;

  // Wishlist methods
  createWishlist(wishlist: InsertWishlist): Promise<Wishlist>;
  getWishlist(id: number): Promise<Wishlist | undefined>;
  getUserWishlists(userId: number): Promise<Wishlist[]>;
  getCommunityWishlists(communityId: number): Promise<Wishlist[]>;
  updateWishlist(id: number, userId: number, updates: Partial<InsertWishlist>): Promise<Wishlist | undefined>;
  getWishlistFulfillmentItems(wishlistId: number): Promise<Item[]>;
}

export class DatabaseStorage implements IStorage {
  public sessionStore: session.Store;

  constructor() {
    this.sessionStore = new PostgresSessionStore({ pool, createTableIfMissing: true });
  }

  async getUser(id: number): Promise<User | undefined> {
    try {
      const [user] = await db.select().from(users).where(eq(users.id, id));
      logger.debug('Retrieved user:', { userId: id, user: user});
      return user;
    } catch (error) {
      logger.error('Error retrieving user:', { error, userId: id });
      throw error;
    }
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    try {
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.username, username));
      logger.debug('Retrieved user by username:', { username, user: user });
      return user;
    } catch (error) {
      logger.error('Error retrieving user by username:', { error, username });
      throw error;
    }
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    try {
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.email, email));
      logger.debug('Retrieved user by email:', { email, user: user });
      return user;
    } catch (error) {
      logger.error('Error retrieving user by email:', { error, email });
      throw error;
    }
  }

  async getUserByAddress(address: string): Promise<User | undefined> {
    try {
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.address, address));
      logger.debug('Retrieved user by address:', { address, user: user });
      return user;
    } catch (error) {
      logger.error('Error retrieving user by address:', { error, address });
      throw error;
    }
  }

  async getCommunityByZipCode(zipCode: string): Promise<Community | undefined> {
    try {
      const [community] = await db
        .select()
        .from(communities)
        .where(eq(communities.name, `Community ${zipCode}`))
        .limit(1);

      logger.debug('Retrieved community by zip code:', { 
        zipCode,
        found: !!community,
        communityId: community?.id
      });

      return community;
    } catch (error) {
      logger.error('Error retrieving community by zip code:', { error, zipCode });
      throw error;
    }
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    try {
      // Start a transaction
      return await db.transaction(async (tx) => {
        // Create the user
        const [user] = await tx
          .insert(users)
          .values(insertUser)
          .returning();

        logger.debug('Created new user:', { userId: user.id, username: user.username });

        // Get or create their home community
        const communityName = `Community ${insertUser.zipCode}`;
        let [community] = await tx
          .select()
          .from(communities)
          .where(eq(communities.name, communityName));

        if (!community) {
          // Create new community if it doesn't exist
          [community] = await tx
            .insert(communities)
            .values({
              name: communityName,
              description: `Local community for ${insertUser.zipCode}`,
              createdBy: user.id,
              isCustom: false,
            })
            .returning();

          logger.debug('Created new community for zip code:', {
            zipCode: insertUser.zipCode,
            communityId: community.id
          });
        }

        // Add user to their home community
        await tx
          .insert(userCommunities)
          .values({
            userId: user.id,
            communityId: community.id,
            role: community.createdBy === user.id ? 'admin' : 'member'
          });

        logger.debug('Added user to home community:', {
          userId: user.id,
          communityId: community.id,
          role: community.createdBy === user.id ? 'admin' : 'member'
        });

        // Find and process any pending community invites for this user's email
        const pendingInvites = await tx
          .select({
            invite: communityInvites,
            community: communities,
          })
          .from(communityInvites)
          .innerJoin(
            communities,
            eq(communityInvites.communityId, communities.id)
          )
          .where(
            and(
              eq(communityInvites.invitedEmail, insertUser.email),
              eq(communityInvites.status, 'pending')
            )
          );

        // Add user to each invited community and update invite status
        for (const { invite, community } of pendingInvites) {
          await tx
            .insert(userCommunities)
            .values({
              userId: user.id,
              communityId: invite.communityId,
              role: 'member'
            });

          await tx
            .update(communityInvites)
            .set({
              status: 'accepted',
              acceptedAt: sql`CURRENT_TIMESTAMP`
            })
            .where(eq(communityInvites.id, invite.id));

          logger.debug('Auto-enrolled user in invited community:', {
            userId: user.id,
            email: insertUser.email,
            communityId: invite.communityId,
            communityName: community.name
          });
        }

        return user;
      });
    } catch (error) {
      logger.error('Error creating user:', { error, username: insertUser.username });
      throw error;
    }
  }

  async getItems(
    communities: number[],
    userId?: number,
    search?: string,
    userItemsOnly?: boolean,
    freeOnly?: boolean,
    excludeItemsWithRecipients?: boolean
  ): Promise<(Item & { userHasFavorited: boolean })[]> {
    try {
      logger.debug('Fetching items with params:', {
        communities,
        userId,
        search,
        userItemsOnly,
        freeOnly,
        excludeItemsWithRecipients
      });

      const query = db
        .select({
          ...items,
          userDisplayName: sql<string>`(
            SELECT username FROM ${users} WHERE ${users.id} = ${items.userId}
          )`,
          userHasFavorited: sql<boolean>`false`,
        })
        .from(items);

      const conditions = [];

      // Don't show completed or delisted items unless viewing own items
      if (!userItemsOnly) {
        conditions.push(notInArray(items.status, ['completed', 'delisted']));
      }

      // Exclude items with recipients if requested
      if (excludeItemsWithRecipients) {
        conditions.push(sql`${items.recipientId} IS NULL`);
      }

      // Filter by user's items if requested
      if (userItemsOnly && userId) {
        conditions.push(eq(items.userId, userId));
      }
      // Filter by communities
      else if (communities && communities.length > 0) {
        logger.debug('Filtering by communities:', { communities });
        conditions.push(inArray(items.communityId, communities));
      }

      // Add search condition if provided
      if (search) {
        const searchTerm = `%${search}%`;
        conditions.push(
          or(
            ilike(items.title, searchTerm),
            ilike(items.description || '', searchTerm)
          )
        );
      }

      // Apply freeOnly filter
      if (freeOnly) {
        logger.debug("Applying freeOnly filter");
        conditions.push(eq(items.isGift, true));
      }


      const results = await query
        .where(and(...conditions))
        .orderBy(desc(items.createdAt));

      logger.debug('Raw items query results:', {
        count: results.length,
        communities,
        results
      });

      return results.map(item => ({
        ...item,
        proposedPickupWindows: item.proposedPickupWindows || [],
        pickupStart: item.pickupStart ? item.pickupStart.toISOString() : null,
        pickupEnd: item.pickupEnd ? item.pickupEnd.toISOString() : null,
        createdAt: item.createdAt.toISOString(),
        userDisplayName: item.userDisplayName || "Anonymous",
        userHasFavorited: Boolean(item.userHasFavorited)
      }));

    } catch (error) {
      logger.error('Error retrieving items:', { error, communities, search });
      throw error;
    }
  }

  async getItem(
    id: number,
    userId?: number,
  ): Promise<(Item & { userHasFavorited: boolean }) | undefined> {
    try {
      const [item] = await db
        .select({
          ...items,
          userDisplayName: sql<string>`(
            SELECT username FROM ${users} WHERE ${users.id} = ${items.userId}
          )`,
          userHasFavorited: sql<boolean>`false`,
        })
        .from(items)
        .where(eq(items.id, id));

      if (!item) return undefined;

      return {
        ...item,
        proposedPickupWindows: item.proposedPickupWindows || [],
        pickupStart: item.pickupStart ? item.pickupStart.toISOString() : null,
        pickupEnd: item.pickupEnd ? item.pickupEnd.toISOString() : null,
        createdAt: item.createdAt.toISOString(),
        userDisplayName: item.userDisplayName || "Anonymous",
        userHasFavorited: Boolean(item.userHasFavorited)
      };

    } catch (error) {
      logger.error('Error retrieving item:', { error, id });
      throw error;
    }
  }

  async createItem(item: InsertItem & { userId: number; communityId: number; pickupLocation?: string | null }): Promise<Item> {
    try {
      // Validate required fields
      if (!item.userId) {
        logger.error('Missing required userId when creating item:', { item });
        throw new Error('User ID is required');
      }

      if (!item.communityId) {
        logger.error('Missing required communityId when creating item:', { item });
        throw new Error('Community ID is required');
      }

      // If no pickup location provided, fetch the user's address
      let pickupLocation = item.pickupLocation;
      if (!pickupLocation) {
        const user = await this.getUser(item.userId);
        if (user) {
          pickupLocation = user.address;
        }
      }

      const [newItem] = await db.insert(items).values({
        ...item,
        status: 'available',
        createdAt: new Date(),
        pickupLocation
      }).returning();

      logger.debug('Created new item:', {
        itemId: newItem.id,
        userId: newItem.userId,
        communityId: newItem.communityId,
        title: newItem.title,
        pickupLocation: newItem.pickupLocation
      });

      return newItem;
    } catch (error) {
      logger.error('Error creating item:', { error, item });
      throw error;
    }
  }

  async createItemRequest(request: InsertItemRequest): Promise<ItemRequest> {
    try {
      const [newRequest] = await db.insert(itemRequests).values(request).returning();
      logger.debug('Created new item request:', { requestId: newRequest.id, request: newRequest });
      return newRequest;
    } catch (error) {
      logger.error('Error creating item request:', { error, request });
      throw error;
    }
  }

  async getItemRequests(itemId: number): Promise<ItemRequest[]> {
    try {
      const requests = await db
        .select()
        .from(itemRequests)
        .where(eq(itemRequests.itemId, itemId))
        .orderBy(desc(itemRequests.createdAt));

      logger.debug('Retrieved item requests:', {
        itemId,
        count: requests.length,
        requests
      });

      return requests;
    } catch (error) {
      logger.error('Error getting item requests:', { error, itemId });
      throw error;
    }
  }

  async getUserRequests(userId: number): Promise<(ItemRequest & { item: Item })[]> {
    try {
      const requests = await db
        .select({
          request: itemRequests,
          item: items,
        })
        .from(itemRequests)
        .innerJoin(items, eq(itemRequests.itemId, items.id))
        .where(eq(itemRequests.requesterId, userId))
        .orderBy(desc(itemRequests.createdAt));

      logger.debug('Retrieved user requests:', { userId, count: requests.length, requests });
      return requests.map(({ request, item }) => ({
        ...request,
        item,
      }));
    } catch (error) {
      logger.error('Error getting user requests:', { error, userId });
      throw error;
    }
  }

  async updateItemRequestStatus(id: number, status: string): Promise<ItemRequest> {
    try {
      const [updatedRequest] = await db
        .update(itemRequests)
        .set({ status })
        .where(eq(itemRequests.id, id))
        .returning();
      logger.debug('Updated item request status:', { requestId: id, status, updatedRequest });
      return updatedRequest;
    } catch (error) {
      logger.error('Error updating item request status:', { error, id, status });
      throw error;
    }
  }

  async createItemBid(bid: InsertItemBid): Promise<ItemBid> {
    try {
      const [newBid] = await db.insert(itemBids).values(bid).returning();
      logger.debug('Created new item bid:', { bidId: newBid.id, bid: newBid });
      return newBid;
    } catch (error) {
      logger.error('Error creating item bid:', { error, bid });
      throw error;
    }
  }

  async getItemBids(itemId: number): Promise<ItemBid[]> {
    try {
      const bids = await db
        .select()
        .from(itemBids)
        .where(eq(itemBids.itemId, itemId))
        .orderBy(desc(itemBids.amount));
      logger.debug('Retrieved item bids:', { itemId, count: bids.length, bids });
      return bids;
    } catch (error) {
      logger.error('Error getting item bids:', { error, itemId });
      throw error;
    }
  }

  async getUserBids(userId: number): Promise<(ItemBid & { item: Item })[]> {
    try {
      const bids = await db
        .select({
          bid: itemBids,
          item: items,
        })
        .from(itemBids)
        .innerJoin(items, eq(itemBids.itemId, items.id))
        .where(eq(itemBids.bidderId, userId))
        .orderBy(desc(itemBids.createdAt));

      logger.debug('Retrieved user bids:', { userId, count: bids.length, bids });
      return bids.map(({ bid, item }) => ({
        ...bid,
        item,
      }));
    } catch (error) {
      logger.error('Error getting user bids:', { error, userId });
      throw error;
    }
  }

  async updateItemBidStatus(id: number, status: string): Promise<ItemBid> {
    try {
      const [updatedBid] = await db
        .update(itemBids)
        .set({ status })
        .where(eq(itemBids.id, id))
        .returning();
      logger.debug('Updated item bid status:', { bidId: id, status, updatedBid });
      return updatedBid;
    } catch (error) {
      logger.error('Error updating item bid status:', { error, id, status });
      throw error;
    }
  }

  async updateItemStatusAfterPickupSchedule(itemId: number): Promise<void> {
    try {
      await db
        .update(items)
        .set({ status: 'pending_pickup' })
        .where(eq(items.id, itemId));

      await db
        .update(itemRequests)
        .set({ status: 'awaiting_pickup_confirmation' })
        .where(
          and(
            eq(itemRequests.itemId, itemId),
            eq(itemRequests.status, 'ready_for_drawing')
          )
        );

      logger.debug('Updated item and request statuses after pickup schedule:', { itemId });
    } catch (error) {
      logger.error('Error updating item status after pickup schedule:', { error, itemId });
      throw error;
    }
  }

  async updateItem(id: number, item: Partial<InsertItem>): Promise<Item> {
    try {
      const [updatedItem] = await db
        .update(items)
        .set(item)
        .where(eq(items.id, id))
        .returning();

      logger.debug('Updated item:', { itemId: id, updates: item, updatedItem });
      return updatedItem;
    } catch (error) {
      logger.error('Error updating item:', { error, id, item });
      throw error;
    }
  }

  async sendMessage(message: InsertMessage): Promise<Message> {
    try {
      const [newMessage] = await db.insert(messages).values(message).returning();
      logger.debug('Created new message:', {
        messageId: newMessage.id,
        senderId: newMessage.senderId,
        recipientId: newMessage.recipientId,
        requestId: newMessage.requestId
      });
      return newMessage;
    } catch (error) {
      logger.error('Error sending message:', { error, message });
      throw error;
    }
  }

  async getConversation(userId1: number, userId2: number, requestId: number): Promise<Message[]> {
    try {
      const conversation = await db
        .select()
        .from(messages)
        .where(
          and(
            eq(messages.requestId, requestId),
            or(
              and(
                eq(messages.senderId, userId1),
                eq(messages.recipientId, userId2)
              ),
              and(
                eq(messages.senderId, userId2),
                eq(messages.recipientId, userId1)
              )
            )
          )
        )
        .orderBy(messages.createdAt);

      logger.debug('Retrieved conversation:', {
        userId1,
        userId2,
        requestId,
        messageCount: conversation.length
      });

      return conversation;
    } catch (error) {
      logger.error('Error getting conversation:', { error, userId1, userId2, requestId });
      throw error;
    }
  }

  async markMessagesAsRead(recipientId: number, senderId: number, requestId: number): Promise<void> {
    try {
      await db
        .update(messages)
        .set({ readAt: sql`CURRENT_TIMESTAMP` })
        .where(
          and(
            eq(messages.recipientId, recipientId),
            eq(messages.senderId, senderId),
            eq(messages.requestId, requestId),
            sql`${messages.readAt} IS NULL`
          )
        );

      logger.debug('Marked messages as read:', { recipientId, senderId, requestId });
    } catch (error) {
      logger.error('Error marking messages as read:', { error, recipientId, senderId, requestId });
      throw error;
    }
  }

  async getUnreadMessageCount(userId: number): Promise<number> {
    try {
      const [result] = await db
        .select({ count: sql<number>`count(*)` })
        .from(messages)
        .where(
          and(
            eq(messages.recipientId, userId),
            sql`${messages.readAt} IS NULL`
          )
        );

      return Number(result.count) || 0;
    } catch (error) {
      logger.error('Error getting unread message count:', { error, userId });
      throw error;
    }
  }

  async cancelPickupRequest(
    requestId: number,
    itemId: number,
    canceledBy: number
  ): Promise<ItemRequest> {
    try {
      const cancellationInfo: CancellationInfo = {
        canceledBy,
        canceledAt: new Date().toISOString()
      };

      logger.debug('Attempting to cancel request:', {
        requestId,
        itemId
      });

      const [updatedRequest] = await db
        .update(itemRequests)
        .set({
          status: REQUEST_STATUS.CANCELED,
          cancellationInfo
        })
        .where(eq(itemRequests.id, requestId))
        .returning();

      if (!updatedRequest) {
        logger.error('Failed to update request:', { requestId });
        throw new Error('Failed to update request');
      }

      logger.debug('Updated request with cancellation:', {
        requestId,
        status: updatedRequest.status,
        cancellationInfo: updatedRequest.cancellationInfo
      });

      const [updatedItem] = await db
        .update(items)
        .set({
          status: ITEM_STATUS.AVAILABLE,
          recipientId: null,
          pickupStart: null,
          pickupEnd: null,
          proposedPickupWindows: null
        })
        .where(eq(items.id, itemId))
        .returning();

      if (!updatedItem) {
        logger.error('Failed to update item:', { itemId });
        throw new Error('Failed to update item');
      }

      logger.debug('Successfully canceled pickup request:', {
        requestId,
        itemId,
        canceledBy,
        updatedRequestStatus: updatedRequest.status,
        updatedItemStatus: updatedItem.status,
        cancellationInfo: updatedRequest.cancellationInfo
      });

      return {
        ...updatedRequest,
        cancellationInfo
      } as ItemRequest;
    } catch (error) {
      logger.error('Error canceling pickup request:', {
        error,
        requestId,
        itemId,
        canceledBy
      });
      throw error;
    }
  }
  async canUsersMessage(senderId: number, recipientId: number): Promise<boolean> {
    try {
      const requests = await db
        .select()
        .from(itemRequests)
        .where(
          or(
            and(
              eq(itemRequests.requesterId, senderId),
              eq(itemRequests.userId, recipientId)
            ),
            and(
              eq(itemRequests.requesterId, recipientId),
              eq(itemRequests.userId, senderId)
            )
          )
        );

      return requests.length > 0;
    } catch (error) {
      logger.error('Error checking if users can message:', { error, senderId, recipientId });
      throw error;
    }
  }

  async createCommunity(community: InsertCommunity & { createdBy: number }): Promise<Community> {
    try {
      const [newCommunity] = await db.insert(communities).values(community).returning();

      // Add the creator as an admin member
      await db.insert(userCommunities).values({
        userId: community.createdBy,
        communityId: newCommunity.id,
        role: 'admin'
      });

      logger.debug('Created new community:', { communityId: newCommunity.id, community: newCommunity });
      return newCommunity;
    } catch (error) {
      logger.error('Error creating community:', { error, community });
      throw error;
    }
  }

  async getCommunity(id: number): Promise<Community | undefined> {
    try {
      const [community] = await db.select().from(communities).where(eq(communities.id, id));
      logger.debug('Retrieved community:', { communityId: id, community });
      return community;
    } catch (error) {
      logger.error('Error retrieving community:', { error, communityId: id });
      throw error;
    }
  }

  async getUserCommunities(userId: number): Promise<(Community & { role: string; memberCount: number })[]> {
    try {
      const userComms = await db
        .select({
          id: communities.id,
          name: communities.name,
          description: communities.description,
          mascot: communities.mascot,
          createdBy: communities.createdBy,
          createdAt: communities.createdAt,
          isCustom: communities.isCustom,
          role: userCommunities.role,
          memberCount: sql<number>`(
            SELECT COUNT(DISTINCT uc2.user_id) 
            FROM user_communities uc2 
            WHERE uc2.community_id = ${communities.id}
          )`.as('memberCount')
        })
        .from(userCommunities)
        .innerJoin(
          communities,
          eq(userCommunities.communityId, communities.id)
        )
        .where(eq(userCommunities.userId, userId));

      logger.debug('Retrieved user communities:', {
        userId,
        count: userComms.length,
        communities: userComms.map(uc => ({
          id: uc.id,
          name: uc.name,
          role: uc.role,
          memberCount: Number(uc.memberCount)
        }))
      });

      return userComms.map(uc => ({
        ...uc,
        memberCount: Number(uc.memberCount)
      }));
    } catch (error) {
      logger.error('Error getting user communities:', { error, userId });
      throw error;
    }
  }

  async addUserToCommunity(
    userId: number,
    communityId: number,
    role: string = 'member'
  ): Promise<UserCommunity> {
    try {
      const [userCommunity] = await db
        .insert(userCommunities)
        .values({ userId, communityId, role })
        .returning();

      logger.debug('Added user to community:', {
        userId,
        communityId,
        role,
        userCommunity
      });

      return userCommunity;
    } catch (error) {
      logger.error('Error adding user to community:', {
        error,
        userId,
        communityId,
        role
      });
      throw error;
    }
  }

  async createCommunityInvite(invite: InsertCommunityInvite): Promise<CommunityInvite> {
    try {
      const [newInvite] = await db
        .insert(communityInvites)
        .values({
          ...invite,
          status: 'pending',
          createdAt: new Date()
        })
        .returning();

      logger.debug('Created community invite:', {
        inviteId: newInvite.id,
        communityId: newInvite.communityId,
        invitedEmail: newInvite.invitedEmail
      });

      return newInvite;
    } catch (error) {
      logger.error('Error creating community invite:', { error, invite });
      throw error;
    }
  }

  async getCommunityInvites(communityId: number): Promise<CommunityInvite[]> {
    try {
      const invites = await db
        .select()
        .from(communityInvites)
        .where(eq(communityInvites.communityId, communityId));

      logger.debug('Retrieved community invites:', {
        communityId,
        count: invites.length
      });

      return invites;
    } catch (error) {
      logger.error('Error getting community invites:', { error, communityId });
      throw error;
    }
  }

  async acceptCommunityInvite(inviteId: number): Promise<CommunityInvite> {
    try {
      const [updatedInvite] = await db
        .update(communityInvites)
        .set({
          status: 'accepted',
          acceptedAt: sql`CURRENT_TIMESTAMP`
        })
        .where(eq(communityInvites.id, inviteId))
        .returning();

      logger.debug('Accepted community invite:', { inviteId, updatedInvite });
      return updatedInvite;
    } catch (error) {
      logger.error('Error accepting community invite:', { error, inviteId });
      throw error;
    }
  }

  async rejectCommunityInvite(inviteId: number): Promise<CommunityInvite> {
    try {
      const [updatedInvite] = await db
        .update(communityInvites)
        .set({ status: 'rejected' })
        .where(eq(communityInvites.id, inviteId))
        .returning();

      logger.debug('Rejected community invite:', { inviteId, updatedInvite });
      return updatedInvite;
    } catch (error) {
      logger.error('Error rejecting community invite:', { error, inviteId });
      throw error;
    }
  }

  async isUserInCommunity(userId: number, communityId: number): Promise<boolean> {
    try {
      const [membership] = await db
        .select()
        .from(userCommunities)
        .where(
          and(
            eq(userCommunities.userId, userId),
            eq(userCommunities.communityId, communityId)
          )
        );

      return !!membership;
    } catch (error) {
      logger.error('Error checking user community membership:', {
        error,
        userId,
        communityId
      });
      throw error;
    }
  }

  async getUserRole(userId: number, communityId: number): Promise<string | undefined> {
    try {
      const [membership] = await db
        .select        .from(userCommunities)
        .where(
          and(
            eq(userCommunities.userId, userId),
            eq(userCommunities.communityId, communityId)
          )
        );

      return membership?.role;
    } catch (error) {
      logger.error('Error getting user role:', { error, userId, communityId });
      throw error;
    }
  }
  async createWishlist(wishlist: InsertWishlist): Promise<Wishlist> {
    try {
      const [newWishlist] = await db.insert(wishlists).values(wishlist).returning();
      logger.debug('Created new wishlist:', { wishlistId: newWishlist.id, wishlist: newWishlist });
      return newWishlist;
    } catch (error) {
      logger.error('Error creating wishlist:', { error, wishlist });
      throw error;
    }
  }

  async getWishlist(id: number): Promise<Wishlist | undefined> {
    try {
      const [wishlist] = await db
        .select()
        .from(wishlists)
        .where(eq(wishlists.id, id));
      logger.debug('Retrieved wishlist:', { wishlistId: id, wishlist });
      return wishlist;
    } catch (error) {
      logger.error('Error getting wishlist:', { error, wishlistId: id });
      throw error;
    }
  }

  async getUserWishlists(userId: number): Promise<Wishlist[]> {
    try {
      const userWishlists = await db
        .select()
        .from(wishlists)
        .where(eq(wishlists.userId, userId))
        .orderBy(desc(wishlists.createdAt));

      logger.debug('Retrieved user wishlists:', { userId, count: userWishlists.length });
      return userWishlists;
    } catch (error) {
      logger.error('Error getting user wishlists:', { error, userId });
      throw error;
    }
  }

  async getCommunityWishlists(communityId: number): Promise<Wishlist[]> {
    try {
      const communityWishlists = await db
        .select()
        .from(wishlists)
        .where(
          and(
            eq(wishlists.communityId, communityId),
            eq(wishlists.isPrivate, false)
          )
        )
        .orderBy(desc(wishlists.createdAt));

      logger.debug('Retrieved community wishlists:', { 
        communityId, 
        count: communityWishlists.length 
      });
      return communityWishlists;
    } catch (error) {
      logger.error('Error getting community wishlists:', { error, communityId });
      throw error;
    }
  }

  async updateWishlist(
    id: number, 
    userId: number, 
    updates: Partial<InsertWishlist>
  ): Promise<Wishlist | undefined> {
    try {
      const [updatedWishlist] = await db
        .update(wishlists)
        .set(updates)
        .where(
          and(
            eq(wishlists.id, id),
            eq(wishlists.userId, userId)
          )
        )
        .returning();

      logger.debug('Updated wishlist:', { 
        wishlistId: id, 
        updates, 
        updatedWishlist 
      });
      return updatedWishlist;
    } catch (error) {
      logger.error('Error updating wishlist:', { error, wishlistId: id, updates });
      throw error;
    }
  }

  async getWishlistFulfillmentItems(wishlistId: number): Promise<Item[]> {
    try {
      const items = await db
        .select()
        .from(items)
        .where(eq(items.wishlistId, wishlistId));

      return items.map(item => ({
        ...item,
        createdAt: item.createdAt.toISOString(),
      }));
    } catch (error) {
      logger.error("Error fetching wishlist fulfillment items:", {
        wishlistId,
        error,
      });
      return [];
    }
  }
}

export const storage = new DatabaseStorage();