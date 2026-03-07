const { createServer } = require('http');
const { Server } = require("socket.io");
const next = require('next');

const port = parseInt(process.env.PORT || '3000', 10);
const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev });
const handle = app.getRequestHandler();

// Track users per room: { roomId: [{ id, username }] }
const roomUsers = {};

app.prepare().then(() => {
  const httpServer = createServer(handle);

  const io = new Server(httpServer, {
    path: "/socket.io",
    addTrailingSlash: false,
  });

  io.on("connection", (socket) => {
    console.log("[Socket] New connection:", socket.id);

    let currentRoom = null;
    let currentUsername = null;

    socket.on("join-room", (roomId, username) => {
      socket.join(roomId);
      currentRoom = roomId;
      currentUsername = username;

      // Track user in room
      if (!roomUsers[roomId]) roomUsers[roomId] = [];
      // Remove any existing entry for this socket (reconnect case)
      roomUsers[roomId] = roomUsers[roomId].filter(u => u.id !== socket.id);
      roomUsers[roomId].push({ id: socket.id, username });

      console.log(`[Socket] ${username} joined room ${roomId} (${roomUsers[roomId].length} users)`);

      // Notify others that a new user joined
      socket.to(roomId).emit("user-joined", { id: socket.id, username });

      // Send the full user list to the joining user
      socket.emit("room-users", roomUsers[roomId]);

      // Send status to the joining user
      socket.emit("status", `Joined room ${roomId} as ${username}`);
    });

    // Drawing sync: relay tldraw store changes to other users in the room
    socket.on("drawing-update", ({ roomId, changes }) => {
      socket.to(roomId).emit("drawing-update", changes);
    });

    // Code editor sync: relay code changes to other users in the room
    socket.on("code-change", ({ roomId, code, language }) => {
      socket.to(roomId).emit("code-change", { code, language });
    });

    // Chat: relay chat messages to all users in the room (including sender)
    socket.on("chat-message", ({ roomId, username, text }) => {
      const message = {
        id: `${socket.id}-${Date.now()}`,
        username,
        text,
        timestamp: Date.now(),
      };
      io.to(roomId).emit("chat-message", message);
    });

    socket.on("disconnect", (reason) => {
      console.log("[Socket] Disconnected:", socket.id, reason);

      // Clean up user from room tracking
      if (currentRoom && roomUsers[currentRoom]) {
        roomUsers[currentRoom] = roomUsers[currentRoom].filter(u => u.id !== socket.id);

        // Notify remaining users
        socket.to(currentRoom).emit("user-left", { id: socket.id, username: currentUsername });

        // Clean up empty rooms
        if (roomUsers[currentRoom].length === 0) {
          delete roomUsers[currentRoom];
        }
      }
    });
  });

  httpServer.listen(port, () => {
    console.log(`> Ready on http://localhost:${port}`);
  });
});