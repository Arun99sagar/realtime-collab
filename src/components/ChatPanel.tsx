"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { socket } from "@/lib/socket";

interface ChatMessage {
    id: string;
    username: string;
    text: string;
    timestamp: number;
    isSystem?: boolean;
}

export default function ChatPanel({
    roomId,
    username,
    locked = false,
}: {
    roomId: string;
    username: string;
    locked?: boolean;
}) {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [inputText, setInputText] = useState("");
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    // Auto-scroll to latest message
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    useEffect(() => {
        const handleChatMessage = (message: ChatMessage) => {
            setMessages((prev) => [...prev, message]);
        };

        const handleUserJoined = (data: { id: string; username: string }) => {
            setMessages((prev) => [
                ...prev,
                {
                    id: `sys-${Date.now()}`,
                    username: "System",
                    text: `${data.username} joined the room`,
                    timestamp: Date.now(),
                    isSystem: true,
                },
            ]);
        };

        const handleUserLeft = (data: { id: string; username: string }) => {
            setMessages((prev) => [
                ...prev,
                {
                    id: `sys-${Date.now()}`,
                    username: "System",
                    text: `${data.username} left the room`,
                    timestamp: Date.now(),
                    isSystem: true,
                },
            ]);
        };

        socket.on("chat-message", handleChatMessage);
        socket.on("user-joined", handleUserJoined);
        socket.on("user-left", handleUserLeft);

        return () => {
            socket.off("chat-message", handleChatMessage);
            socket.off("user-joined", handleUserJoined);
            socket.off("user-left", handleUserLeft);
        };
    }, []);

    const sendMessage = useCallback(() => {
        const trimmed = inputText.trim();
        if (!trimmed) return;

        socket.emit("chat-message", {
            roomId,
            username,
            text: trimmed,
        });

        setInputText("");
        inputRef.current?.focus();
    }, [inputText, roomId, username]);

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    };

    const formatTime = (ts: number) => {
        return new Date(ts).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
        });
    };

    return (
        <div className="flex flex-col h-full bg-white rounded-lg overflow-hidden border border-gray-200">
            {/* Header */}
            <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
                <h3 className="font-semibold text-sm text-gray-700 flex items-center gap-2">
                    <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                        />
                    </svg>
                    Chat
                </h3>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {messages.length === 0 && (
                    <div className="flex items-center justify-center h-full">
                        <p className="text-gray-400 text-sm italic">
                            No messages yet. Say hello! 👋
                        </p>
                    </div>
                )}
                {messages.map((msg) =>
                    msg.isSystem ? (
                        <div key={msg.id} className="flex justify-center">
                            <span className="text-xs text-gray-400 bg-gray-50 px-3 py-1 rounded-full">
                                {msg.text}
                            </span>
                        </div>
                    ) : (
                        <div
                            key={msg.id}
                            className={`flex flex-col ${msg.username === username ? "items-end" : "items-start"
                                }`}
                        >
                            <div className="flex items-center gap-2 mb-0.5">
                                <span className="text-xs font-medium text-gray-500">
                                    {msg.username === username ? "You" : msg.username}
                                </span>
                                <span className="text-xs text-gray-300">
                                    {formatTime(msg.timestamp)}
                                </span>
                            </div>
                            <div
                                className={`max-w-[80%] rounded-2xl px-4 py-2 text-sm ${msg.username === username
                                        ? "bg-indigo-500 text-white rounded-br-md"
                                        : "bg-gray-100 text-gray-800 rounded-bl-md"
                                    }`}
                            >
                                {msg.text}
                            </div>
                        </div>
                    )
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="border-t border-gray-200 p-3">
                {locked ? (
                    <div className="flex items-center justify-center gap-2 py-2 text-sm text-red-500 font-medium bg-red-50 rounded-xl">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                        Chat muted by host
                    </div>
                ) : (
                    <div className="flex gap-2">
                        <input
                            ref={inputRef}
                            type="text"
                            value={inputText}
                            onChange={(e) => setInputText(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="Type a message..."
                            className="flex-1 px-4 py-2 text-sm border border-gray-200 rounded-full focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-gray-50"
                        />
                        <button
                            onClick={sendMessage}
                            disabled={!inputText.trim()}
                            className="px-4 py-2 bg-indigo-500 text-white rounded-full text-sm font-medium hover:bg-indigo-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                    d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                            </svg>
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
