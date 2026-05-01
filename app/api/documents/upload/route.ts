import { NextRequest, NextResponse } from "next/server";
import { uploadDocumentToRAG } from "@/lib/rag";

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const { content, filename, userId } = await req.json();

    if (!content || !filename) {
      return NextResponse.json({ error: "Content and filename are required" }, { status: 400 });
    }

    if (content.length > 50000) {
      return NextResponse.json({ error: "Document too large. Maximum 50,000 characters." }, { status: 400 });
    }

    const result = await uploadDocumentToRAG(content, filename, userId || "anonymous");

    return NextResponse.json({
      success: result.success,
      chunks:  result.chunks,
      message: result.success
        ? `Document "${filename}" uploaded and indexed with ${result.chunks} chunks.`
        : "Failed to upload document.",
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unexpected error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
