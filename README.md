# Realtime-Collab

A real-time collaborative whiteboard and code editor built with Next.js, Socket.io, tldraw, and shadcn-ui.

## Features
- Username + create/join room with unique code
- Real-time multi-user presence (join notifications + status)
- Infinite collaborative whiteboard (tldraw)
- Local drawing support (real-time sync coming soon)
- Modern UI with shadcn-ui + Tailwind

## Tech Stack
- Next.js 14 (App Router)
- Socket.io (real-time communication)
- tldraw (whiteboard canvas)
- shadcn-ui + Tailwind CSS (components & styling)
- Custom server for Socket.io

## How to run locally
1. Clone the repo
2. `npm install`
3. `npm run dev`
4. Open http://localhost:3000

Create a room, share the code, join from another tab — enjoy real-time collab!

## Future Improvements
- Real-time drawing sync
- Monaco code editor integration
- Chat panel
- User cursors on canvas

Built by Arun — feel free to fork & contribute!