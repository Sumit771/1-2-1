import express, { Express, Request, Response } from "express";
import cors from "cors";
import helmet from "helmet";
import multer from "multer";
import config from "./config/index.js";
import { authMiddleware, errorHandler, notFoundHandler } from "./middleware/auth.js";
import { apiLimiter, authLimiter, uploadLimiter } from "./middleware/rateLimit.js";
import { AuthController } from "./controllers/AuthController.js";
import { UserController } from "./controllers/UserController.js";
import { ChatController } from "./controllers/ChatController.js";
import { ImageController } from "./controllers/ImageController.js";
import { AdminController } from "./controllers/AdminController.js";
import { adminMiddleware } from "./middleware/admin.js";
import { AuthRequest } from "./middleware/auth.js";
import { ImageService } from "./services/ImageService.js";

const app: Express = express();

// ========== MIDDLEWARE ==========

// Security middleware
app.use(helmet());
app.use(
  cors({
    origin: config.cors.origin,
    credentials: true,
  })
);

// Body parsing
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ limit: "10mb", extended: true }));

// Static files for uploads
// app.use("/uploads", express.static(config.upload.uploadDir));

// Rate limiting
app.use("/api/", apiLimiter);

// ========== ROUTES ==========

// Root endpoint
app.get("/", (_req: Request, res: Response) => {
  res.status(200).json({
    message: "Chat App Backend API",
    endpoints: {
      health: "GET /health",
      auth: {
        register: "POST /api/auth/register",
        login: "POST /api/auth/login",
        me: "GET /api/auth/me",
      },
      chat: {
        getRooms: "GET /api/chat/rooms",
        createRoom: "POST /api/chat/rooms",
        getRoomMessages: "GET /api/chat/rooms/:roomId/messages",
        getStats: "GET /api/chat/stats",
      },
      users: {
        getProfile: "GET /api/users/:id",
        search: "GET /api/users/search",
        getChatHistory: "GET /api/users/:id/chat-history",
      },
      admin: {
        listUsers: "GET /api/admin/users",
        createUser: "POST /api/admin/users",
        updateUser: "PUT /api/admin/users/:id",
        deleteUser: "DELETE /api/admin/users/:id",
      },
      files: {
        usersDb: "GET /users_db.json",
        uploads: "GET /uploads/:filename",
      },
    },
  });
});

// Health check
app.get("/health", (_req: Request, res: Response) => {
  res.status(200).json({ status: "ok" });
});

// ========== AUTH ROUTES ==========
const authRouter = express.Router();

authRouter.post(
  "/register",
  authLimiter,
  async (req: Request, res: Response, next) => {
    try {
      await AuthController.register(req as AuthRequest, res);
    } catch (error) {
      next(error);
    }
  }
);

authRouter.post(
  "/login",
  authLimiter,
  async (req: Request, res: Response, next) => {
    try {
      await AuthController.login(req as AuthRequest, res);
    } catch (error) {
      next(error);
    }
  }
);

authRouter.get(
  "/me",
  authMiddleware,
  async (req: AuthRequest, res: Response, next) => {
    try {
      await AuthController.me(req, res);
    } catch (error) {
      next(error);
    }
  }
);

app.use("/api/auth", authRouter);

// ========== USER ROUTES ==========
const userRouter = express.Router();

userRouter.use(authMiddleware);

userRouter.get("/", async (req: AuthRequest, res: Response, next) => {
  try {
    await UserController.getAllUsers(req, res);
  } catch (error) {
    next(error);
  }
});

userRouter.get("/search", async (req: AuthRequest, res: Response, next) => {
  try {
    await UserController.searchUsers(req, res);
  } catch (error) {
    next(error);
  }
});

app.use("/api/users", userRouter);

// ========== CHAT ROUTES ==========
const chatRouter = express.Router();

chatRouter.use(authMiddleware);

chatRouter.get("/rooms", async (req: AuthRequest, res: Response, next) => {
  try {
    await ChatController.getRooms(req, res);
  } catch (error) {
    next(error);
  }
});

chatRouter.get(
  "/rooms/:roomId/messages",
  async (req: AuthRequest, res: Response, next) => {
    try {
      await ChatController.getRoomMessages(req, res);
    } catch (error) {
      next(error);
    }
  }
);

chatRouter.get("/stats", async (req: AuthRequest, res: Response, next) => {
  try {
    await ChatController.getStats(req, res);
  } catch (error) {
    next(error);
  }
});

chatRouter.get("/online-users", async (req: AuthRequest, res: Response, next) => {
  try {
    await ChatController.getOnlineUsers(req, res);
  } catch (error) {
    next(error);
  }
});

chatRouter.post(
  "/rooms",
  async (req: AuthRequest, res: Response, next) => {
    try {
      await ChatController.createRoom(req, res);
    } catch (error) {
      next(error);
    }
  }
);

app.use("/api/chat", chatRouter);

// ========== IMAGE ROUTES ==========
const upload = multer({ storage: multer.memoryStorage() });
const imageRouter = express.Router();

imageRouter.post(
  "/upload",
  uploadLimiter,
  authMiddleware,
  upload.single("image"),
  async (req: AuthRequest, res: Response, next) => {
    try {
      await ImageController.uploadImage(req, res);
    } catch (error) {
      next(error);
    }
  }
);

imageRouter.get("/:filename",
  (req, res, next) => {
    if (req.query.token && typeof req.query.token === 'string') {
      req.headers.authorization = `Bearer ${req.query.token}`;
    }
    authMiddleware(req as AuthRequest, res, next);
  },
  async (req: AuthRequest, res: Response, next) => {
    try {
      await ImageController.getImage(req, res);
    } catch (error) {
      next(error);
    }
  }
);

app.use("/api/images", imageRouter);

// ========== ADMIN ROUTES ==========
const adminRouter = express.Router();
adminRouter.use(adminMiddleware);

adminRouter.get('/users', async (req, res, next) => {
  try {
    await AdminController.listUsers(req, res);
  } catch (error) { next(error) }
});

adminRouter.post('/users', async (req, res, next) => {
  try {
    await AdminController.createUser(req, res);
  } catch (error) { next(error) }
});

adminRouter.put('/users/:id', async (req, res, next) => {
  try { await AdminController.updateUser(req, res) } catch (error){ next(error) }
})

adminRouter.delete('/users/:id', async (req, res, next) => {
  try { await AdminController.deleteUser(req, res) } catch (error) { next(error) }
})

app.use('/api/admin', adminRouter);

// Serve persisted users file directly for frontend
app.get('/users_db.json', async (_req, res, next) => {
  try {
    const fs = await import('fs/promises');
    const path = require('path');
    const filePath = path.join(process.cwd(), 'users_db.json');
    const data = await fs.readFile(filePath, 'utf-8');
    res.setHeader('Content-Type', 'application/json');
    res.send(data);
  } catch (err) {
    next(err);
  }
});

// ========== ERROR HANDLING ==========

// 404 handler (must be after all other routes)
app.use(notFoundHandler);

// Global error handler (must be last)
app.use(errorHandler);

// ========== INITIALIZATION ==========

// Ensure upload directory exists
ImageService.ensureUploadDir().catch(console.error);

export default app;
