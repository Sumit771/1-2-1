# Ephemeral Chat Frontend

React + TypeScript Vite app for the ephemeral 1:1 chat.

## Setup

```bash
cd frontend
npm install
npm run dev
```

Default API URL can be set via `VITE_API_URL` env.

Frontend stores auth token in-memory only (AuthContext); not persisted to localStorage to meet ephemeral constraints.

Image upload compresses before upload using `browser-image-compression` and uploads to `/api/images/upload`.
