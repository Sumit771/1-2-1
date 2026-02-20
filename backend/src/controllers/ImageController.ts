import { Response } from "express";
import { AuthRequest } from "../middleware/auth.js";
import { ImageService } from "../services/ImageService.js";
import { ChatService } from "../services/ChatService.js";
import { ValidationError } from "../utils/errors.js";

export class ImageController {
  /**
   * Upload and process image
   */
  static async uploadImage(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.file) {
        throw new ValidationError("No image file provided");
      }

      const mimeType = req.file.mimetype;
      const originalName = req.file.originalname;
      const buffer = req.file.buffer;

      const result = await ImageService.processImage(buffer, originalName, mimeType);

      // Track image file for TTL cleanup
      const expiresAt = new Date(Date.now() + 3600000); // 1 hour
      ChatService.trackImageFile(result.absolutePath, expiresAt);

      res.status(200).json({
        success: true,
        message: "Image uploaded successfully",
        imageUrl: result.relativePath,
        filename: result.filename,
      });
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get image (serve from disk)
   */
  static async getImage(req: AuthRequest, res: Response): Promise<void> {
    try {
      const filename = req.params.filename as string;

      // Security: prevent directory traversal
      if (filename.includes("..") || filename.includes("/")) {
        res.status(400).json({ error: "Invalid filename" });
        return;
      }

      res.sendFile(`./uploads/${filename}`);
    } catch (error) {
      throw error;
    }
  }
}
