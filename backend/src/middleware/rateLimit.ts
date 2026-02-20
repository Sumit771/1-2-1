import rateLimit from "express-rate-limit";
import config from "../config/index.js";

const isDev = process.env.NODE_ENV !== 'production'

/**
 * General API rate limiter (5 requests per second per IP)
 */
export const apiLimiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  // allow more requests in development (React StrictMode may double-mount hooks)
  max: isDev ? Math.max(50, config.rateLimit.maxRequests) : config.rateLimit.maxRequests,
  message: "Too many requests, please try again later",
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Auth endpoints rate limiter (stricter: 3 per minute)
 */
export const authLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 3,
  message: "Too many authentication attempts, please try again later",
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: false,
});

/**
 * Image upload rate limiter (10 per minute)
 */
export const uploadLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  message: "Too many upload attempts, please try again later",
  standardHeaders: true,
  legacyHeaders: false,
});
