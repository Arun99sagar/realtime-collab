"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { use } from "react";  // ← this is the key import
import { socket } from "@/lib/socket";

export default function RoomPage({ params }: { params: Promise<{ roomId: string }> }) {
  // Unwrap the params Promise (fixes the error)
  const { roomId } = use(params);

  const searchParams = useSearchParams();
  const username = searchParams.get("username") || "Anonymous";

  const [status, setStatus] = useState("Connecting to room...");

  useEffect(() => {
    if (!roomId) {
      setStatus("Invalid room");
      return;
    }

    console.log(`[Room Client] Connecting as "${username}" to room "${roomId}"`);

    socket.connect();

    socket.emit("join-room", roomId, username);

    socket.on("status", (msg: string) => {
      setStatus(msg);
    });

    socket.on("user-joined", (data: { id: string; username: string }) => {
      console.log(`[Room] ${data.username} just joined the room!`);
    });

    return () => {
      socket.disconnect();
    };
  }, [roomId, username]);

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <header className="bg-white border-b shadow-sm px-6 py-4">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <h1 className="text-2xl font-bold">
            Room: <span className="text-indigo-600 font-mono">{roomId}</span>
          </h1>
          <div className="flex items-center gap-6">
            <span className="text-gray-700">
              Welcome, <strong>{username}</strong>
            </span>
            <span className="text-sm font-medium px-3 py-1 rounded-full bg-green-100 text-green-800">
              {status}
            </span>
          </div>
        </div>
      </header>

      <main className="flex-1 p-6">
        <div className="max-w-7xl mx-auto bg-white rounded-xl shadow p-8">
          <h2 className="text-xl font-semibold mb-4">Room Dashboard</h2>
          <p className="text-gray-600 mb-6">
            Collab space ready. Whiteboard & code editor coming soon.
          </p>

          <div className="bg-green-50 border border-green-200 rounded-lg p-6">
            <h3 className="font-medium mb-2">Connection Status</h3>
            <p className="text-green-800">Status: {status}</p>
            <p className="text-sm text-green-600 mt-2">
              Open another tab → join same room code → watch terminal logs!
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}