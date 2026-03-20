"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import { socket } from "@/lib/socket";

// Excalidraw is client-only; we dynamic-import it inside the component
let ExcalidrawComponent: any = null;

export default function Whiteboard({ roomId, locked = false }: { roomId: string; locked?: boolean }) {
  const [Excalidraw, setExcalidraw] = useState<any>(null);
  const excalidrawAPIRef = useRef<any>(null);
  const isRemoteUpdate = useRef(false);
  const lastElementsRef = useRef<string>("");

  // Dynamic import of Excalidraw (SSR-safe)
  useEffect(() => {
    if (ExcalidrawComponent) {
      setExcalidraw(() => ExcalidrawComponent);
      return;
    }
    import("@excalidraw/excalidraw").then((mod) => {
      ExcalidrawComponent = mod.Excalidraw;
      setExcalidraw(() => mod.Excalidraw);
    });
  }, []);

  // Handle local changes → emit to Socket.IO
  const handleChange = useCallback(
    (elements: readonly any[], appState: any) => {
      if (isRemoteUpdate.current) return;

      // Serialize only the elements (not appState) to detect real changes
      const serialized = JSON.stringify(
        elements.map((el) => ({ ...el, version: el.version }))
      );
      if (serialized === lastElementsRef.current) return;
      lastElementsRef.current = serialized;

      socket.emit("drawing-update", {
        roomId,
        changes: { elements: elements.map((el) => ({ ...el })) },
      });
    },
    [roomId]
  );

  // Listen for remote drawing updates
  useEffect(() => {
    const handleRemoteDrawing = (changes: any) => {
      const api = excalidrawAPIRef.current;
      if (!api || !changes?.elements) return;

      isRemoteUpdate.current = true;
      try {
        api.updateScene({ elements: changes.elements });
        lastElementsRef.current = JSON.stringify(
          changes.elements.map((el: any) => ({ ...el, version: el.version }))
        );
      } finally {
        // Small delay to prevent the onChange from re-emitting the remote update
        setTimeout(() => {
          isRemoteUpdate.current = false;
        }, 50);
      }
    };

    socket.on("drawing-update", handleRemoteDrawing);
    return () => {
      socket.off("drawing-update", handleRemoteDrawing);
    };
  }, []);

  if (!Excalidraw) {
    return (
      <div className="h-full flex items-center justify-center bg-white">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm text-gray-500">Loading Whiteboard...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full w-full overflow-hidden bg-white">
      <Excalidraw
        excalidrawAPI={(api: any) => {
          excalidrawAPIRef.current = api;
        }}
        onChange={handleChange}
        viewModeEnabled={locked}
        theme="light"
        UIOptions={{
          canvasActions: {
            loadScene: false,
            export: false,
            saveAsImage: false,
          },
        }}
      />
    </div>
  );
}