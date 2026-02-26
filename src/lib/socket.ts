import { io } from "socket.io-client";

export const socket = io("http://localhost:3000", {
  path: "/socket.io",
  autoConnect: false,
  transports: ["websocket"],  // force WebSocket only (skip polling)
  reconnection: true,
  reconnectionAttempts: 10,
  reconnectionDelay: 1000,
  pingTimeout: 60000,  // longer timeout to avoid early close
  pingInterval: 25000,
});

socket.on("connect", () => {
  console.log("[Socket Client] Connected! ID:", socket.id);
});

socket.on("connect_error", (err) => {
  console.log("[Socket Client] Connect error:", err.message, err.description);
});

socket.on("disconnect", (reason) => {
  console.log("[Socket Client] Disconnected:", reason);
});

socket.on("test", (msg) => {
  console.log("[Socket Client] Test from server:", msg);
});