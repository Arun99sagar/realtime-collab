"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { socket } from "@/lib/socket";

function generateRoomId() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

type JoinState = "idle" | "waiting" | "denied" | "kicked";

export default function HomePage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [roomId, setRoomId] = useState("");
  const [error, setError] = useState("");
  const [joinState, setJoinState] = useState<JoinState>("idle");
  const [waitingRoomId, setWaitingRoomId] = useState("");

  // Check if we were kicked
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (params.get("kicked") === "1") {
        setJoinState("kicked");
        window.history.replaceState({}, "", "/");
      }
    }
  }, []);

  // Listen for join approval/denial
  useEffect(() => {
    const onApproved = ({ roomId: approvedRoom }: { roomId: string }) => {
      router.push(`/room/${approvedRoom}?username=${encodeURIComponent(username.trim())}`);
    };
    const onDenied = () => {
      setJoinState("denied");
      socket.disconnect();
    };

    socket.on("join-approved", onApproved);
    socket.on("join-denied", onDenied);
    return () => {
      socket.off("join-approved", onApproved);
      socket.off("join-denied", onDenied);
    };
  }, [router, username]);

  const handleCreateRoom = () => {
    if (!username.trim()) { setError("Please enter your name."); return; }
    const newRoomId = generateRoomId();
    router.push(`/room/${newRoomId}?username=${encodeURIComponent(username.trim())}`);
  };

  const handleJoinRoom = () => {
    if (!username.trim()) { setError("Please enter your name."); return; }
    if (!roomId.trim()) { setError("Please enter a Room ID."); return; }
    const targetRoom = roomId.trim().toUpperCase();
    setWaitingRoomId(targetRoom);
    setJoinState("waiting");
    setError("");
    // Connect and send join request (server will forward to host)
    socket.connect();
    socket.emit("join-request", { roomId: targetRoom, username: username.trim() });
  };

  const cancelJoin = () => {
    socket.disconnect();
    setJoinState("idle");
  };

  // ── Waiting for approval screen ──────────────────────────────────
  if (joinState === "waiting") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center px-4">
        <div className="text-center max-w-sm">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-amber-100 mb-6">
            <svg className="w-10 h-10 text-amber-500 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Waiting for approval</h2>
          <p className="text-gray-500 mb-1">The host of room</p>
          <p className="text-indigo-600 font-mono font-bold text-lg mb-4">{waitingRoomId}</p>
          <p className="text-gray-500 text-sm mb-8">needs to approve your request before you can enter.</p>
          <div className="flex justify-center mb-6">
            <div className="flex gap-1.5">
              {[0, 1, 2].map((i) => (
                <span key={i} className="w-2.5 h-2.5 rounded-full bg-indigo-400 animate-bounce"
                  style={{ animationDelay: `${i * 0.15}s` }} />
              ))}
            </div>
          </div>
          <button
            onClick={cancelJoin}
            className="text-sm text-gray-400 hover:text-gray-600 underline transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

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
          {/* Kicked / denied banners */}
          {joinState === "kicked" && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 text-sm font-medium px-4 py-3 rounded-xl">
              <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
              </svg>
              You were removed from the room by the host.
            </div>
          )}
          {joinState === "denied" && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 text-sm font-medium px-4 py-3 rounded-xl">
              <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Your join request was denied by the host.
            </div>
          )}

          {/* Username */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Your Name</label>
            <input
              type="text"
              placeholder="e.g. Alice"
              value={username}
              onChange={(e) => { setUsername(e.target.value); setError(""); setJoinState("idle"); }}
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
              onChange={(e) => { setRoomId(e.target.value); setError(""); setJoinState("idle"); }}
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
          {error && <p className="text-sm text-red-500 text-center">{error}</p>}
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-gray-400 mt-6">
          Whiteboard · Code Editor · Live Chat
        </p>
      </div>
    </div>
  );
}