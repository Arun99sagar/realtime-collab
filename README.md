# Realtime-Collab

A full-stack **real-time collaborative** app: shared whiteboard Excalidraw (MIT-licensed, free for production), code editor (Monaco + execution), and chat — all synced live via Socket.IO. Host controls join requests, kicks, per-tool locks, and auto host migration.

## Features
- Create/join rooms with unique 6-char codes
- Username-based presence (avatars in header)
- **Whiteboard**: tldraw canvas, real-time drawing sync, host lock (readonly for others)
- **Code Editor**: Monaco, real-time changes (debounced), run code via Judge0 (JS/TS/Python/C++/Java/Go), HTML live preview in iframe
- **Chat**: Real-time messages + system join/leave notices, host can mute others
- Host panel: approve/deny joins, kick users, toggle locks (whiteboard/code/chat)
- Connection status + copy room link
- Tabbed UI (Whiteboard / Code / Chat)

## Tech Stack
- Next.js 16 + React 19
- Socket.IO ^4 (custom server)
- tldraw ^4 (whiteboard)
- @monaco-editor/react ^4 (code editor)
- Tailwind CSS + shadcn/ui + Radix UI
- Judge0 CE (code execution – public API for now)
