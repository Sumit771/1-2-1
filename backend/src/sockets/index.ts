import { Server, Socket } from "socket.io";
import { verifyToken } from "../utils/jwt.js";
import { ChatService } from "../services/ChatService.js";
import { UserService } from "../services/UserService.js";
import {
  SocketMessage,
  TypingIndicator,
  MessageStatusUpdate,
} from "../types/index.js";
import { AuthenticationError } from "../utils/errors.js";

/**
 * Store socket -> user mapping for tracking
 */
const socketToUser = new Map<string, string>();

/**
 * Store user public keys for E2E encryption
 * room -> { user1Id: publicKey, user2Id: publicKey }
 */
const roomPublicKeys = new Map<string, Record<string, string>>();

/**
 * Authenticate socket connection with JWT
 */
function authenticateSocket(socket: Socket): string {
  const token = socket.handshake.auth.token as string;

  if (!token) {
    throw new AuthenticationError("Missing authentication token");
  }

  const payload = verifyToken(token);
  return payload.userId;
}

/**
 * Initialize Socket.io event handlers
 */
export function initializeSocketHandlers(io: Server): void {
  io.use((socket, next) => {
    try {
      const userId = authenticateSocket(socket);
      socket.data.userId = userId;
      socket.data.username = "";
      next();
    } catch (error) {
      next(error as Error);
    }
  });

  io.on("connection", (socket: Socket) => {
    console.log(`User connected: ${socket.id}`);

    const userId = socket.data.userId as string;
    socketToUser.set(socket.id, userId);

    // Register user session
    ChatService.registerUserSession(userId, socket.id);

    // Emit user online status
    socket.broadcast.emit("user:online", {
      userId,
      isOnline: true,
    });

    // ========== MESSAGE EVENTS ==========

    /**
     * Handle sending message in a chat room
     */
    socket.on("message:send", (data: SocketMessage, callback) => {
      try {
        const roomId = data.roomId as string;
        const content = data.content?.trim();
        const imageUrl = data.imageUrl as string | undefined;

        // Validate
        if (!roomId) {
          callback({ error: "Room ID is required" });
          return;
        }

        if (!content && !imageUrl) {
          callback({ error: "Message content or image is required" });
          return;
        }

        // Validate content length
        if (content && content.length > 5000) {
          callback({ error: "Message is too long" });
          return;
        }

        const room = ChatService.getRoom(roomId);
        if (!room) {
          callback({ error: "Room not found" });
          return;
        }

        const user = UserService.getUserById(userId);
        if (!user) {
          callback({ error: "User not found" });
          return;
        }

        // Add message
        const message = ChatService.addMessage(
          roomId,
          userId,
          user.username,
          content,
          imageUrl
        );

        // Emit to room (include roomId for client)
        io.to(roomId).emit("message:new", {
          id: message.id,
          roomId,
          senderId: message.senderId,
          senderUsername: message.senderUsername,
          content: message.content,
          imageUrl: message.imageUrl,
          status: message.status,
          createdAt: message.createdAt,
        });

        callback({
          success: true,
          messageId: message.id,
          timestamp: message.createdAt,
        });
      } catch (error) {
        console.error("Error sending message:", error);
        callback({ error: "Failed to send message" });
      }
    });

    /**
     * Handle message status updates
     */
    socket.on("message:status", (data: MessageStatusUpdate) => {
      try {
        const { roomId, messageId, status } = data;

        const message = ChatService.updateMessageStatus(roomId, messageId, status);
        if (message) {
          io.to(roomId).emit("message:statusUpdated", {
            messageId,
            status,
          });
        }
      } catch (error) {
        console.error("Error updating message status:", error);
      }
    });

    // ========== ROOM EVENTS ==========

    /**
     * Join a chat room
     */
    socket.on("room:join", (data: { roomId: string; publicKey?: string }, callback) => {
      try {
        const roomId = data.roomId as string;
        const publicKey = data.publicKey as string | undefined;

        console.log(`[SOCKET] room:join requested by user=${userId} socket=${socket.id} room=${roomId}`);

        if (!roomId) {
          callback({ error: "Room ID is required" });
          return;
        }

        const room = ChatService.getRoom(roomId);
        console.log(`[SOCKET] room lookup for ${roomId}: ${room ? 'found' : 'not found'}`);
        if (!room) {
          callback({ error: "Room not found" });
          return;
        }

        // Store public key for E2E encryption if provided
        if (publicKey) {
          if (!roomPublicKeys.has(roomId)) {
            roomPublicKeys.set(roomId, {});
          }
          roomPublicKeys.get(roomId)![userId] = publicKey;
          console.log(`[SOCKET] stored public key for user=${userId} in room=${roomId}`);
        }

        // Add user to active users
        ChatService.addActiveUser(roomId, userId);

        // Join socket to room
        socket.join(roomId);

        // Get the other user's ID
        const otherUserId = room.user1Id === userId ? room.user2Id : room.user1Id;
        const otherUserPublicKey = roomPublicKeys.get(roomId)?.[otherUserId];

        // Notify others
        socket.broadcast.to(roomId).emit("user:joined", {
          userId,
          activeUsers: Array.from(room.activeUsers),
        });

        // Get message history
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

        callback({
          success: true,
          messages: messageData,
          activeUsers: Array.from(room.activeUsers),
          otherUserPublicKey, // Send other user's public key for E2E setup
          otherUserId,
        });
      } catch (error) {
        console.error("Error joining room:", error);
        callback({ error: "Failed to join room" });
      }
    });

    /**
     * Leave a chat room
     */
    socket.on("room:leave", (data: { roomId: string }) => {
      try {
        const roomId = data.roomId as string;

        socket.leave(roomId);
        ChatService.removeActiveUser(roomId, userId);

        // Notify others
        const room = ChatService.getRoom(roomId);
        if (room) {
          socket.broadcast.to(roomId).emit("user:left", {
            userId,
            activeUsers: Array.from(room.activeUsers),
          });
        }
      } catch (error) {
        console.error("Error leaving room:", error);
      }
    });

    // ========== TYPING INDICATOR EVENTS ==========

    /**
     * Typing indicator with debouncing
     */
    socket.on("typing:start", (data: TypingIndicator) => {
      try {
        const roomId = data.roomId as string;

        socket.broadcast.to(roomId).emit("typing:indicator", {
          userId,
          isTyping: true,
        });

        // Auto-clear typing indicator after 3 seconds
        setTimeout(() => {
          socket.broadcast.to(roomId).emit("typing:indicator", {
            userId,
            isTyping: false,
          });
        }, 3000);
      } catch (error) {
        console.error("Error handling typing indicator:", error);
      }
    });

    socket.on("typing:stop", (data: TypingIndicator) => {
      try {
        const roomId = data.roomId as string;

        socket.broadcast.to(roomId).emit("typing:indicator", {
          userId,
          isTyping: false,
        });
      } catch (error) {
        console.error("Error stopping typing indicator:", error);
      }
    });

    // ========== DISCONNECT EVENT ==========

    socket.on("disconnect", () => {
      try {
        console.log(`User disconnected: ${socket.id}`);

        socketToUser.delete(socket.id);
        ChatService.unregisterUserSession(userId);

        // Leave all rooms and remove from active users
        const rooms = ChatService.getUserRooms(userId);
        rooms.forEach((room) => {
          ChatService.removeActiveUser(room.id, userId);
          socket.broadcast.to(room.id).emit("user:left", {
            userId,
            activeUsers: Array.from(room.activeUsers),
          });
        });

        // Broadcast user offline
        socket.broadcast.emit("user:offline", {
          userId,
          isOnline: false,
        });
      } catch (error) {
        console.error("Error on disconnect:", error);
      }
    });

    socket.on("connect_error", (error) => {
      console.error("Socket connection error:", error);
    });
  });
}
