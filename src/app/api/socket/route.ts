import { Server } from "socket.io";
import { NextResponse } from "next/server";

export const dynamic = 'force-dynamic';

const ioHandler = (req: Request) => {
  console.log("[API Socket] Route hit! Method:", req.method);

  if (!(global as any).io) {io.on("connection", (socket) => {
  console.log("[Socket] === NEW CONNECTION SUCCESS === ID:", socket.id);
  console.log("[Socket] Address:", socket.handshake.address);
  console.log("[Socket] Origin:", socket.handshake.headers.origin);

  // Send test message to client
  socket.emit("test", "Hello from server!");

  socket.on("join-room", (roomId, username) => {
    console.log("[Socket] Join request from", username, "for room", roomId);
    socket.join(roomId);
    console.log("[Socket] Join success:", username, "in room", roomId);

    socket.to(roomId).emit("user-joined", { id: socket.id, username });
    socket.emit("status", `Joined room ${roomId} as ${username}`);
  });

  socket.on("disconnect", (reason) => {
    console.log("[Socket] Disconnect:", socket.id, "Reason:", reason);
  });

  // Keep-alive ping/pong
  socket.on("pong", () => {
    console.log("[Socket] Pong received from", socket.id);
  });
});
    console.log("[Socket.io] Initializing server...");

    const io = new Server({
      path: "/socket.io",  // default sub-path
      addTrailingSlash: false,
      cors: {
        origin: "http://localhost:3000",
        methods: ["GET", "POST"],
        credentials: true,
      },
    });

    io.on("connection", (socket) => {
      console.log("[Socket] === NEW CONNECTION SUCCESS ===");
      console.log("[Socket] ID:", socket.id);
      console.log("[Socket] Address:", socket.handshake.address);
      console.log("[Socket] Origin:", socket.handshake.headers.origin);

      socket.on("join-room", (roomId: string, username: string) => {
        console.log("[Socket] Join request from", username, "for room", roomId);
        socket.join(roomId);
        console.log("[Socket] Join success:", username, "in room", roomId);

        socket.to(roomId).emit("user-joined", { id: socket.id, username });
        socket.emit("status", `Joined room ${roomId} as ${username}`);
      });

      socket.on("disconnect", (reason) => {
        console.log("[Socket] Disconnect:", socket.id, "Reason:", reason);
      });

      socket.emit("test", "Hello from server!");
    });

    (global as any).io = io;
  }

  return NextResponse.json({ success: true });
};

export { ioHandler as GET, ioHandler as POST };