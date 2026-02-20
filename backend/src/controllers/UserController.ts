import { Response } from "express";
import { AuthRequest } from "../middleware/auth.js";
import { UserService } from "../services/UserService.js";

export class UserController {
  /**
   * Get all users
   */
  static async getAllUsers(req: AuthRequest, res: Response): Promise<void> {
    try {
      const users = UserService.getAllUsers();

      // Don't return password hashes and filter out current user
      const safeUsers = users
        .filter((u) => u.id !== req.userId)
        .map((u) => ({
          id: u.id,
          username: u.username,
          email: u.email,
        }));

      res.status(200).json({ users: safeUsers });
    } catch (error) {
      throw error;
    }
  }

  /**
   * Search users by username or email
   */
  static async searchUsers(req: AuthRequest, res: Response): Promise<void> {
    try {
      const query = req.query.q as string;

      if (!query || query.length < 2) {
        res.status(200).json({ users: [] });
        return;
      }

      const results = UserService.searchUsers(query);

      // Filter out current user and return safe data
      const safeUsers = results
        .filter((u) => u.id !== req.userId)
        .map((u) => ({
          id: u.id,
          username: u.username,
          email: u.email,
        }));

      res.status(200).json({ users: safeUsers });
    } catch (error) {
      throw error;
    }
  }
}
