"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState, Suspense, use, type ReactNode } from "react";
import { socket } from "@/lib/socket";
import dynamic from "next/dynamic";
import UserPresence from "@/components/UserPresence";
import ChatPanel from "@/components/ChatPanel";

// Dynamic imports for heavy components (avoid SSR issues with canvas/monaco)
const Whiteboard = dynamic(() => import("@/components/Whiteboard"), {
  ssr: false,
  loading: () => (
    <div className="h-full flex items-center justify-center bg-gray-50">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-3 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        <span className="text-sm text-gray-500">Loading Whiteboard...</span>
      </div>
    </div>
  ),
});

const CodeEditor = dynamic(() => import("@/components/CodeEditor"), {
  ssr: false,
  loading: () => (
    <div className="h-full flex items-center justify-center bg-[#1e1e1e]">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-3 border-blue-400 border-t-transparent rounded-full animate-spin" />
        <span className="text-sm text-gray-400">Loading Code Editor...</span>
      </div>
    </div>
  ),
});

type Tab = "whiteboard" | "code" | "chat";

const TABS: { key: Tab; label: string; icon: ReactNode }[] = [
  {
    key: "whiteboard",
    label: "Whiteboard",
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
      </svg>
    ),
  },
  {
    key: "code",
    label: "Code Editor",
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
      </svg>
    ),
  },
  {
    key: "chat",
    label: "Chat",
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
      </svg>
    ),
  },
];

function RoomContent({ roomId }: { roomId: string }) {
  const searchParams = useSearchParams();
  const username = searchParams.get("username") || "Anonymous";

  const [activeTab, setActiveTab] = useState<Tab>("whiteboard");
  const [connectionState, setConnectionState] = useState<
    "connecting" | "connected" | "error"
  >("connecting");
  const [status, setStatus] = useState("Connecting...");

  useEffect(() => {
    if (!roomId) {
      setConnectionState("error");
      setStatus("Invalid room");
      return;
    }

    socket.connect();

    const onConnect = () => {
      socket.emit("join-room", roomId, username);
    };

    const onStatus = (msg: string) => {
      setStatus(msg);
      setConnectionState("connected");
    };

    const onConnectError = (err: Error) => {
      setConnectionState("error");
      setStatus(`Connection error: ${err.message}`);
    };

    const onDisconnect = () => {
      setConnectionState("connecting");
      setStatus("Reconnecting...");
    };

    socket.on("connect", onConnect);
    socket.on("status", onStatus);
    socket.on("connect_error", onConnectError);
    socket.on("disconnect", onDisconnect);

    // If already connected (hot reload), join immediately
    if (socket.connected) {
      socket.emit("join-room", roomId, username);
    }

    return () => {
      socket.off("connect", onConnect);
      socket.off("status", onStatus);
      socket.off("connect_error", onConnectError);
      socket.off("disconnect", onDisconnect);
      socket.disconnect();
    };
  }, [roomId, username]);

  const connectionBadge = () => {
    switch (connectionState) {
      case "connecting":
        return (
          <span className="flex items-center gap-1.5 text-xs font-medium px-3 py-1 rounded-full bg-yellow-100 text-yellow-800">
            <span className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse" />
            Connecting...
          </span>
        );
      case "connected":
        return (
          <span className="flex items-center gap-1.5 text-xs font-medium px-3 py-1 rounded-full bg-green-100 text-green-800">
            <span className="w-2 h-2 rounded-full bg-green-500" />
            Connected
          </span>
        );
      case "error":
        return (
          <span className="flex items-center gap-1.5 text-xs font-medium px-3 py-1 rounded-full bg-red-100 text-red-800">
            <span className="w-2 h-2 rounded-full bg-red-500" />
            Error
          </span>
        );
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b shadow-sm px-4 py-3 flex-shrink-0">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-4">
            <h1 className="text-lg font-bold">
              Room:{" "}
              <span className="text-indigo-600 font-mono">{roomId}</span>
            </h1>
            {connectionBadge()}
          </div>
          <div className="flex items-center gap-4">
            <UserPresence currentUsername={username} />
            <div className="h-6 w-px bg-gray-200" />
            <span className="text-sm text-gray-600">
              <strong>{username}</strong>
            </span>
          </div>
        </div>
      </header>

      {/* Tab Bar */}
      <div className="bg-white border-b px-4 flex-shrink-0">
        <div className="flex gap-1">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${activeTab === tab.key
                ? "border-indigo-500 text-indigo-600"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <main className="flex-1 overflow-hidden">
        <div
          className="h-full"
          style={{ display: activeTab === "whiteboard" ? "block" : "none" }}
        >
          <Whiteboard roomId={roomId} />
        </div>
        <div
          className="h-full"
          style={{ display: activeTab === "code" ? "block" : "none" }}
        >
          <CodeEditor roomId={roomId} />
        </div>
        <div
          className="h-full p-4"
          style={{ display: activeTab === "chat" ? "flex" : "none" }}
        >
          <div className="w-full max-w-3xl mx-auto h-full">
            <ChatPanel roomId={roomId} username={username} />
          </div>
        </div>
      </main>
    </div>
  );
}

export default function RoomPage({
  params,
}: {
  params: Promise<{ roomId: string }>;
}) {
  const { roomId } = use(params);

  return (
    <Suspense
      fallback={
        <div className="h-screen flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
            <span className="text-gray-500">Loading room...</span>
          </div>
        </div>
      }
    >
      <RoomContent roomId={roomId} />
    </Suspense>
  );
}