const { createServer } = require('http');
const { Server } = require("socket.io");
const next = require('next');

const port = parseInt(process.env.PORT || '3000', 10);
const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev });
const handle = app.getRequestHandler();

// { roomId: [{ id, username }] }
const roomUsers = {};
// { roomId: socketId } – first joiner is host
const roomHosts = {};
// { roomId: boolean } – whiteboard lock state
const roomLocked = {};
// { roomId: boolean } – code editor lock state
const roomCodeLocked = {};
// { roomId: boolean } – chat lock state
const roomChatLocked = {};
// { roomId: [{ socketId, username }] } – pending join requests
const pendingRequests = {};

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

    // ── Join Room ──────────────────────────────────────────────────
    socket.on("join-room", (roomId, username) => {
      socket.join(roomId);
      currentRoom = roomId;
      currentUsername = username;

      // Track user
      if (!roomUsers[roomId]) roomUsers[roomId] = [];
      roomUsers[roomId] = roomUsers[roomId].filter(u => u.id !== socket.id);
      roomUsers[roomId].push({ id: socket.id, username });

      // First joiner becomes host
      if (!roomHosts[roomId]) {
        roomHosts[roomId] = socket.id;
        roomLocked[roomId] = false;
        roomCodeLocked[roomId] = false;
        roomChatLocked[roomId] = false;
        pendingRequests[roomId] = [];
      }

      const isHost = roomHosts[roomId] === socket.id;

      console.log(`[Socket] ${username} joined room ${roomId} (${roomUsers[roomId].length} users) host=${isHost}`);

      // Tell the joiner if they're the host
      if (isHost) {
        socket.emit("you-are-host");
      }

      // Notify others
      socket.to(roomId).emit("user-joined", { id: socket.id, username });

      // Send full user list + lock state to the joining user
      socket.emit("room-users", roomUsers[roomId]);
      socket.emit("whiteboard-lock-changed", roomLocked[roomId]);
      socket.emit("code-lock-changed", roomCodeLocked[roomId]);
      socket.emit("chat-lock-changed", roomChatLocked[roomId]);

      // Broadcast updated host info to everyone
      io.to(roomId).emit("host-info", { hostId: roomHosts[roomId] });

      // Status
      socket.emit("status", `Joined room ${roomId} as ${username}`);
    });

    // ── Join Request (non-host asks to join) ───────────────────────
    socket.on("join-request", ({ roomId, username }) => {
      const hostId = roomHosts[roomId];
      if (!hostId) {
        // No host yet → auto-approve (room is empty)
        socket.emit("join-approved", { roomId });
        return;
      }
      if (!pendingRequests[roomId]) pendingRequests[roomId] = [];
      // Avoid duplicate requests
      if (!pendingRequests[roomId].find(r => r.socketId === socket.id)) {
        pendingRequests[roomId].push({ socketId: socket.id, username });
      }
      // Forward to host
      io.to(hostId).emit("join-request", { socketId: socket.id, username });
      console.log(`[Socket] Join request from ${username} to host in room ${roomId}`);
    });

    // ── Join Response (host approves or denies) ───────────────────
    socket.on("join-response", ({ roomId, socketId, approved }) => {
      if (roomHosts[roomId] !== socket.id) return; // only host can respond
      // Remove from pending
      if (pendingRequests[roomId]) {
        pendingRequests[roomId] = pendingRequests[roomId].filter(r => r.socketId !== socketId);
      }
      const target = io.sockets.sockets.get(socketId);
      if (!target) return;
      if (approved) {
        target.emit("join-approved", { roomId });
        console.log(`[Socket] Host approved ${socketId} for room ${roomId}`);
      } else {
        target.emit("join-denied");
        console.log(`[Socket] Host denied ${socketId} for room ${roomId}`);
      }
    });

    // ── Kick User ─────────────────────────────────────────────────
    socket.on("kick-user", ({ roomId, socketId }) => {
      if (roomHosts[roomId] !== socket.id) return; // only host
      const target = io.sockets.sockets.get(socketId);
      if (!target) return;
      target.emit("you-were-kicked");
      // Remove from tracking
      if (roomUsers[roomId]) {
        roomUsers[roomId] = roomUsers[roomId].filter(u => u.id !== socketId);
        io.to(roomId).emit("user-left", { id: socketId, username: "" });
        io.to(roomId).emit("room-users", roomUsers[roomId]);
      }
      target.leave(roomId);
      console.log(`[Socket] Host kicked ${socketId} from room ${roomId}`);
    });

    // ── Toggle Code Editor Lock ────────────────────────────────────
    socket.on("toggle-code-lock", ({ roomId }) => {
      if (roomHosts[roomId] !== socket.id) return;
      roomCodeLocked[roomId] = !roomCodeLocked[roomId];
      io.to(roomId).emit("code-lock-changed", roomCodeLocked[roomId]);
      console.log(`[Socket] Code lock=${roomCodeLocked[roomId]} in room ${roomId}`);
    });

    // ── Toggle Chat Lock ───────────────────────────────────────────
    socket.on("toggle-chat-lock", ({ roomId }) => {
      if (roomHosts[roomId] !== socket.id) return;
      roomChatLocked[roomId] = !roomChatLocked[roomId];
      io.to(roomId).emit("chat-lock-changed", roomChatLocked[roomId]);
      console.log(`[Socket] Chat lock=${roomChatLocked[roomId]} in room ${roomId}`);
    });

    // ── Toggle Whiteboard Lock ─────────────────────────────────────
    socket.on("toggle-whiteboard-lock", ({ roomId }) => {
      if (roomHosts[roomId] !== socket.id) return; // only host
      roomLocked[roomId] = !roomLocked[roomId];
      io.to(roomId).emit("whiteboard-lock-changed", roomLocked[roomId]);
      console.log(`[Socket] Whiteboard lock=${roomLocked[roomId]} in room ${roomId}`);
    });

    // ── Drawing sync ───────────────────────────────────────────────
    socket.on("drawing-update", ({ roomId, changes }) => {
      // Don't relay if whiteboard is locked (block non-host writes)
      if (roomLocked[roomId] && roomHosts[roomId] !== socket.id) return;
      socket.to(roomId).emit("drawing-update", changes);
    });

    // ── Code editor sync ───────────────────────────────────────────
    socket.on("code-change", ({ roomId, code, language }) => {
      socket.to(roomId).emit("code-change", { code, language });
    });

    // ── Chat ───────────────────────────────────────────────────────
    socket.on("chat-message", ({ roomId, username, text }) => {
      // Block non-host messages when chat is locked
      if (roomChatLocked[roomId] && roomHosts[roomId] !== socket.id) return;
      const message = {
        id: `${socket.id}-${Date.now()}`,
        username,
        text,
        timestamp: Date.now(),
      };
      io.to(roomId).emit("chat-message", message);
    });

    // ── Disconnect ─────────────────────────────────────────────────
    socket.on("disconnect", (reason) => {
      console.log("[Socket] Disconnected:", socket.id, reason);

      if (currentRoom && roomUsers[currentRoom]) {
        roomUsers[currentRoom] = roomUsers[currentRoom].filter(u => u.id !== socket.id);

        socket.to(currentRoom).emit("user-left", { id: socket.id, username: currentUsername });

        // Host migration: assign next user as host
        if (roomHosts[currentRoom] === socket.id) {
          if (roomUsers[currentRoom].length > 0) {
            const newHostId = roomUsers[currentRoom][0].id;
            roomHosts[currentRoom] = newHostId;
            io.to(newHostId).emit("you-are-host");
            io.to(currentRoom).emit("host-info", { hostId: newHostId });
            console.log(`[Socket] Host migrated to ${newHostId} in room ${currentRoom}`);
          } else {
            delete roomHosts[currentRoom];
            delete roomLocked[currentRoom];
            delete roomCodeLocked[currentRoom];
            delete roomChatLocked[currentRoom];
            delete pendingRequests[currentRoom];
          }
        }

        if (roomUsers[currentRoom].length === 0) {
          delete roomUsers[currentRoom];
        } else {
          io.to(currentRoom).emit("room-users", roomUsers[currentRoom]);
        }
      }
    });
  });

  httpServer.listen(port, () => {
    console.log(`> Ready on http://localhost:${port}`);
  });
});