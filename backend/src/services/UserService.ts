import { User, AuthPayload } from "../types/index.js";
import { generateId, hashPassword, verifyPassword } from "../utils/helpers.js";
import fs from "fs/promises";
import path from "path";
import {
  ValidationError,
  ConflictError,
  AuthenticationError,
} from "../utils/errors.js";
import { NotFoundError } from "../utils/errors.js";
import { isValidEmail, isValidPassword } from "../utils/helpers.js";

/**
 * In-memory user storage (ephemeral)
 * In production, this would be a database
 */
const users = new Map<string, User>();

// Load persisted users from file if exists, otherwise seed default users
const usersFile = path.join(process.cwd(), "users_db.json");

async function loadUsersFromFile() {
  try {
    const data = await fs.readFile(usersFile, "utf-8");
    const parsed: any[] = JSON.parse(data);
    for (const u of parsed) {
      users.set(u.id, {
        ...u,
        createdAt: new Date(u.createdAt),
      });
    }
  } catch (err) {
    // If file not found, create up to 10 default users with 4-digit random IDs
    const desired = 10
    const existingCount = users.size
    const toCreate = Math.max(0, desired - existingCount)

    const generated = new Set<string>()
    while (generated.size < toCreate) {
      const idNum = Math.floor(Math.random() * 9000) + 1000 // 1000-9999
      const id = idNum.toString()
      if (users.has(id) || generated.has(id)) continue
      generated.add(id)
    }

    for (const id of generated) {
      const username = `user${id}`
      const email = `${username}@example.com`
      const password = `${id}-9`
      const user: User = {
        id,
        username,
        email,
        passwordHash: await hashPassword(password),
        createdAt: new Date(),
      }
      users.set(id, user)
    }

    // Persist generated users
    await persistUsersToFile();
  }
}

async function persistUsersToFile() {
  try {
    const arr = Array.from(users.values()).map((u) => ({
      ...u,
      createdAt: u.createdAt.toISOString(),
    }));
    await fs.writeFile(usersFile, JSON.stringify(arr, null, 2), "utf-8");
  } catch (err) {
    console.error("Failed to persist users to file:", err);
  }
}

(async () => {
  await loadUsersFromFile();
})();

export class UserService {
  /**
   * Register a new user
   */
  static async registerUser(
    username: string,
    email: string,
    password: string
  ): Promise<User> {
    // Validation
    if (!username || username.trim().length < 3) {
      throw new ValidationError("Username must be at least 3 characters");
    }

    if (!isValidEmail(email)) {
      throw new ValidationError("Invalid email format");
    }

    if (!isValidPassword(password)) {
      throw new ValidationError("Password must be at least 8 characters");
    }

    // Check if user exists
    const existingUser = Array.from(users.values()).find(
      (u) => u.email === email || u.username === username
    );
    if (existingUser) {
      throw new ConflictError("User with this email or username already exists");
    }

    // Create new user
    const userId = generateId();
    const passwordHash = await hashPassword(password);

    const newUser: User = {
      id: userId,
      username: username.toLowerCase(),
      email: email.toLowerCase(),
      passwordHash,
      createdAt: new Date(),
    };

    users.set(userId, newUser);
    // persist
    await persistUsersToFile();
    return newUser;
  }

  /**
   * Update an existing user (username, email, password)
   */
  static async updateUser(
    userId: string,
    data: { username?: string; email?: string; password?: string }
  ): Promise<User> {
    const user = users.get(userId);
    if (!user) throw new NotFoundError("User not found");

    if (data.username) {
      user.username = data.username.toLowerCase();
    }

    if (data.email) {
      if (!isValidEmail(data.email)) throw new ValidationError("Invalid email format");
      user.email = data.email.toLowerCase();
    }

    if (data.password) {
      if (!isValidPassword(data.password)) throw new ValidationError("Password must be at least 8 characters");
      user.passwordHash = await hashPassword(data.password);
    }

    users.set(userId, user);
    await persistUsersToFile();
    return user;
  }

  /**
   * Delete a user by ID
   */
  static async deleteUser(userId: string): Promise<boolean> {
    const existed = users.delete(userId);
    if (existed) {
      await persistUsersToFile();
    }
    return existed;
  }

  /**
   * Login user and return auth payload
   */
  static async loginUser(
    email: string,
    password: string
  ): Promise<AuthPayload> {
    // Find user by email
    const user = Array.from(users.values()).find(
      (u) => u.email === email.toLowerCase()
    );

    if (!user) {
      throw new AuthenticationError("Invalid email or password");
    }

    // Verify password
    const isPasswordValid = await verifyPassword(password, user.passwordHash);
    if (!isPasswordValid) {
      throw new AuthenticationError("Invalid email or password");
    }

    return {
      userId: user.id,
      username: user.username,
      email: user.email,
    };
  }

  /**
   * Get user by ID
   */
  static getUserById(userId: string): User | undefined {
    return users.get(userId);
  }

  /**
   * Get all users (for chat room creation)
   */
  static getAllUsers(): User[] {
    return Array.from(users.values());
  }

  /**
   * Search users by username or email
   */
  static searchUsers(query: string): User[] {
    const lowerQuery = query.toLowerCase();
    return Array.from(users.values()).filter(
      (u) =>
        u.username.includes(lowerQuery) || u.email.includes(lowerQuery)
    );
  }
}
