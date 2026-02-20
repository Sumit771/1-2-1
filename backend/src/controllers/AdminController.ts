import { Request, Response } from "express";
import { UserService } from "../services/UserService.js";

export class AdminController {
  static async listUsers(_req: Request, res: Response) {
    try {
      const users = UserService.getAllUsers();
      const safe = users.map((u) => ({ id: u.id, username: u.username, email: u.email, createdAt: u.createdAt }));
      res.status(200).json({ users: safe });
    } catch (err) {
      res.status(500).json({ error: "Internal server error" });
    }
  }

  static async createUser(req: Request, res: Response) {
    try {
      const { username, email, password } = req.body;
      if (!username || !email || !password) {
        res.status(400).json({ error: "username, email and password are required" });
        return;
      }

      const user = await UserService.registerUser(username, email, password);
      res.status(201).json({ id: user.id, username: user.username, email: user.email, createdAt: user.createdAt });
    } catch (err: any) {
      res.status(err.statusCode || 500).json({ error: err.message || "Internal server error" });
    }
  }

  static async updateUser(req: Request, res: Response) {
    try {
      const id = req.params.id as string
      const { username, email, password } = req.body
      const user = await UserService.updateUser(id, { username, email, password })
      res.status(200).json({ id: user.id, username: user.username, email: user.email, createdAt: user.createdAt })
    } catch (err: any) {
      res.status(err.statusCode || 500).json({ error: err.message || 'Internal server error' })
    }
  }

  static async deleteUser(req: Request, res: Response) {
    try {
      const id = req.params.id as string
      const ok = await UserService.deleteUser(id)
      if (!ok) {
        res.status(404).json({ error: 'User not found' })
        return
      }
      res.status(200).json({ success: true })
    } catch (err:any) {
      res.status(500).json({ error: 'Internal server error' })
    }
  }
}

export default AdminController;
