"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function Home() {
  const router = useRouter();

  const [username, setUsername] = useState("");
  const [roomIdToJoin, setRoomIdToJoin] = useState("");
  const [error, setError] = useState("");

  const createRoom = () => {
    if (!username.trim()) {
      setError("Please enter a username");
      return;
    }

    // Generate a short, friendly room code (6-8 chars)
    const newRoomId = Math.random().toString(36).substring(2, 10).toUpperCase();

    // Redirect to room page with username as query param
    router.push(`/room/${newRoomId}?username=${encodeURIComponent(username.trim())}`);
  };

  const joinRoom = () => {
    if (!username.trim()) {
      setError("Please enter a username");
      return;
    }
    if (!roomIdToJoin.trim()) {
      setError("Please enter a room code");
      return;
    }

    const cleanRoomId = roomIdToJoin.trim().toUpperCase();

    router.push(`/room/${cleanRoomId}?username=${encodeURIComponent(username.trim())}`);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 p-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="space-y-1">
          <CardTitle className="text-3xl font-bold text-center">
            Realtime-Collab
          </CardTitle>
          <CardDescription className="text-center">
            Real-time Whiteboard + Code Editor
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm">
              {error}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-1">
                Your Name / Nickname
              </label>
              <Input
                id="username"
                placeholder="e.g. Arun"
                value={username}
                onChange={(e) => {
                  setUsername(e.target.value);
                  setError("");
                }}
                className="h-11"
              />
            </div>

            <Button
              onClick={createRoom}
              className="w-full h-11 text-base font-medium"
              disabled={!username.trim()}
            >
              Create New Room
            </Button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white px-2 text-gray-500">or join existing</span>
              </div>
            </div>

            <div className="space-y-2">
              <Input
                placeholder="Enter Room Code (e.g. ABC12345)"
                value={roomIdToJoin}
                onChange={(e) => {
                  setRoomIdToJoin(e.target.value);
                  setError("");
                }}
                className="h-11"
              />
              <Button
                variant="outline"
                onClick={joinRoom}
                className="w-full h-11 text-base font-medium"
                disabled={!username.trim() || !roomIdToJoin.trim()}
              >
                Join Room
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}