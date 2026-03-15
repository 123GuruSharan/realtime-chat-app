# Real-Time Chat App

A mini WhatsApp-style chat application built with Node.js, Express, Socket.io, and MongoDB.

## Features

- **Real-time messaging** – Send and receive messages instantly via WebSockets
- **Multiple rooms** – General, Coding, Gaming
- **Online users** – See who is currently in your room
- **Typing indicator** – "Username is typing..." when someone is typing
- **Message history** – Previous messages loaded from MongoDB when you join a room
- **Modern UI** – Dark theme, rounded corners, responsive layout

## Prerequisites

- **Node.js** (v18 or later recommended)
- **MongoDB** running locally on `mongodb://127.0.0.1:27017` or set `MONGODB_URI` for a different URL (e.g. MongoDB Atlas)

## How to Run

1. **Install dependencies**

   ```bash
   npm install express socket.io mongoose
   ```

2. **Start the server**

   ```bash
   node server.js
   ```

3. **Open in browser**

   Go to: **http://localhost:3000**

4. **Test with multiple users**

   Open the same URL in different browser tabs (or different browsers). Enter different usernames, pick a room, and chat in real time.

## Project Structure

```
chat-app
├── server.js          # Express + Socket.io + MongoDB
├── package.json
├── README.md
└── public
    ├── index.html     # Login + chat UI
    ├── style.css      # Styles
    └── script.js      # Socket.io client + UI logic
```

## Message Format

Messages are displayed as:

**Username [10:45 PM]: Message text**

Example: **Guru [10:45 PM]: Hello everyone**

## Environment

- **Port:** 3000 (default)
- **MongoDB:** `mongodb://127.0.0.1:27017/chat-app` (override with `MONGODB_URI`)

## Database Schema

Messages are stored in MongoDB with this structure:

```js
{
  username: String,
  room: String,
  message: String,
  time: String
}
```
