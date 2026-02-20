import path from "path";
import fs from "fs/promises";
import sharp from "sharp";
import config from "../config/index.js";
import { ValidationError, InternalServerError } from "../utils/errors.js";
import { isValidImageMimeType, sanitizeFilename } from "../utils/helpers.js";

export class ImageService {
  /**
   * Process and optimize image upload
   * Handles validation, resizing, format conversion, and storage
   */
  static async processImage(
    buffer: Buffer,
    originalFilename: string,
    mimeType: string
  ): Promise<{
    filename: string;
    relativePath: string;
    absolutePath: string;
  }> {
    // Validate file size
    if (buffer.length > config.upload.maxImageSize) {
      throw new ValidationError(
        `Image size exceeds maximum of ${config.upload.maxImageSize / 1024 / 1024}MB`
      );
    }

    // Validate MIME type
    if (!isValidImageMimeType(mimeType)) {
      throw new ValidationError("Invalid image format. Only JPEG, PNG, WebP, and GIF are allowed");
    }

    try {
      // Generate filename with timestamp to prevent collisions
      const sanitized = sanitizeFilename(originalFilename);
      const timestamp = Date.now();
      const filename = `${timestamp}_${sanitized}`;
      const absolutePath = path.join(config.upload.uploadDir, filename);
      const relativePath = `/uploads/${filename}`;

      // Optimize image with Sharp
      await sharp(buffer)
        .resize(config.upload.maxWidth, config.upload.maxHeight, {
          fit: "inside",
          withoutEnlargement: true,
        })
        .webp({ quality: config.upload.quality })
        .toFile(absolutePath.replace(/\.jpg$|\.png$|\.webp$|\.gif$/i, ".webp"));

      return {
        filename: path.basename(absolutePath).replace(/\.\w+$/, ".webp"),
        relativePath: relativePath.replace(/\.\w+$/, ".webp"),
        absolutePath: absolutePath.replace(/\.\w+$/, ".webp"),
      };
    } catch (error) {
      throw new InternalServerError(
        "Failed to process image. Please try again."
      );
    }
  }

  /**
   * Delete image file from disk
   */
  static async deleteImage(filePath: string): Promise<void> {
    try {
      const absolutePath = path.join(process.cwd(), filePath);

      // Security: prevent directory traversal
      const normalizedPath = path.normalize(absolutePath);
      const uploadDirResolved = path.resolve(config.upload.uploadDir);
      if (!normalizedPath.startsWith(uploadDirResolved)) {
        throw new Error("Invalid file path");
      }

      await fs.unlink(normalizedPath);
    } catch (error) {
      // Silently fail if file doesn't exist or can't be deleted
      console.error(`Failed to delete image: ${filePath}`, error);
    }
  }

  /**
   * Clean up upload directory and remove old files
   */
  static async cleanupOldFiles(): Promise<number> {
    let deletedCount = 0;

    try {
      const files = await fs.readdir(config.upload.uploadDir);
      const now = Date.now();

      for (const file of files) {
        const filePath = path.join(config.upload.uploadDir, file);
        const stats = await fs.stat(filePath);

        // Delete files older than TTL
        if (now - stats.mtimeMs > config.ttl.imageTtlMs) {
          await fs.unlink(filePath);
          deletedCount++;
        }
      }
    } catch (error) {
      console.error("Error cleaning up old files:", error);
    }

    return deletedCount;
  }

  /**
   * Ensure upload directory exists
   */
  static async ensureUploadDir(): Promise<void> {
    try {
      await fs.mkdir(config.upload.uploadDir, { recursive: true });
    } catch (error) {
      console.error("Failed to create upload directory:", error);
    }
  }
}
