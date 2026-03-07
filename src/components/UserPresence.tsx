"use client";

import { useEffect, useState } from "react";
import { socket } from "@/lib/socket";

interface User {
    id: string;
    username: string;
}

// Generate a consistent color from a username
function getAvatarColor(name: string): string {
    const colors = [
        "bg-rose-500",
        "bg-blue-500",
        "bg-emerald-500",
        "bg-amber-500",
        "bg-violet-500",
        "bg-cyan-500",
        "bg-pink-500",
        "bg-teal-500",
        "bg-orange-500",
        "bg-indigo-500",
    ];
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
        hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
}

function getInitials(name: string): string {
    return name
        .split(" ")
        .map((w) => w[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);
}

export default function UserPresence({ currentUsername }: { currentUsername: string }) {
    const [users, setUsers] = useState<User[]>([]);

    useEffect(() => {
        const handleRoomUsers = (userList: User[]) => {
            setUsers(userList);
        };

        const handleUserJoined = (user: User) => {
            setUsers((prev) => {
                if (prev.find((u) => u.id === user.id)) return prev;
                return [...prev, user];
            });
        };

        const handleUserLeft = (user: { id: string }) => {
            setUsers((prev) => prev.filter((u) => u.id !== user.id));
        };

        socket.on("room-users", handleRoomUsers);
        socket.on("user-joined", handleUserJoined);
        socket.on("user-left", handleUserLeft);

        return () => {
            socket.off("room-users", handleRoomUsers);
            socket.off("user-joined", handleUserJoined);
            socket.off("user-left", handleUserLeft);
        };
    }, []);

    return (
        <div className="flex items-center gap-1">
            {/* Stacked avatars */}
            <div className="flex -space-x-2">
                {users.slice(0, 5).map((user) => (
                    <div
                        key={user.id}
                        title={user.username === currentUsername ? `${user.username} (you)` : user.username}
                        className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold border-2 border-white shadow-sm ${getAvatarColor(
                            user.username
                        )}`}
                    >
                        {getInitials(user.username)}
                    </div>
                ))}
                {users.length > 5 && (
                    <div className="w-8 h-8 rounded-full flex items-center justify-center bg-gray-300 text-gray-700 text-xs font-bold border-2 border-white shadow-sm">
                        +{users.length - 5}
                    </div>
                )}
            </div>

            {/* Count badge */}
            <span className="ml-2 text-xs text-gray-500 font-medium">
                {users.length} {users.length === 1 ? "user" : "users"} online
            </span>
        </div>
    );
}
