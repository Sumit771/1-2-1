import dotenv from "dotenv";

dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || "3000", 10),
  nodeEnv: process.env.NODE_ENV || "development",
  jwt: {
    secret: process.env.JWT_SECRET || "your-secret-key-change-in-production",
    expiresIn: process.env.JWT_EXPIRES_IN || "24h",
  },
  ttl: {
    messageTtlMs: parseInt(process.env.MESSAGE_TTL_MS || "3600000", 10),
    imageTtlMs: parseInt(process.env.IMAGE_TTL_MS || "3600000", 10),
  },
  upload: {
    maxImageSize: parseInt(process.env.MAX_IMAGE_SIZE || "2097152", 10),
    maxWidth: parseInt(process.env.IMAGE_MAX_WIDTH || "1280", 10),
    maxHeight: parseInt(process.env.IMAGE_MAX_HEIGHT || "1280", 10),
    quality: parseInt(process.env.IMAGE_QUALITY || "80", 10),
    uploadDir: process.env.UPLOAD_DIR || "./uploads",
  },
  rateLimit: {
    windowMs: 1000, // 1 second
    maxRequests: 5, // 5 messages per second per user
  },
  cors: {
    origin: process.env.CORS_ORIGIN || "http://localhost:5173",
  },
  admin: {
    token: process.env.ADMIN_TOKEN || "admin-secret",
  },
};

export default config;
