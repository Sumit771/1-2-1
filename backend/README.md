# Ephemeral Chat Backend

Production-ready real-time ephemeral 1-to-1 chat server built with Node.js, Express, TypeScript, and Socket.io.

## Features

- **Real-time Communication**: Socket.io for instant message delivery
- **Ephemeral Storage**: Messages stored in-memory only, auto-deleted after TTL
- **Authentication**: JWT-based auth with bcrypt password hashing
- **Image Support**: Compressed image uploads with automatic optimization
- **Security**: Helmet, CORS, rate limiting, input validation
- **Online Status**: User tracking, online/offline indicators
- **Typing Indicators**: Real-time typing status
- **Message Status**: Sent, delivered, seen tracking
- **Production Ready**: Async/await, TypeScript, error handling, monitoring

## Tech Stack

- **Runtime**: Node.js 18+
- **Language**: TypeScript
- **Framework**: Express.js
- **Real-time**: Socket.io
- **Image Processing**: Sharp
- **Authentication**: JWT, bcryptjs
- **Security**: Helmet, express-rate-limit, CORS
- **Upload**: Multer (memory storage)

## Installation

```bash
cd backend
npm install
```

## Configuration

Copy `.env.example` to `.env` and adjust values:

```bash
cp .env.example .env
```

Key environment variables:

```env
PORT=3000
NODE_ENV=development
JWT_SECRET=your-super-secret-jwt-key-change-in-production-at-least-32-chars
JWT_EXPIRES_IN=24h
MESSAGE_TTL_MS=3600000  # 1 hour
IMAGE_TTL_MS=3600000     # 1 hour
MAX_IMAGE_SIZE=2097152   # 2MB
IMAGE_MAX_WIDTH=1280
IMAGE_MAX_HEIGHT=1280
IMAGE_QUALITY=80
UPLOAD_DIR=./uploads
```

## Running

**Development**:

```bash
npm run dev
```

**Build**:

```bash
npm run build
```

**Production**:

```bash
npm run start
```

## Project Structure

```
src/
  config/          # Configuration and environment setup
  controllers/     # Request handlers
  services/        # Business logic
  sockets/         # Socket.io event handlers
  middleware/      # Authentication, error handling, rate limiting
  utils/           # Helpers, JWT, error classes
  types/           # TypeScript interfaces
  app.ts          # Express app setup
  server.ts       # Server startup and cleanup jobs
```

## API Endpoints

### Authentication

- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user (protected)

### Users

- `GET /api/users` - Get all users (protected)
- `GET /api/users/search?q=query` - Search users (protected)

### Chat

- `GET /api/chat/rooms` - Get user's chat rooms (protected)
- `GET /api/chat/rooms/:roomId/messages` - Get room messages (protected)
- `GET /api/chat/stats` - Get server stats (protected)

### Images

- `POST /api/images/upload` - Upload image (protected)
- `GET /api/images/:filename` - Get image file (protected)

## Socket.io Events

### Connection

- Authenticate with JWT token in `socket.io.auth.token`

### Message Events

- `message:send` - Send message to room
- `message:status` - Update message status (sent/delivered/seen)
- `message:new` - Receive new message (broadcast)
- `message:statusUpdated` - Message status updated (broadcast)

### Room Events

- `room:join` - Join a chat room
- `room:leave` - Leave a chat room
- `user:joined` - User joined room (broadcast)
- `user:left` - User left room (broadcast)

### User Events

- `user:online` - User came online (broadcast)
- `user:offline` - User went offline (broadcast)

### Typing Events

- `typing:start` - User started typing
- `typing:stop` - User stopped typing
- `typing:indicator` - Receive typing indicator (broadcast)

## Authentication

All protected endpoints require:

```
Authorization: Bearer <JWT_TOKEN>
```

Tokens are obtained via login/register and expire after `JWT_EXPIRES_IN`.

## Demo Users

Pre-seeded users for testing:

- Email: `alice@example.com` / Password: `password123`
- Email: `bob@example.com` / Password: `password123`

## Security Features

- **Rate Limiting**: 5 requests/sec per IP (general), 3/min for auth
- **Input Validation**: All inputs validated and sanitized
- **JWT Verification**: All protected routes verify JWT tokens
- **Helmet**: Security headers via Helmet middleware
- **CORS**: Restricted origin access
- **Password Hashing**: bcryptjs with 10 rounds
- **File Upload Security**: Filename sanitization, mime type validation, size limits
- **Directory Traversal Prevention**: Path normalization and validation

## Image Processing

Images are automatically:

1. **Validated**: Size check (max 2MB), MIME type check
2. **Optimized**: Resized to max 1280x1280, converted to WebP
3. **Quality Reduced**: Set to 80% quality
4. **TTL Tracked**: Automatically deleted after 1 hour
5. **Served Securely**: Via protected route with filename validation

## Cleanup Jobs

Runs every 5 minutes:

- Deletes expired image files based on modification time
- Logs server statistics (active chats, online users)

## Ephemeral Storage

- Messages stored in `Map<roomId, ChatRoom>` (in-memory)
- When both users disconnect from a room, room is deleted
- When server restarts, all messages are lost
- Each message has configurable TTL (default 1 hour)

## Error Handling

Proper error classes for different scenarios:

- `ValidationError` (400)
- `AuthenticationError` (401)
- `AuthorizationError` (403)
- `NotFoundError` (404)
- `ConflictError` (409)
- `InternalServerError` (500)

## Monitoring

Access `/api/chat/stats` to get:

- Active chat count
- Online user count

## Production Deployment

1. Set `NODE_ENV=production`
2. Change `JWT_SECRET` to a strong random string (32+ chars)
3. Set appropriate TTLs based on requirements
4. Configure `CORS_ORIGIN` to your frontend domain
5. Use process manager (PM2) or Docker
6. Set up monitoring and logging
7. Configure firewall and reverse proxy
8. Use HTTPS in production

## Performance Considerations

- Memory usage scales with active users and messages
- Each message stored in RAM (~500 bytes)
- 10,000 concurrent users × 100 active chats × 50 messages = ~250MB
- Image files temporarily stored on disk during TTL
- Socket.io uses WebSocket when available, falls back to polling

## License

ISC
