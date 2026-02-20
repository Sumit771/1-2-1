import { Request, Response, NextFunction } from "express";
import config from "../config/index.js";

export function adminMiddleware(req: Request, res: Response, next: NextFunction) {
  const token = req.headers["x-admin-token"] as string | undefined;

  if (!token || token !== config.admin.token) {
    res.status(401).json({ error: "Unauthorized - admin token required" });
    return;
  }

  next();
}

export default adminMiddleware;
