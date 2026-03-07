"use client";

import { Tldraw, Editor } from "tldraw";
import "tldraw/tldraw.css";
import { useEffect, useRef, useCallback } from "react";
import { socket } from "@/lib/socket";

export default function Whiteboard({ roomId }: { roomId: string }) {
  const editorRef = useRef<Editor | null>(null);
  const isRemoteUpdate = useRef(false);

  const handleMount = useCallback(
    (editor: Editor) => {
      editorRef.current = editor;

      // Listen to local store changes and broadcast them
      editor.store.listen(
        (entry) => {
          // Don't broadcast changes that came from remote users
          if (isRemoteUpdate.current) return;

          const { changes, source } = entry;
          if (source !== "user") return;

          // Only send if there are actual changes
          const hasChanges =
            Object.keys(changes.added).length > 0 ||
            Object.keys(changes.updated).length > 0 ||
            Object.keys(changes.removed).length > 0;

          if (hasChanges) {
            socket.emit("drawing-update", { roomId, changes });
          }
        },
        { source: "user", scope: "document" }
      );
    },
    [roomId]
  );

  useEffect(() => {
    // Listen for remote drawing updates
    const handleRemoteDrawing = (changes: any) => {
      const editor = editorRef.current;
      if (!editor) return;

      isRemoteUpdate.current = true;
      try {
        editor.store.mergeRemoteChanges(() => {
          const { added, updated, removed } = changes;

          // Apply added records
          if (added && Object.keys(added).length > 0) {
            editor.store.put(Object.values(added));
          }

          // Apply updated records
          if (updated && Object.keys(updated).length > 0) {
            const updatedRecords = Object.values(updated).map(
              (pair: any) => pair[1]
            );
            editor.store.put(updatedRecords);
          }

          // Apply removed records
          if (removed && Object.keys(removed).length > 0) {
            const removedIds = Object.keys(removed);
            // Only remove records that exist in the store
            const existingIds = removedIds.filter((id) =>
              editor.store.has(id as any)
            );
            if (existingIds.length > 0) {
              editor.store.remove(existingIds as any);
            }
          }
        });
      } finally {
        isRemoteUpdate.current = false;
      }
    };

    socket.on("drawing-update", handleRemoteDrawing);

    return () => {
      socket.off("drawing-update", handleRemoteDrawing);
    };
  }, []);

  return (
    <div className="h-full w-full overflow-hidden bg-white">
      <Tldraw
        persistenceKey={`room-${roomId}`}
        onMount={handleMount}
      />
    </div>
  );
}