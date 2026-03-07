import { io } from "socket.io-client";

const SOCKET_URL =
  typeof window !== "undefined"
    ? window.location.origin
    : "http://localhost:3000";

export const socket = io(SOCKET_URL, {
  path: "/socket.io",
  autoConnect: false,
  transports: ["websocket"],
  reconnection: true,
  reconnectionAttempts: 10,
  reconnectionDelay: 1000,
  timeout: 60000,
});

socket.on("connect", () => {
  console.log("[Socket Client] Connected! ID:", socket.id);
});

socket.on("connect_error", (err) => {
  console.log("[Socket Client] Connect error:", err.message, (err as any).description);
});

socket.on("disconnect", (reason) => {
  console.log("[Socket Client] Disconnected:", reason);
});