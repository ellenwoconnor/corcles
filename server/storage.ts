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
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, sql, ilike, or, notInArray, inArray } from "drizzle-orm";
import session from "express-session";
import connectPg from "connect-pg-simple";
import { pool } from "./db";
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
    userItemsOnly?: boolean
  ): Promise<(Item & { userHasFavorited: boolean })[]>;
  getItem(
    id: number,
    userId?: number,
  ): Promise<(Item & { userHasFavorited: boolean }) | undefined>;
  createItem(item: InsertItem & { userId: number; communityId: number }): Promise<Item>;
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
    userItemsOnly?: boolean
  ): Promise<(Item & { userHasFavorited: boolean })[]> {
    try {
      logger.debug('Fetching items with params:', {
        communities,
        userId,
        search,
        userItemsOnly,
      });

      // First select all fields from items table directly
      const query = db
        .select({
          id: items.id,
          title: items.title,
          description: items.description,
          price: items.price,
          isGift: items.isGift,
          imageUrl: items.imageUrl,
          userId: items.userId,
          communityId: items.communityId,
          status: items.status,
          createdAt: items.createdAt,
          recipientId: items.recipientId,
          pickupStart: items.pickupStart,
          pickupEnd: items.pickupEnd,
          proposedPickupWindows: items.proposedPickupWindows,
          userDisplayName: sql<string>`(
            SELECT username FROM ${users} WHERE ${users.id} = ${items.userId}
          )`.as("userDisplayName"),
          userHasFavorited: sql<boolean>`false`.as("userHasFavorited"),
        })
        .from(items);

      // Build query conditions
      const conditions = [];

      // Don't show completed items
      conditions.push(notInArray(items.status, ['completed']));

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

      // Apply all conditions and get raw results
      const results = await query
        .where(and(...conditions))
        .orderBy(desc(items.createdAt));

      logger.debug('Raw items query results:', {
        count: results.length,
        communities,
        results
      });

      // Transform dates and handle null values
      const transformedItems = results.map(item => ({
        ...item,
        proposedPickupWindows: item.proposedPickupWindows
          ? (item.proposedPickupWindows as unknown as PickupWindow[])
          : undefined,
        pickupStart: item.pickupStart ? new Date(item.pickupStart).toISOString() : null,
        pickupEnd: item.pickupEnd ? new Date(item.pickupEnd).toISOString() : null,
        createdAt: new Date(item.createdAt).toISOString(),
        userDisplayName: item.userDisplayName || "Anonymous"
      }));

      logger.debug('Transformed items:', {
        count: transformedItems.length,
        sample: transformedItems.slice(0, 2)
      });

      return transformedItems;
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
          )`.as("userDisplayName"),
          userHasFavorited: sql<boolean>`false`.as("userHasFavorited"),
        })
        .from(items)
        .where(eq(items.id, id));

      if (!item) return undefined;

      const processedItem = {
        ...item,
        proposedPickupWindows: item.proposedPickupWindows
          ? (item.proposedPickupWindows as unknown as PickupWindow[])
          : undefined,
        pickupStart: item.pickupStart ? new Date(item.pickupStart).toISOString() : null,
        pickupEnd: item.pickupEnd ? new Date(item.pickupEnd).toISOString() : null
      };

      logger.debug("getItem query result:", {
        id,
        userId,
        found: !!processedItem,
        item: {
          id: processedItem.id,
          title: processedItem.title,
          status: processedItem.status,
          pickupStart: processedItem.pickupStart,
          pickupEnd: processedItem.pickupEnd,
          proposedPickupWindows: processedItem.proposedPickupWindows
        }
      });

      return processedItem as (Item & { userHasFavorited: boolean });
    } catch (error) {
      logger.error('Error retrieving item:', { error, id });
      throw error;
    }
  }

  async createItem(item: InsertItem & { userId: number; communityId: number }): Promise<Item> {
    try {
      // Validate required fields
      if (!item.communityId) {
        logger.error('Missing required communityId when creating item:', { item });
        throw new Error('Community ID is required');
      }

      const [newItem] = await db.insert(items).values({
        ...item,
        status: 'available',
        createdAt: new Date()
      }).returning();

      logger.debug('Created new item:', {
        itemId: newItem.id,
        userId: newItem.userId,
        communityId: newItem.communityId,
        title: newItem.title
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
        .select()
        .from(userCommunities)
        .where(
          and(
            eq(userCommunities.userId, userId),
            eq(userCommunities.communityId, communityId)
          )
        );

      return membership?.role;
    } catch (error) {
      logger.error('Error getting user role:', {
        error,
        userId,
        communityId
      });
      throw error;
    }
  }
}

export const storage = new DatabaseStorage();