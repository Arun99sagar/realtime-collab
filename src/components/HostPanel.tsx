"use client";

import { useState } from "react";
import { socket } from "@/lib/socket";

interface User {
  id: string;
  username: string;
}

interface JoinRequest {
  socketId: string;
  username: string;
}

interface Props {
  roomId: string;
  currentSocketId: string;
  users: User[];
  whiteboardLocked: boolean;
  codeLocked: boolean;
  chatLocked: boolean;
  pendingRequests: JoinRequest[];
  onRequestHandled: (socketId: string) => void;
}

function LockRow({
  label,
  description,
  locked,
  onToggle,
  lockedDesc,
  unlockedDesc,
}: {
  label: string;
  description?: string;
  locked: boolean;
  onToggle: () => void;
  lockedDesc: string;
  unlockedDesc: string;
}) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm font-semibold text-gray-800">{label}</p>
        <p className="text-xs text-gray-400">{locked ? lockedDesc : unlockedDesc}</p>
      </div>
      <button
        onClick={onToggle}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
          locked ? "bg-red-500" : "bg-green-500"
        }`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
            locked ? "translate-x-6" : "translate-x-1"
          }`}
        />
      </button>
    </div>
  );
}

export default function HostPanel({
  roomId,
  currentSocketId,
  users,
  whiteboardLocked,
  codeLocked,
  chatLocked,
  pendingRequests,
  onRequestHandled,
}: Props) {
  const [open, setOpen] = useState(false);

  const kickUser = (socketId: string) => socket.emit("kick-user", { roomId, socketId });
  const toggleWhiteboard = () => socket.emit("toggle-whiteboard-lock", { roomId });
  const toggleCode = () => socket.emit("toggle-code-lock", { roomId });
  const toggleChat = () => socket.emit("toggle-chat-lock", { roomId });

  const respond = (socketId: string, approved: boolean) => {
    socket.emit("join-response", { roomId, socketId, approved });
    onRequestHandled(socketId);
  };

  const totalPending = pendingRequests.length;

  return (
    <div className="relative">
      {/* Trigger button */}
      <button
        onClick={() => setOpen((o) => !o)}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border ${
          open
            ? "bg-indigo-600 text-white border-indigo-600 shadow-md"
            : "bg-white text-indigo-600 border-indigo-200 hover:bg-indigo-50"
        }`}
      >
        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
          <path d="M2 19l2-8 5 4 3-8 3 8 5-4 2 8H2zm18-10a2 2 0 11-4 0 2 2 0 014 0zM6 9a2 2 0 11-4 0 2 2 0 014 0zm8-4a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
        Host Controls
        {totalPending > 0 && (
          <span className="ml-1 flex items-center justify-center w-4 h-4 rounded-full bg-red-500 text-white text-[10px] font-bold">
            {totalPending}
          </span>
        )}
      </button>

      {/* Panel */}
      {open && (
        <div className="absolute right-0 top-full mt-2 w-72 bg-white rounded-2xl shadow-2xl border border-gray-100 z-50 overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-4 py-3">
            <p className="text-white text-sm font-bold flex items-center gap-2">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M2 19l2-8 5 4 3-8 3 8 5-4 2 8H2zm18-10a2 2 0 11-4 0 2 2 0 014 0zM6 9a2 2 0 11-4 0 2 2 0 014 0zm8-4a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              Host Controls
            </p>
            <p className="text-indigo-200 text-xs mt-0.5">
              {users.length} {users.length === 1 ? "person" : "people"} in room
            </p>
          </div>

          {/* Lock toggles */}
          <div className="px-4 py-3 border-b border-gray-100 space-y-3">
            <LockRow
              label="Whiteboard"
              locked={whiteboardLocked}
              onToggle={toggleWhiteboard}
              lockedDesc="Locked — guests can't draw"
              unlockedDesc="Unlocked — everyone can draw"
            />
            <LockRow
              label="Code Editor"
              locked={codeLocked}
              onToggle={toggleCode}
              lockedDesc="Locked — guests can't edit code"
              unlockedDesc="Unlocked — everyone can edit"
            />
            <LockRow
              label="Chat"
              locked={chatLocked}
              onToggle={toggleChat}
              lockedDesc="Muted — guests can't send messages"
              unlockedDesc="Open — everyone can chat"
            />
          </div>

          {/* Pending join requests */}
          {pendingRequests.length > 0 && (
            <div className="px-4 py-3 border-b border-gray-100">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                Waiting to Join ({pendingRequests.length})
              </p>
              <div className="space-y-2">
                {pendingRequests.map((req) => (
                  <div
                    key={req.socketId}
                    className="flex items-center justify-between bg-amber-50 rounded-xl px-3 py-2"
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-amber-400 flex items-center justify-center text-white text-xs font-bold">
                        {req.username.slice(0, 2).toUpperCase()}
                      </div>
                      <span className="text-sm font-medium text-gray-700 truncate max-w-[100px]">
                        {req.username}
                      </span>
                    </div>
                    <div className="flex gap-1.5">
                      <button
                        onClick={() => respond(req.socketId, true)}
                        className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-green-500 text-white hover:bg-green-600 transition-colors"
                      >
                        Allow
                      </button>
                      <button
                        onClick={() => respond(req.socketId, false)}
                        className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-red-100 text-red-600 hover:bg-red-200 transition-colors"
                      >
                        Deny
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* User list */}
          <div className="px-4 py-3">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
              Connected Users
            </p>
            <div className="space-y-1.5 max-h-40 overflow-y-auto">
              {users.map((user) => {
                const isMe = user.id === currentSocketId;
                return (
                  <div
                    key={user.id}
                    className="flex items-center justify-between rounded-xl px-3 py-2 hover:bg-gray-50 transition-colors group"
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-green-400" />
                      <span className="text-sm text-gray-700 font-medium">
                        {user.username}
                        {isMe && (
                          <span className="ml-1.5 text-xs text-indigo-500 font-semibold">
                            (You — Host)
                          </span>
                        )}
                      </span>
                    </div>
                    {!isMe && (
                      <button
                        onClick={() => kickUser(user.id)}
                        className="opacity-0 group-hover:opacity-100 px-2.5 py-1 text-xs font-semibold rounded-lg bg-red-50 text-red-500 hover:bg-red-100 transition-all"
                      >
                        Kick
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
