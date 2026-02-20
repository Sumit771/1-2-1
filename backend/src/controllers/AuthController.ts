import { Response } from "express";
import { AuthRequest } from "../middleware/auth.js";
import { UserService } from "../services/UserService.js";
import { generateToken } from "../utils/jwt.js";
import { LoginRequest, RegisterRequest } from "../types/index.js";

export class AuthController {
  /**
   * Register a new user
   */
  static async register(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { username, email, password } = req.body as RegisterRequest;

      const user = await UserService.registerUser(username, email, password);

      const token = generateToken({
        userId: user.id,
        username: user.username,
        email: user.email,
      });

      res.status(201).json({
        message: "User registered successfully",
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
        },
        token,
      });
    } catch (error) {
      throw error;
    }
  }

  /**
   * Login user
   */
  static async login(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { email, password } = req.body as LoginRequest;

      const authPayload = await UserService.loginUser(email, password);
      const token = generateToken(authPayload);

      res.status(200).json({
        message: "Login successful",
        user: {
          id: authPayload.userId,
          username: authPayload.username,
          email: authPayload.email,
        },
        token,
      });
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get current user info (protected route)
   */
  static async me(req: AuthRequest, res: Response): Promise<void> {
    try {
      const user = UserService.getUserById(req.userId!);

      if (!user) {
        res.status(404).json({ error: "User not found" });
        return;
      }

      res.status(200).json({
        id: user.id,
        username: user.username,
        email: user.email,
      });
    } catch (error) {
      throw error;
    }
  }
}
