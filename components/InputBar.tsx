"use client";
import { useState, useRef, useCallback, useEffect } from "react";
import type { Attachment } from "@/types";

interface InputBarProps {
  value:               string;
  onChange:            (v: string) => void;
  onSend:              () => void;
  onDeepResearch:      () => void;
  isLoading:           boolean;
  isDeepResearch:      boolean;
  placeholder:         string;
  onAttachmentsChange: (attachments: Attachment[]) => void;
  attachments:         Attachment[];
}

export default function InputBar({
  value, onChange, onSend, onDeepResearch, isLoading, isDeepResearch,
  placeholder, onAttachmentsChange, attachments,
}: InputBarProps) {
  const [isRecording,  setIsRecording]  = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isDragging,   setIsDragging]   = useState(false);
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [recordingMs,  setRecordingMs]  = useState(0);
  const [recordError,  setRecordError]  = useState("");

  const textareaRef      = useRef<HTMLTextAreaElement>(null);
  const fileInputRef     = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef   = useRef<Blob[]>([]);
  const timerRef         = useRef<NodeJS.Timeout | null>(null);
  const streamRef        = useRef<MediaStream | null>(null);

  // Auto-resize textarea
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 144)}px`;
  }, [value]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); onSend(); }
  };

  // ── Transcribe audio blob via Whisper ─────────────────────────────────────
  const transcribeAudio = useCallback(async (blob: Blob) => {
    setIsTranscribing(true);
    setRecordError("");
    try {
      const formData = new FormData();
      // Send as webm file — Whisper accepts it
      formData.append("file", new File([blob], "recording.webm", { type: "audio/webm" }));

      const res  = await fetch("/api/transcribe", { method: "POST", body: formData });
      const data = await res.json();

      if (!res.ok) {
        setRecordError(data.error || "Transcription failed");
        return;
      }

      if (data.text && data.text.trim()) {
        // Append transcribed text to existing input
        const trimmed   = data.text.trim();
        const separator = value.trim() ? " " : "";
        onChange(value + separator + trimmed);
        // Focus textarea after transcription
        setTimeout(() => textareaRef.current?.focus(), 100);
        console.log(`[Audio] Transcribed: "${trimmed}"`);
      } else {
        setRecordError("No speech detected. Please try again.");
      }
    } catch (err) {
      console.error("[Audio] Transcription error:", err);
      setRecordError("Transcription failed. Check your connection.");
    } finally {
      setIsTranscribing(false);
    }
  }, [value, onChange]);

  // ── Start recording ───────────────────────────────────────────────────────
  const startRecording = async () => {
    setRecordError("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current    = stream;
      audioChunksRef.current = [];

      // Pick best supported format
      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : MediaRecorder.isTypeSupported("audio/webm")
        ? "audio/webm"
        : "audio/ogg";

      const mr = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mr;

      mr.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      mr.onstop = async () => {
        // Stop all tracks to release microphone
        stream.getTracks().forEach(t => t.stop());
        streamRef.current = null;

        if (audioChunksRef.current.length === 0) {
          setRecordError("No audio recorded. Please try again.");
          return;
        }

        const blob = new Blob(audioChunksRef.current, { type: mimeType });
        console.log(`[Audio] Recorded ${blob.size} bytes, type: ${mimeType}`);

        if (blob.size < 1000) {
          setRecordError("Recording too short. Please speak for at least 1 second.");
          return;
        }

        // Transcribe — this puts text into the input, NOT audio
        await transcribeAudio(blob);
      };

      mr.start(250); // collect chunks every 250ms
      setIsRecording(true);
      setRecordingMs(0);
      timerRef.current = setInterval(() => setRecordingMs(p => p + 100), 100);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes("Permission") || msg.includes("NotAllowed")) {
        setRecordError("Microphone access denied. Allow microphone in browser settings.");
      } else if (msg.includes("NotFound")) {
        setRecordError("No microphone found. Please connect one and try again.");
      } else {
        setRecordError("Could not start recording: " + msg);
      }
      console.error("[Audio] Start error:", err);
    }
  };

  // ── Stop recording ────────────────────────────────────────────────────────
  const stopRecording = () => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
    setRecordingMs(0);
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      streamRef.current?.getTracks().forEach(t => t.stop());
    };
  }, []);

  const formatTime = (ms: number) => {
    const s = Math.floor(ms / 1000);
    return `${Math.floor(s/60).toString().padStart(2,"0")}:${(s%60).toString().padStart(2,"0")}`;
  };

  // ── File upload ───────────────────────────────────────────────────────────
  const processFile = useCallback(async (file: File) => {
    if (file.size > 5 * 1024 * 1024) { alert("File too large. Maximum 5MB."); return; }
    const allowed = /\.(txt|pdf|csv|json|md|docx)$/i;
    if (!allowed.test(file.name)) { alert("Unsupported file. Use TXT, PDF, CSV, JSON, MD, or DOCX."); return; }
    setUploadingDoc(true);
    try {
      const text = await file.text();
      const att: Attachment = {
        id:      Math.random().toString(36).slice(2),
        name:    file.name,
        type:    file.type,
        size:    file.size,
        content: text,
      };
      onAttachmentsChange([...attachments, att]);
    } catch { alert("Failed to read file."); }
    finally { setUploadingDoc(false); }
  }, [attachments, onAttachmentsChange]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
    e.target.value = "";
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  };

  const removeAttachment = (id: string) => onAttachmentsChange(attachments.filter(a => a.id !== id));

  const charCount = value.length;

  return (
    <div className="px-6 pb-5 pt-2 flex-shrink-0 max-w-3xl mx-auto w-full">

      {/* Attachments */}
      {attachments.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2">
          {attachments.map(att => (
            <div key={att.id} className="flex items-center gap-1.5 bg-[#111118] border border-[#1e1e2e] rounded-lg px-2.5 py-1.5">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#7c7cff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>
              </svg>
              <span className="text-[11px] font-mono text-[#7c7cff]">{att.name}</span>
              <span className="text-[10px] text-[#404060]">({(att.size/1024).toFixed(0)}kb)</span>
              <button onClick={() => removeAttachment(att.id)} className="text-[#404060] hover:text-[#ff6b6b] transition-colors ml-0.5">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Recording indicator */}
      {isRecording && (
        <div className="flex items-center gap-2 mb-2 px-3 py-2 bg-[#ff6b6b]/8 border border-[#ff6b6b]/20 rounded-lg">
          <span className="w-2 h-2 rounded-full bg-[#ff6b6b] animate-pulse flex-shrink-0"/>
          <span className="text-[11px] font-mono text-[#ff6b6b]">Recording {formatTime(recordingMs)}</span>
          <span className="text-[10px] text-[#505070] ml-auto">Click mic to stop & transcribe</span>
        </div>
      )}

      {/* Transcribing indicator */}
      {isTranscribing && (
        <div className="flex items-center gap-2 mb-2 px-3 py-2 bg-[#ffb700]/8 border border-[#ffb700]/20 rounded-lg">
          <div className="w-3 h-3 border border-[#ffb700] border-t-transparent rounded-full animate-spin flex-shrink-0"/>
          <span className="text-[11px] font-mono text-[#ffb700]">Transcribing speech to text...</span>
        </div>
      )}

      {/* Error */}
      {recordError && !isRecording && !isTranscribing && (
        <div className="flex items-center justify-between gap-2 mb-2 px-3 py-2 bg-[#ff6b6b]/6 border border-[#ff6b6b]/15 rounded-lg">
          <span className="text-[11px] text-[#ff9999]">{recordError}</span>
          <button onClick={() => setRecordError("")} className="text-[#ff6b6b] text-xs flex-shrink-0">x</button>
        </div>
      )}

      {/* Input box */}
      <div
        className={`flex gap-2 items-end bg-[#111118] border rounded-2xl px-4 py-3 transition-all duration-200 ${
          isDragging
            ? "border-[#7c7cff]/40 bg-[#7c7cff]/5"
            : isRecording
            ? "border-[#ff6b6b]/30"
            : "border-[#1e1e2e] focus-within:border-[#00ff88]/20"
        }`}
        onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
      >
        <textarea
          ref={textareaRef}
          value={value}
          onChange={e => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={isDragging ? "Drop file here..." : isTranscribing ? "Transcribing..." : placeholder}
          rows={1}
          disabled={isLoading || isTranscribing}
          maxLength={2000}
          className="flex-1 bg-transparent text-[#e8e8f0] placeholder-[#2e2e48] text-sm resize-none outline-none leading-relaxed max-h-36 disabled:opacity-50"
          style={{scrollbarWidth:"none"}}
        />

        <div className="flex items-center gap-1.5 flex-shrink-0">
          {/* Char count */}
          {charCount > 1800 && (
            <span className={`text-[9px] font-mono ${charCount > 1950 ? "text-[#ff6b6b]" : "text-[#505070]"}`}>
              {2000 - charCount}
            </span>
          )}

          {/* Document upload */}
          <input ref={fileInputRef} type="file" accept=".txt,.pdf,.csv,.json,.md,.docx" onChange={handleFileChange} className="hidden"/>
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isLoading || uploadingDoc || isRecording || isTranscribing}
            title="Upload document"
            className="w-8 h-8 rounded-xl border border-[#1e1e2e] flex items-center justify-center text-[#505070] hover:border-[#7c7cff]/30 hover:text-[#7c7cff] hover:bg-[#7c7cff]/5 transition-all disabled:opacity-25 disabled:cursor-not-allowed"
          >
            {uploadingDoc ? (
              <div className="w-3.5 h-3.5 border border-[#7c7cff] border-t-transparent rounded-full animate-spin"/>
            ) : (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline points="14 2 14 8 20 8"/>
                <line x1="12" y1="18" x2="12" y2="12"/>
                <line x1="9" y1="15" x2="15" y2="15"/>
              </svg>
            )}
          </button>

          {/* Mic button */}
          <button
            onClick={isRecording ? stopRecording : startRecording}
            disabled={isLoading || isTranscribing || uploadingDoc}
            title={isRecording ? "Stop & transcribe" : "Record voice message"}
            className={`w-8 h-8 rounded-xl border flex items-center justify-center transition-all disabled:opacity-25 disabled:cursor-not-allowed ${
              isRecording
                ? "border-[#ff6b6b]/50 bg-[#ff6b6b]/15 text-[#ff6b6b]"
                : isTranscribing
                ? "border-[#ffb700]/30 bg-[#ffb700]/10 text-[#ffb700]"
                : "border-[#1e1e2e] text-[#505070] hover:border-[#ff6b6b]/30 hover:text-[#ff6b6b] hover:bg-[#ff6b6b]/5"
            }`}
          >
            {isTranscribing ? (
              <div className="w-3.5 h-3.5 border border-[#ffb700] border-t-transparent rounded-full animate-spin"/>
            ) : isRecording ? (
              /* Stop icon when recording */
              <svg width="12" height="12" viewBox="0 0 24 24" fill="#ff6b6b">
                <rect x="4" y="4" width="16" height="16" rx="2"/>
              </svg>
            ) : (
              /* Mic icon when idle */
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
                <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
                <line x1="12" y1="19" x2="12" y2="23"/>
                <line x1="8" y1="23" x2="16" y2="23"/>
              </svg>
            )}
          </button>

          {/* Deep Research */}
          <button
            onClick={onDeepResearch}
            disabled={!value.trim() || isLoading || isRecording || isTranscribing}
            title="Deep Research — 4 specialist agents"
            className="w-8 h-8 rounded-xl bg-[#ffb700]/10 border border-[#ffb700]/20 flex items-center justify-center hover:bg-[#ffb700]/20 hover:border-[#ffb700]/40 transition-all disabled:opacity-25 disabled:cursor-not-allowed"
          >
            <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
              <path d="M8 1L10 6H15L11 9.5L12.5 15L8 12L3.5 15L5 9.5L1 6H6L8 1Z" stroke="#ffb700" strokeWidth="1.2" strokeLinejoin="round"/>
            </svg>
          </button>

          {/* Send */}
          <button
            onClick={onSend}
            disabled={!value.trim() || isLoading || isRecording || isTranscribing}
            title="Send message"
            className="w-8 h-8 rounded-xl bg-[#00ff88]/10 border border-[#00ff88]/20 flex items-center justify-center hover:bg-[#00ff88]/20 hover:border-[#00ff88]/40 transition-all disabled:opacity-25 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <div className="w-3.5 h-3.5 border border-[#00ff88] border-t-transparent rounded-full animate-spin"/>
            ) : (
              <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
                <path d="M2 8L14 8M14 8L9 3M14 8L9 13" stroke="#00ff88" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            )}
          </button>
        </div>
      </div>

      <div className="flex items-center justify-between mt-1.5 px-1">
        <p className="text-[10px] text-[#252535] font-mono">
          Enter to send · ★ deep research · 🎤 voice · drag to upload
        </p>
      </div>
    </div>
  );
}
