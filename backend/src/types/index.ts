// User and Authentication Types
export interface User {
  id: string;
  username: string;
  email: string;
  passwordHash: string;
  createdAt: Date;
}

export interface AuthPayload {
  userId: string;
  username: string;
  email: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
}

// Message Types
export interface Message {
  id: string;
  senderId: string;
  senderUsername: string;
  roomId: string;
  content?: string;
  imageUrl?: string;
  imagePath?: string;
  status: MessageStatus;
  createdAt: Date;
  expiresAt: Date;
}

export type MessageStatus = "sent" | "delivered" | "seen";

// Chat Room Types
export interface ChatRoom {
  id: string;
  user1Id: string;
  user2Id: string;
  user1Username: string;
  user2Username: string;
  createdAt: Date;
  messages: Message[];
  activeUsers: Set<string>;
}

// Socket Events Types
export interface SocketMessage {
  roomId: string;
  content?: string;
  imageUrl?: string;
}

export interface TypingIndicator {
  roomId: string;
  isTyping: boolean;
}

export interface OnlineStatus {
  userId: string;
  username: string;
  isOnline: boolean;
  lastSeen?: Date;
}

export interface MessageStatusUpdate {
  messageId: string;
  status: MessageStatus;
  roomId: string;
}

// User Activity Tracking
export interface UserActivity {
  userId: string;
  socketId: string;
  username: string;
  isOnline: boolean;
  lastSeen: Date;
  currentRoom?: string;
}
