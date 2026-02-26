const { createServer } = require('http');
const { Server } = require("socket.io");
const next = require('next');

const port = parseInt(process.env.PORT || '3000', 10);
const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const httpServer = createServer(handle);

  const io = new Server(httpServer, {
    path: "/socket.io",
    addTrailingSlash: false,
  });

  io.on("connection", (socket) => {
    console.log("[Socket] New connection:", socket.id);

    socket.on("join-room", (roomId, username) => {
      socket.join(roomId);
      console.log(`[Socket] ${username} joined room ${roomId}`);

      socket.to(roomId).emit("user-joined", { id: socket.id, username });
      socket.emit("status", `Joined room ${roomId} as ${username}`);
    });

    socket.on("disconnect", (reason) => {
      console.log("[Socket] Disconnected:", socket.id, reason);
    });
  });

  httpServer.listen(port, () => {
    console.log(`> Ready on http://localhost:${port}`);
  });
});