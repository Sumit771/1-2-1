import { Response } from "express";
import { AuthRequest } from "../middleware/auth.js";
import { ChatService } from "../services/ChatService.js";
import { UserService } from "../services/UserService.js";

export class ChatController {
  /**
   * Get all rooms for current user
   */
  static async getRooms(req: AuthRequest, res: Response): Promise<void> {
    try {
      const rooms = ChatService.getUserRooms(req.userId!);

      const roomData = rooms.map((room) => {
        const otherUserId =
          room.user1Id === req.userId ? room.user2Id : room.user1Id;
        const otherUsername =
          room.user1Id === req.userId ? room.user2Username : room.user1Username;
        const lastMsg = room.messages[room.messages.length - 1];

        return {
          id: room.id,
          otherUserId,
          otherUsername,
          otherUserOnline: ChatService.isUserOnline(otherUserId),
          activeUsers: Array.from(room.activeUsers),
          messageCount: room.messages.length,
          lastMessage: lastMsg
            ? {
                content: lastMsg.content,
                imageUrl: lastMsg.imageUrl,
                createdAt: lastMsg.createdAt,
                senderId: lastMsg.senderId,
              }
            : null,
          createdAt: room.createdAt,
        };
      });

      res.status(200).json({ rooms: roomData });
    } catch (error) {
      throw error;
    }
  }

  /**
   * Create or get a chat room between current user and another user
   */
  static async createRoom(req: AuthRequest, res: Response): Promise<void> {
    try {
      const otherUserId = req.body.otherUserId as string;

      if (!otherUserId) {
        res.status(400).json({ error: "otherUserId is required" });
        return;
      }

      const me = req.userId!;
      const meUser = UserService.getUserById(me);
      const otherUser = UserService.getUserById(otherUserId);

      if (!meUser || !otherUser) {
        res.status(404).json({ error: "User not found" });
        return;
      }

      const room = ChatService.getOrCreateRoom(
        meUser.id,
        meUser.username,
        otherUser.id,
        otherUser.username
      );

      console.log(`[CHAT] createRoom: user=${meUser.id} other=${otherUser.id} room=${room.id}`);

      // Return room id and current messages (filtered)
      const messages = ChatService.getRoomMessages(room.id).map((msg) => ({
        id: msg.id,
        senderId: msg.senderId,
        senderUsername: msg.senderUsername,
        content: msg.content,
        imageUrl: msg.imageUrl,
        status: msg.status,
        createdAt: msg.createdAt,
      }));

      res.status(200).json({ roomId: room.id, messages });
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get messages for a specific room
   */
  static async getRoomMessages(req: AuthRequest, res: Response): Promise<void> {
    try {
      const roomId = req.params.roomId as string;

      const messages = ChatService.getRoomMessages(roomId);

      const messageData = messages.map((msg) => ({
        id: msg.id,
        senderId: msg.senderId,
        senderUsername: msg.senderUsername,
        content: msg.content,
        imageUrl: msg.imageUrl,
        status: msg.status,
        createdAt: msg.createdAt,
      }));

      res.status(200).json({ messages: messageData });
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get stats (for monitoring)
   */
  static async getStats(_req: AuthRequest, res: Response): Promise<void> {
    try {
      res.status(200).json({
        activeChatCount: ChatService.getActiveChatCount(),
        onlineUserCount: ChatService.getOnlineUserCount(),
      });
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get online user IDs (for presence)
   */
  static async getOnlineUsers(_req: AuthRequest, res: Response): Promise<void> {
    try {
      const onlineIds = Array.from(ChatService.getOnlineUserIds());
      res.status(200).json({ onlineUserIds: onlineIds });
    } catch (error) {
      throw error;
    }
  }
}
