"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

function generateRoomId() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

export default function HomePage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [roomId, setRoomId] = useState("");
  const [error, setError] = useState("");

  const handleCreateRoom = () => {
    if (!username.trim()) {
      setError("Please enter your name.");
      return;
    }
    const newRoomId = generateRoomId();
    router.push(`/room/${newRoomId}?username=${encodeURIComponent(username.trim())}`);
  };

  const handleJoinRoom = () => {
    if (!username.trim()) {
      setError("Please enter your name.");
      return;
    }
    if (!roomId.trim()) {
      setError("Please enter a Room ID.");
      return;
    }
    router.push(`/room/${roomId.trim().toUpperCase()}?username=${encodeURIComponent(username.trim())}`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Logo / Title */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-indigo-600 shadow-lg mb-4">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-gray-900">Realtime Collab</h1>
          <p className="text-gray-500 mt-2">Draw, code, and chat together — in real time.</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8 space-y-6">
          {/* Username */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Your Name
            </label>
            <input
              type="text"
              placeholder="e.g. Alice"
              value={username}
              onChange={(e) => { setUsername(e.target.value); setError(""); }}
              onKeyDown={(e) => e.key === "Enter" && handleCreateRoom()}
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent transition text-gray-900 placeholder-gray-400"
            />
          </div>

          {/* Create Room */}
          <button
            onClick={handleCreateRoom}
            className="w-full py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] text-white font-semibold text-sm transition-all shadow-md shadow-indigo-200"
          >
            ✦ Create New Room
          </button>

          {/* Divider */}
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-gray-200" />
            <span className="text-xs text-gray-400 font-medium">or join existing</span>
            <div className="flex-1 h-px bg-gray-200" />
          </div>

          {/* Join Room */}
          <div className="space-y-3">
            <input
              type="text"
              placeholder="Room ID (e.g. AB12CD)"
              value={roomId}
              onChange={(e) => { setRoomId(e.target.value); setError(""); }}
              onKeyDown={(e) => e.key === "Enter" && handleJoinRoom()}
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent transition text-gray-900 placeholder-gray-400 font-mono tracking-wider uppercase"
            />
            <button
              onClick={handleJoinRoom}
              className="w-full py-3 px-4 rounded-xl bg-gray-900 hover:bg-gray-700 active:scale-[0.98] text-white font-semibold text-sm transition-all"
            >
              Join Room →
            </button>
          </div>

          {/* Error */}
          {error && (
            <p className="text-sm text-red-500 text-center">{error}</p>
          )}
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-gray-400 mt-6">
          Whiteboard · Code Editor · Live Chat
        </p>
      </div>
    </div>
  );
}