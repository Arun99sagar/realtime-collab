"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Editor from "@monaco-editor/react";
import { socket } from "@/lib/socket";

// Judge0 CE language IDs: https://ce.judge0.com/languages
const LANGUAGES = [
  { value: "javascript", label: "JavaScript", judgeId: 93 },
  { value: "typescript", label: "TypeScript", judgeId: 74 },
  { value: "python", label: "Python", judgeId: 92 },
  { value: "cpp", label: "C++", judgeId: 54 },
  { value: "java", label: "Java", judgeId: 62 },
  { value: "go", label: "Go", judgeId: 60 },
  { value: "html", label: "HTML", judgeId: null },   // rendered via iframe
  { value: "css", label: "CSS", judgeId: null },
  { value: "json", label: "JSON", judgeId: null },
  { value: "markdown", label: "Markdown", judgeId: null },
];

const DEFAULT_CODE = `// Start collaborating! 🚀
// Type your code here and it will sync with everyone in the room.

function greet(name) {
  return "Hello, " + name + "!";
}

console.log(greet("World"));
`;

interface RunOutput {
  stdout: string;
  stderr: string;
  exitCode: number | null;
  error?: string;
}

export default function CodeEditor({
  roomId,
  locked = false,
}: {
  roomId: string;
  locked?: boolean;
}) {
  const [code, setCode] = useState(DEFAULT_CODE);
  const [language, setLanguage] = useState("javascript");
  const [running, setRunning] = useState(false);
  const [output, setOutput] = useState<RunOutput | null>(null);
  const [stdin, setStdin] = useState("");
  const [stdinOpen, setStdinOpen] = useState(false);
  const [outputOpen, setOutputOpen] = useState(false);
  // HTML preview state
  const [htmlPreviewOpen, setHtmlPreviewOpen] = useState(false);
  const [htmlPreviewSrc, setHtmlPreviewSrc] = useState("");

  const isRemoteUpdate = useRef(false);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const currentLang = LANGUAGES.find((l) => l.value === language)!;
  const canRun = !!currentLang?.judgeId;
  const isHtml = language === "html";

  const handleEditorChange = useCallback(
    (value: string | undefined) => {
      if (isRemoteUpdate.current) return;
      const newCode = value ?? "";
      setCode(newCode);
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
      setOutput(null);
      setHtmlPreviewOpen(false);
      socket.emit("code-change", { roomId, code, language: newLang });
    },
    [roomId, code]
  );

  // Run HTML: render in iframe via blob URL
  const runHtml = () => {
    const blob = new Blob([code], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    setHtmlPreviewSrc(url);
    setHtmlPreviewOpen(true);
  };

  // Run code via Judge0 CE
  const runCode = async () => {
    if (isHtml) { runHtml(); return; }
    if (!canRun || running) return;
    setRunning(true);
    setOutputOpen(true);
    setOutput(null);
    try {
      const submitRes = await fetch("https://ce.judge0.com/submissions?base64_encoded=false&wait=true", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          language_id: currentLang.judgeId,
          source_code: code,
          stdin: stdin || "",
        }),
      });
      if (!submitRes.ok) throw new Error(`API error ${submitRes.status}`);
      const data = await submitRes.json();
      setOutput({
        stdout: data.stdout ?? "",
        stderr: data.stderr ?? data.compile_output ?? "",
        exitCode: data.exit_code ?? null,
      });
    } catch (err: any) {
      setOutput({ stdout: "", stderr: "", exitCode: null, error: err.message });
    } finally {
      setRunning(false);
    }
  };

  useEffect(() => {
    const handleRemoteCode = (data: { code: string; language: string }) => {
      isRemoteUpdate.current = true;
      setCode(data.code);
      setLanguage(data.language);
      requestAnimationFrame(() => { isRemoteUpdate.current = false; });
    };
    socket.on("code-change", handleRemoteCode);
    return () => {
      socket.off("code-change", handleRemoteCode);
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, []);

  // Clean up blob URL when preview closes
  useEffect(() => {
    if (!htmlPreviewOpen && htmlPreviewSrc) {
      URL.revokeObjectURL(htmlPreviewSrc);
      setHtmlPreviewSrc("");
    }
  }, [htmlPreviewOpen, htmlPreviewSrc]);

  const hasOutput = output !== null;
  const exitOk = output?.exitCode === 0;
  const runReady = isHtml || canRun;

  return (
    <div className="flex flex-col h-full bg-[#1e1e1e] rounded-lg overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 bg-[#252526] border-b border-[#3c3c3c] flex-shrink-0">
        <div className="flex items-center gap-3">
          <label className="text-xs text-gray-400 font-medium uppercase tracking-wider">Language</label>
          <select
            value={language}
            onChange={handleLanguageChange}
            disabled={locked}
            className="bg-[#3c3c3c] text-gray-200 text-sm rounded px-3 py-1.5 border border-[#555] focus:outline-none focus:border-blue-500 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {LANGUAGES.map((lang) => (
              <option key={lang.value} value={lang.value}>{lang.label}</option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-3">
          {/* Lock banner */}
          {locked && (
            <span className="flex items-center gap-1.5 text-xs text-red-400 font-medium">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              Locked by host
            </span>
          )}

          <span className="flex items-center gap-1.5">
            <span className="inline-block w-2 h-2 rounded-full bg-green-500" />
            <span className="text-xs text-gray-400">Live Sync</span>
          </span>

          {/* Run button */}
          <button
            onClick={runCode}
            disabled={!runReady || running}
            title={
              isHtml ? "Preview HTML" : canRun ? "Run code" : "Run not supported for this language"
            }
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
              !runReady
                ? "bg-[#3c3c3c] text-gray-500 cursor-not-allowed"
                : running
                ? "bg-green-700 text-green-200 cursor-wait"
                : isHtml
                ? "bg-orange-500 hover:bg-orange-400 text-white shadow-sm"
                : "bg-green-600 hover:bg-green-500 text-white shadow-sm"
            }`}
          >
            {running ? (
              <>
                <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                Running…
              </>
            ) : isHtml ? (
              <>
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
                Preview
              </>
            ) : (
              <>
                <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
                Run
              </>
            )}
          </button>

          {canRun && !isHtml && (
            <button
              onClick={() => setStdinOpen((o) => !o)}
              className="text-xs text-gray-400 hover:text-gray-200 transition-colors underline"
            >
              {stdinOpen ? "Hide Stdin" : "Stdin"}
            </button>
          )}
          {hasOutput && !isHtml && (
            <button
              onClick={() => setOutputOpen((o) => !o)}
              className="text-xs text-gray-400 hover:text-gray-200 transition-colors underline"
            >
              {outputOpen ? "Hide Output" : "Show Output"}
            </button>
          )}
          {isHtml && htmlPreviewOpen && (
            <button
              onClick={() => setHtmlPreviewOpen(false)}
              className="text-xs text-gray-400 hover:text-gray-200 transition-colors underline"
            >
              Close Preview
            </button>
          )}
        </div>
      </div>

      {/* Editor */}
      <div className={`${(outputOpen && hasOutput) || htmlPreviewOpen ? "flex-1 min-h-0" : "flex-1"} overflow-hidden`}>
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
            readOnly: locked,
          }}
        />
      </div>

      {/* Stdin panel */}
      {stdinOpen && canRun && !isHtml && (
        <div className="flex-shrink-0 border-t border-[#3c3c3c] bg-[#0d0d0d] flex flex-col">
          <div className="flex items-center justify-between px-4 py-1.5 bg-[#1a1a1a] border-b border-[#3c3c3c]">
            <span className="text-xs font-semibold text-blue-400">Stdin (Program Input)</span>
            <button
              onClick={() => setStdin("")}
              className="text-xs text-gray-500 hover:text-gray-300 transition-colors"
            >
              Clear
            </button>
          </div>
          <textarea
            value={stdin}
            onChange={(e) => setStdin(e.target.value)}
            placeholder="Enter input values here (one per line)..."
            rows={3}
            className="w-full bg-[#0d0d0d] text-green-300 font-mono text-xs px-4 py-2 resize-none focus:outline-none placeholder-gray-600"
          />
        </div>
      )}

      {/* HTML Preview panel */}
      {htmlPreviewOpen && (
        <div className="flex-shrink-0 h-64 border-t border-[#3c3c3c] bg-white flex flex-col">
          <div className="flex items-center justify-between px-4 py-1.5 bg-[#1a1a1a] border-b border-[#3c3c3c]">
            <span className="text-xs font-semibold text-orange-400 flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
              </svg>
              HTML Preview
            </span>
            <button
              onClick={() => { runHtml(); }}
              className="text-xs text-gray-400 hover:text-gray-200 transition-colors"
            >
              ↺ Refresh
            </button>
          </div>
          <iframe
            key={htmlPreviewSrc}
            src={htmlPreviewSrc}
            className="flex-1 w-full border-none bg-white"
            sandbox="allow-scripts"
            title="HTML Preview"
          />
        </div>
      )}

      {/* Output panel (non-HTML) */}
      {outputOpen && hasOutput && !isHtml && (
        <div className="flex-shrink-0 h-48 bg-[#0d0d0d] border-t border-[#3c3c3c] flex flex-col">
          <div className="flex items-center justify-between px-4 py-1.5 bg-[#1a1a1a] border-b border-[#3c3c3c]">
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${exitOk ? "bg-green-500" : "bg-red-500"}`} />
              <span className="text-xs font-semibold text-gray-300">
                Output
                {output.exitCode !== null && (
                  <span className={`ml-2 ${exitOk ? "text-green-400" : "text-red-400"}`}>
                    (exit {output.exitCode})
                  </span>
                )}
                {output.error && <span className="ml-2 text-red-400">Error</span>}
              </span>
            </div>
            <button onClick={() => setOutput(null)} className="text-xs text-gray-500 hover:text-gray-300 transition-colors">
              Clear
            </button>
          </div>
          <div className="flex-1 overflow-y-auto px-4 py-2 font-mono text-xs">
            {output.error && <p className="text-red-400">{output.error}</p>}
            {output.stdout && <pre className="text-green-300 whitespace-pre-wrap">{output.stdout}</pre>}
            {output.stderr && <pre className="text-red-400 whitespace-pre-wrap">{output.stderr}</pre>}
            {!output.stdout && !output.stderr && !output.error && (
              <p className="text-gray-500 italic">No output</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
