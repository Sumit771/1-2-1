import jwt from "jsonwebtoken";
import config from "../config/index.js";
import { AuthPayload } from "../types/index.js";
import { AuthenticationError } from "./errors.js";

/**
 * Generate JWT token for authenticated user
 */
export function generateToken(payload: AuthPayload): string {
  // Cast to any to satisfy differing type signatures across jsonwebtoken versions
  return (jwt as any).sign(payload, config.jwt.secret as any, {
    expiresIn: config.jwt.expiresIn,
  });
}

/**
 * Verify and decode JWT token
 */
export function verifyToken(token: string): AuthPayload {
  try {
    const decoded = (jwt as any).verify(token, config.jwt.secret as any) as AuthPayload;
    return decoded;
  } catch (error) {
    throw new AuthenticationError("Invalid or expired token");
  }
}

/**
 * Extract token from Authorization header
 */
export function extractTokenFromHeader(authHeader?: string): string {
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    throw new AuthenticationError("Missing or invalid authorization header");
  }
  return authHeader.substring(7);
}
