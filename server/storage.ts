import {
  users,
  items,
  itemRequests,
  itemBids,
  messages,
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
  ITEM_STATUS,
  REQUEST_STATUS,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, sql, ilike, or, notInArray } from "drizzle-orm";
import session from "express-session";
import connectPg from "connect-pg-simple";
import { pool } from "./db";
import logger from './logger';
import { type Community, type InsertCommunity, type CommunityMember, type InsertCommunityInvitation, type CommunityInvitation } from "@shared/schema";


const PostgresSessionStore = connectPg(session);

export interface IStorage {
  // Existing methods
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByAddress(address: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  getItems(
    community: string,
    userId?: number,
    search?: string,
    userItemsOnly?: boolean
  ): Promise<(Item & { userHasFavorited: boolean })[]>;
  getItem(
    id: number,
    userId?: number,
  ): Promise<(Item & { userHasFavorited: boolean }) | undefined>;
  createItem(item: InsertItem & { userId: number }): Promise<Item>;
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

  // Community methods
  createCommunity(community: InsertCommunity & { createdBy: number }): Promise<Community>;
  getCommunity(id: number): Promise<Community | undefined>;
  getUserCommunities(userId: number): Promise<Community[]>;
  addCommunityMember(userId: number, communityId: number, role?: string): Promise<CommunityMember>;
  createCommunityInvitation(invitation: InsertCommunityInvitation): Promise<CommunityInvitation>;
  acceptCommunityInvitation(invitationId: number, userId: number): Promise<CommunityMember>;
  isCommunityMember(userId: number, communityId: number): Promise<boolean>;
}

export class DatabaseStorage implements IStorage {
  public sessionStore: session.Store;

