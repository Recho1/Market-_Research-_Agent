import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 30;

export async function POST(req: NextRequest) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ error: "OpenAI API key not configured" }, { status: 500 });
    }

    const formData = await req.formData();
    const file     = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No audio file provided" }, { status: 400 });
    }

    console.log(`[Transcribe] Received: ${file.name}, size: ${file.size} bytes, type: ${file.type}`);

    // Forward to OpenAI Whisper
    const openaiForm = new FormData();
    openaiForm.append("file", file, file.name || "recording.webm");
    openaiForm.append("model", "whisper-1");

    const res = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method:  "POST",
      headers: { "Authorization": `Bearer ${process.env.OPENAI_API_KEY}` },
      body:    openaiForm,
    });

    if (!res.ok) {
      const err = await res.text();
      console.error("[Transcribe] Whisper error:", err);
      return NextResponse.json({ error: "Transcription failed", details: err }, { status: 500 });
    }

    const data = await res.json();
    console.log(`[Transcribe] Result: "${data.text}"`);
    return NextResponse.json({ text: data.text || "" });

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[Transcribe] Error:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
