import { Request, Response, NextFunction } from "express";
import { AppError } from "../utils/errors.js";
import { verifyToken, extractTokenFromHeader } from "../utils/jwt.js";

export interface AuthRequest extends Request {
  userId?: string;
  username?: string;
  email?: string;
}

/**
 * Middleware to authenticate JWT tokens
 */
export function authMiddleware(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void {
  try {
    const token = extractTokenFromHeader(req.headers.authorization);
    const payload = verifyToken(token);

    req.userId = payload.userId;
    req.username = payload.username;
    req.email = payload.email;

    next();
  } catch (error) {
    if (error instanceof AppError) {
      res.status(error.statusCode).json({
        error: error.message,
      });
    } else {
      res.status(401).json({
        error: "Unauthorized",
      });
    }
  }
}

/**
 * Global error handling middleware
 */
export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  console.error("Error:", err);

  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      error: err.message,
      statusCode: err.statusCode,
    });
  } else {
    res.status(500).json({
      error: "Internal server error",
      statusCode: 500,
    });
  }
}

/**
 * Middleware to handle 404 errors
 */
export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({
    error: `Cannot ${req.method} ${req.path}`,
    statusCode: 404,
  });
}
