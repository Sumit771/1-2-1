import { ChatRoom, Message, MessageStatus } from "../types/index.js";
import { generateId, generateRoomId } from "../utils/helpers.js";
import { NotFoundError } from "../utils/errors.js";
import config from "../config/index.js";

/**
 * In-memory storage for chat rooms and messages (ephemeral)
 */
const activeChats = new Map<string, ChatRoom>();
const userSessions = new Map<string, string>(); // userId -> socketId

/**
 * Track image files for cleanup
 */
const imageFiles = new Map<string, { path: string; expiresAt: Date }>();

export class ChatService {
  /**
   * Create or get a chat room between two users
   */
  static getOrCreateRoom(
    user1Id: string,
    user1Username: string,
    user2Id: string,
    user2Username: string
  ): ChatRoom {
    const roomId = generateRoomId(user1Id, user2Id);

    let room = activeChats.get(roomId);
    if (room) {
      return room;
    }

    room = {
      id: roomId,
      user1Id,
      user2Id,
      user1Username,
      user2Username,
      createdAt: new Date(),
      messages: [],
      activeUsers: new Set(),
    };

    activeChats.set(roomId, room);
    return room;
  }

  /**
   * Get room by ID
   */
  static getRoom(roomId: string): ChatRoom | undefined {
    return activeChats.get(roomId);
  }

  /**
   * Add message to a room
   */
  static addMessage(
    roomId: string,
    senderId: string,
    senderUsername: string,
    content?: string,
    imageUrl?: string,
    imagePath?: string
  ): Message {
    const room = activeChats.get(roomId);
    if (!room) {
      throw new NotFoundError("Chat room not found");
    }

    const messageId = generateId();
    const expiresAt = new Date(
      Date.now() + config.ttl.messageTtlMs
    );

    const message: Message = {
      id: messageId,
      senderId,
      senderUsername,
      roomId,
      content,
      imageUrl,
      imagePath,
      status: "sent",
      createdAt: new Date(),
      expiresAt,
    };

    room.messages.push(message);

    // Track image for cleanup
    if (imagePath) {
      imageFiles.set(imagePath, {
        path: imagePath,
        expiresAt,
      });
    }

    return message;
  }

  /**
   * Get all messages for a room
   */
  static getRoomMessages(roomId: string): Message[] {
    const room = activeChats.get(roomId);
    if (!room) {
      return [];
    }

    // Filter out expired messages
    const now = new Date();
    return room.messages.filter((msg) => msg.expiresAt > now);
  }

  /**
   * Update message status
   */
  static updateMessageStatus(
    roomId: string,
    messageId: string,
    status: MessageStatus
  ): Message | undefined {
    const room = activeChats.get(roomId);
    if (!room) {
      return undefined;
    }

    const message = room.messages.find((msg) => msg.id === messageId);
    if (message) {
      message.status = status;
    }

    return message;
  }

  /**
   * Track active user in room
   */
  static addActiveUser(roomId: string, userId: string): void {
    const room = activeChats.get(roomId);
    if (room) {
      room.activeUsers.add(userId);
    }
  }

  /**
   * Remove active user from room
   */
  static removeActiveUser(roomId: string, userId: string): void {
    const room = activeChats.get(roomId);
    if (room) {
      room.activeUsers.delete(userId);

      // Delete room if both users disconnected
      if (room.activeUsers.size === 0) {
        activeChats.delete(roomId);

        // Clean up image files
        room.messages.forEach((msg) => {
          if (msg.imagePath) {
            imageFiles.delete(msg.imagePath);
          }
        });
      }
    }
  }

  /**
   * Get user's rooms
   */
  static getUserRooms(userId: string): ChatRoom[] {
    return Array.from(activeChats.values()).filter(
      (room) => room.user1Id === userId || room.user2Id === userId
    );
  }

  /**
   * Register user session
   */
  static registerUserSession(userId: string, socketId: string): void {
    userSessions.set(userId, socketId);
  }

  /**
   * Unregister user session
   */
  static unregisterUserSession(userId: string): void {
    userSessions.delete(userId);
  }

  /**
   * Get user's socket ID
   */
  static getUserSocketId(userId: string): string | undefined {
    return userSessions.get(userId);
  }

  /**
   * Check if user is online
   */
  static isUserOnline(userId: string): boolean {
    return userSessions.has(userId);
  }

  /**
   * Track image file for TTL cleanup
   */
  static trackImageFile(filePath: string, expiresAt: Date): void {
    imageFiles.set(filePath, { path: filePath, expiresAt });
  }

  /**
   * Get expired image files
   */
  static getExpiredImageFiles(): string[] {
    const now = new Date();
    const expired: string[] = [];

    imageFiles.forEach((fileInfo, filePath) => {
      if (fileInfo.expiresAt <= now) {
        expired.push(filePath);
        imageFiles.delete(filePath);
      }
    });

    return expired;
  }

  /**
   * Get active chats count (for monitoring)
   */
  static getActiveChatCount(): number {
    return activeChats.size;
  }

  /**
   * Get online users count (for monitoring)
   */
  static getOnlineUserCount(): number {
    return userSessions.size;
  }

  /**
   * Get set of online user IDs
   */
  static getOnlineUserIds(): Set<string> {
    return new Set(userSessions.keys());
  }
}
