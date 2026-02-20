import http from "http";
import { Server } from "socket.io";
import app from "./app.js";
import config from "./config/index.js";
import { initializeSocketHandlers } from "./sockets/index.js";
import { ChatService } from "./services/ChatService.js";
import { ImageService } from "./services/ImageService.js";

const server = http.createServer(app);

// Initialize Socket.io
const io = new Server(server, {
  cors: {
    origin: config.cors.origin,
    credentials: true,
  },
  transports: ["websocket", "polling"],
});

// Setup socket handlers
initializeSocketHandlers(io);

// ========== CLEANUP JOBS ==========

/**
 * Periodic cleanup job for expired messages and images
 * Runs every 5 minutes
 */
const cleanupInterval = setInterval(async () => {
  try {
    // Clean up image files
    const deletedImages = await ImageService.cleanupOldFiles();
    if (deletedImages > 0) {
      console.log(`Cleaned up ${deletedImages} expired image files`);
    }

    // Log stats
    const activeChatCount = ChatService.getActiveChatCount();
    const onlineUserCount = ChatService.getOnlineUserCount();
    console.log(
      `[STATS] Active chats: ${activeChatCount}, Online users: ${onlineUserCount}`
    );
  } catch (error) {
    console.error("Error in cleanup job:", error);
  }
}, 5 * 60 * 1000); // 5 minutes

// ========== GRACEFUL SHUTDOWN ==========

process.on("SIGTERM", () => {
  console.log("SIGTERM signal received: closing HTTP server");
  clearInterval(cleanupInterval);
  server.close(() => {
    console.log("HTTP server closed");
    process.exit(0);
  });
});

process.on("SIGINT", () => {
  console.log("SIGINT signal received: closing HTTP server");
  clearInterval(cleanupInterval);
  server.close(() => {
    console.log("HTTP server closed");
    process.exit(0);
  });
});

// ========== START SERVER ==========

server.listen(config.port, () => {
  console.log(`
╔════════════════════════════════════════════════════════════════╗
║     Ephemeral Chat Server - Production Ready                   ║
║     Environment: ${config.nodeEnv}                                  ║
║     Port: ${config.port}                                                ║
║     Message TTL: ${config.ttl.messageTtlMs / 1000 / 60} minutes                                      ║
║     Image TTL: ${config.ttl.imageTtlMs / 1000 / 60} minutes                                        ║
╚════════════════════════════════════════════════════════════════╝
  `);
});

export { server, io };
