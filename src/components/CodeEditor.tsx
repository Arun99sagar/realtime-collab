"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Editor from "@monaco-editor/react";
import { socket } from "@/lib/socket";

const LANGUAGES = [
    { value: "javascript", label: "JavaScript" },
    { value: "typescript", label: "TypeScript" },
    { value: "python", label: "Python" },
    { value: "html", label: "HTML" },
    { value: "css", label: "CSS" },
    { value: "json", label: "JSON" },
    { value: "markdown", label: "Markdown" },
];

const DEFAULT_CODE = `// Start collaborating! 🚀
// Type your code here and it will sync with everyone in the room.

function greet(name) {
  return "Hello, " + name + "!";
}

console.log(greet("World"));
`;

export default function CodeEditor({ roomId }: { roomId: string }) {
    const [code, setCode] = useState(DEFAULT_CODE);
    const [language, setLanguage] = useState("javascript");
    const isRemoteUpdate = useRef(false);
    const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    const handleEditorChange = useCallback(
        (value: string | undefined) => {
            if (isRemoteUpdate.current) return;

            const newCode = value ?? "";
            setCode(newCode);

            // Debounce socket emission to avoid flooding
            if (debounceTimer.current) clearTimeout(debounceTimer.current);
            debounceTimer.current = setTimeout(() => {
                socket.emit("code-change", { roomId, code: newCode, language });
            }, 150);
        },
        [roomId, language]
    );

    const handleLanguageChange = useCallback(
        (e: React.ChangeEvent<HTMLSelectElement>) => {
            const newLang = e.target.value;
            setLanguage(newLang);
            socket.emit("code-change", { roomId, code, language: newLang });
        },
        [roomId, code]
    );

    useEffect(() => {
        const handleRemoteCode = (data: { code: string; language: string }) => {
            isRemoteUpdate.current = true;
            setCode(data.code);
            setLanguage(data.language);
            // Reset flag after React processes the state update
            requestAnimationFrame(() => {
                isRemoteUpdate.current = false;
            });
        };

        socket.on("code-change", handleRemoteCode);

        return () => {
            socket.off("code-change", handleRemoteCode);
            if (debounceTimer.current) clearTimeout(debounceTimer.current);
        };
    }, []);

    return (
        <div className="flex flex-col h-full bg-[#1e1e1e] rounded-lg overflow-hidden">
            {/* Toolbar */}
            <div className="flex items-center justify-between px-4 py-2 bg-[#252526] border-b border-[#3c3c3c]">
                <div className="flex items-center gap-3">
                    <label className="text-xs text-gray-400 font-medium uppercase tracking-wider">
                        Language
                    </label>
                    <select
                        value={language}
                        onChange={handleLanguageChange}
                        className="bg-[#3c3c3c] text-gray-200 text-sm rounded px-3 py-1.5 border border-[#555] focus:outline-none focus:border-blue-500 cursor-pointer"
                    >
                        {LANGUAGES.map((lang) => (
                            <option key={lang.value} value={lang.value}>
                                {lang.label}
                            </option>
                        ))}
                    </select>
                </div>
                <div className="flex items-center gap-2">
                    <span className="inline-block w-2 h-2 rounded-full bg-green-500"></span>
                    <span className="text-xs text-gray-400">Live Sync</span>
                </div>
            </div>

            {/* Editor */}
            <div className="flex-1">
                <Editor
                    height="100%"
                    language={language}
                    value={code}
                    onChange={handleEditorChange}
                    theme="vs-dark"
                    options={{
                        fontSize: 14,
                        fontFamily: "'Fira Code', 'Cascadia Code', Consolas, monospace",
                        minimap: { enabled: false },
                        wordWrap: "on",
                        lineNumbers: "on",
                        scrollBeyondLastLine: false,
                        smoothScrolling: true,
                        cursorBlinking: "smooth",
                        cursorSmoothCaretAnimation: "on",
                        padding: { top: 16, bottom: 16 },
                        renderLineHighlight: "line",
                        bracketPairColorization: { enabled: true },
                        autoClosingBrackets: "always",
                        tabSize: 2,
                    }}
                />
            </div>
        </div>
    );
}
