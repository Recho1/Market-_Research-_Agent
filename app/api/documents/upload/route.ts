import { NextRequest, NextResponse } from "next/server";
import { uploadDocumentToRAG } from "@/lib/rag";
import { verifyJWT } from "@/lib/auth";
import { checkRateLimit } from "@/lib/rateLimiter";

export const maxDuration = 60;

// Known adversarial prompt injection patterns
const INJECTION_PATTERNS = [
  /ignore\s+(all\s+)?previous\s+instructions/gi,
  /you\s+are\s+now\s+a/gi,
  /system\s*:\s*you/gi,
  /forget\s+(everything|all)/gi,
  /new\s+instructions?:/gi,
  /disregard\s+(your|all|previous)/gi,
  /\[system\]/gi,
  /\[assistant\]/gi,
  /<\|im_start\|>/gi,
  /<\|im_end\|>/gi,
  /###\s*instruction/gi,
  /act\s+as\s+(if\s+you\s+are|a)/gi,
];

function sanitiseContent(content: string): { safe: boolean; reason?: string; cleaned: string } {
  // Check for prompt injection patterns
  for (const pattern of INJECTION_PATTERNS) {
    if (pattern.test(content)) {
      return {
        safe:    false,
        reason:  "Document contains content that could manipulate AI responses.",
        cleaned: "",
      };
    }
  }

  // Strip null bytes and control characters (except newlines and tabs)
  const cleaned = content
    .replace(/\0/g, "")
    .replace(/[\x01-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "")
    .trim();

  // Check if content is meaningful (not just whitespace or symbols)
  if (cleaned.length < 10) {
    return { safe: false, reason: "Document content too short or empty.", cleaned: "" };
  }

  return { safe: true, cleaned };
}

export async function POST(req: NextRequest) {
  try {
    // Authenticate user
    const token   = req.cookies.get("aria_token")?.value ||
                    req.headers.get("authorization")?.replace("Bearer ", "");
    const payload = token ? verifyJWT(token) : null;
    const userId  = payload?.userId || "anonymous";

    // Rate limit uploads per user — max 10 per hour
    const uploadCheck = checkRateLimit("upload_user", userId);
    if (!uploadCheck.allowed) {
      return NextResponse.json({ error: uploadCheck.error }, { status: 429 });
    }

    const { content, filename } = await req.json();

    if (!content || !filename) {
      return NextResponse.json({ error: "Content and filename are required" }, { status: 400 });
    }

    if (content.length > 50000) {
      return NextResponse.json({ error: "Document too large. Maximum 50,000 characters." }, { status: 400 });
    }

    // Sanitise content before inserting into vector database
    const { safe, reason, cleaned } = sanitiseContent(content);
    if (!safe) {
      return NextResponse.json({ error: reason }, { status: 400 });
    }

    // Tag as user-uploaded so it can be weighted or reviewed separately
    const result = await uploadDocumentToRAG(
      cleaned,
      filename,
      userId,
    );

    return NextResponse.json({
      success: result.success,
      chunks:  result.chunks,
      message: result.success
        ? `Document uploaded and indexed with ${result.chunks} chunks.`
        : "Failed to upload document.",
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unexpected error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
