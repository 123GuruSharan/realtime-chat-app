# Real-Time Chat (MERN + Socket.IO)

Production-oriented stack: **MongoDB**, **Express**, **React (Vite)**, **Node.js**, **Socket.IO**, **JWT** auth, **public/private rooms**, invite codes, rate limits.

## Environment

Copy `.env.example` to `.env` and set:

- `MONGODB_URI` – MongoDB connection string (required)
- `JWT_SECRET` – long random string (required in production)
- `JWT_EXPIRES_IN` – optional, default `7d`
- `PORT` – optional, default `3000`
- `CLIENT_ORIGIN` – optional CORS origin for Socket.IO (e.g. `http://localhost:5173` in dev)
- `MAX_ROOMS_PER_USER` – optional, default `5`

## Run (development)

Terminal 1 – API + Socket.IO + (optional) static build:

```bash
npm install
npm run build
npm start
```

Open `http://localhost:3000` after the client is built.

For **Vite HMR** + API on port 3000:

Terminal 1: `npm start`  
Terminal 2: `cd client && npm run dev` → open `http://localhost:5173` (Vite proxies `/api` and `/socket.io`).

## API (all under `/api`, JSON)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/auth/register` | No | Register |
| POST | `/auth/login` | No | Login |
| GET | `/auth/me` | Bearer | Current user |
| POST | `/create-room` | Bearer | Create room (public/private) |
| POST | `/join-room` | Bearer | Join by `roomId` (+ `inviteCode` for private) |
| GET | `/rooms` | Bearer | Public room list |
| GET | `/my-rooms` | Bearer | Rooms you belong to |
| POST | `/validate-invite` | No | Validate invite code |
| POST | `/rooms/:roomId/regenerate-invite` | Bearer | Regenerate private invite (creator only) |

## Socket.IO

- Handshake: `auth: { token: "<JWT>" }`
- Events: `joinRoom` `{ roomId }`, `chat-message` `{ roomId, message, time }`, `typing` / `stop-typing` `{ roomId }`
- Server verifies JWT and room membership before `socket.join(roomId)`.

## Project layout

```
server/
  index.js
  config/
  models/
  controllers/
  routes/
  middleware/
  socket/
client/          # React + Vite
```

Legacy static files under `public/` are unused; the app is served from `client/dist` when built.