  constructor() {
    this.sessionStore = new PostgresSessionStore({
      pool,
      createTableIfMissing: true,
    });
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

  async createUser(insertUser: InsertUser): Promise<User> {
    try {
      // Generate the community name based on zip code
      const community = `home-circle-${insertUser.zipCode}`;

      const [user] = await db.insert(users).values({
        ...insertUser,
        community,
      }).returning();

      logger.debug('Created new user:', { 
        userId: user.id, 
        username: user.username,
        community
      });

      return user;
    } catch (error) {
      logger.error('Error creating user:', { error, username: insertUser.username });
      throw error;
    }
  }

  async getItems(
    community: string,
    userId?: number,
    search?: string,
    userItemsOnly?: boolean
  ): Promise<(Item & { userHasFavorited: boolean })[]> {
    try {
      const query = db
        .select({
          ...items,
          userDisplayName: sql<string>`(
            SELECT username FROM ${users} WHERE ${users.id} = ${items.userId}
          )`,
          userHasFavorited: sql<boolean>`false`
        })
        .from(items);

      // When fetching user's items, only filter by userId
      if (userItemsOnly) {
        query.where(eq(items.userId, userId!));
      } else {
        // For community browsing, filter by community and exclude completed items
        query.where(
          and(
            eq(items.community, community),
            sql`${items.status} != 'completed'`
          )
        );
      }

      if (search) {
        const searchTerm = `%${search}%`;
        query.where(
          sql`(${items.title} ILIKE ${searchTerm} OR ${items.description} ILIKE ${searchTerm})`
        );
      }

      const itemResults = await query.orderBy(desc(items.createdAt));

      // Process the pickup windows for all items
      const processedItems = itemResults.map(item => ({
        ...item,
        proposedPickupWindows: item.proposedPickupWindows 
          ? (item.proposedPickupWindows as PickupWindow[])
          : undefined,
        pickupStart: item.pickupStart ? new Date(item.pickupStart).toISOString() : null,
        pickupEnd: item.pickupEnd ? new Date(item.pickupEnd).toISOString() : null
      }));

      logger.debug('Retrieved items:', { 
        community, 
        userId,
        userItemsOnly,
        searchTerm: search, 
        count: processedItems.length
      });

      return processedItems as (Item & { userHasFavorited: boolean })[];
    } catch (error) {
      logger.error('Error retrieving items:', { error, community, searchTerm: search });
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

      // Process pickup windows and dates consistently
      const processedItem = {
        ...item,
        proposedPickupWindows: item.proposedPickupWindows 
          ? (item.proposedPickupWindows as PickupWindow[])
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

  async createItem(item: InsertItem & { userId: number }): Promise<Item> {
    try {
      const [newItem] = await db.insert(items).values(item).returning();
      logger.debug('Created new item:', { itemId: newItem.id, item: newItem });
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

      // Update all requests for this item to awaiting_pickup_confirmation
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

      // Update request status and add cancellation info
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

      // Reset item status and clear pickup information
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
      // Check if the users have any shared item requests
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

      // Add creator as admin member
      await this.addCommunityMember(community.createdBy, newCommunity.id, 'admin');

      logger.debug('Created new community:', { 
        communityId: newCommunity.id, 
        name: newCommunity.name,
        createdBy: community.createdBy
      });

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

  async getUserCommunities(userId: number): Promise<Community[]> {
    try {
      const userCommunities = await db
        .select({
          community: communities,
          role: communityMembers.role
        })
        .from(communityMembers)
        .innerJoin(communities, eq(communities.id, communityMembers.communityId))
        .where(eq(communityMembers.userId, userId));

      logger.debug('Retrieved user communities:', { 
        userId, 
        count: userCommunities.length 
      });

      return userCommunities.map(({ community }) => community);
    } catch (error) {
      logger.error('Error getting user communities:', { error, userId });
      throw error;
    }
  }

  async addCommunityMember(userId: number, communityId: number, role: string = 'member'): Promise<CommunityMember> {
    try {
      const [member] = await db
        .insert(communityMembers)
        .values({ userId, communityId, role })
        .returning();

      logger.debug('Added community member:', { 
        userId,
        communityId,
        role,
        memberId: member.id
      });

      return member;
    } catch (error) {
      logger.error('Error adding community member:', { error, userId, communityId });
      throw error;
    }
  }

  async createCommunityInvitation(invitation: InsertCommunityInvitation): Promise<CommunityInvitation> {
    try {
      const [newInvitation] = await db
        .insert(communityInvitations)
        .values(invitation)
        .returning();

      logger.debug('Created community invitation:', { 
        invitationId: newInvitation.id,
        communityId: invitation.communityId,
        invitedEmail: invitation.invitedEmail
      });

      return newInvitation;
    } catch (error) {
      logger.error('Error creating community invitation:', { error, invitation });
      throw error;
    }
  }

  async acceptCommunityInvitation(invitationId: number, userId: number): Promise<CommunityMember> {
    try {
      const [invitation] = await db
        .select()
        .from(communityInvitations)
        .where(eq(communityInvitations.id, invitationId));

      if (!invitation) {
        throw new Error('Invitation not found');
      }

      // Update invitation status
      await db
        .update(communityInvitations)
        .set({ 
          status: 'accepted',
          acceptedAt: sql`CURRENT_TIMESTAMP`
        })
        .where(eq(communityInvitations.id, invitationId));

      // Add user to community
      return await this.addCommunityMember(userId, invitation.communityId);
    } catch (error) {
      logger.error('Error accepting community invitation:', { error, invitationId, userId });
      throw error;
    }
  }

  async isCommunityMember(userId: number, communityId: number): Promise<boolean> {
    try {
      const [membership] = await db
        .select()
        .from(communityMembers)
        .where(
          and(
            eq(communityMembers.userId, userId),
            eq(communityMembers.communityId, communityId)
          )
        );

      return !!membership;
    } catch (error) {
      logger.error('Error checking community membership:', { error, userId, communityId });
      throw error;
    }
  }
}

export const storage = new DatabaseStorage();