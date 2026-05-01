import { NextRequest, NextResponse } from "next/server";
import { verifyUser } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");

  if (!token) {
    return new NextResponse(
      `<!DOCTYPE html><html><body style="background:#0a0a0f;color:#e8e8f0;font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;">
        <div style="text-align:center;background:#0d0d14;border:1px solid #ff6b6b;border-radius:16px;padding:48px;max-width:400px;">
          <div style="color:#ff6b6b;font-size:48px;margin-bottom:16px;">✗</div>
          <h1 style="color:#ff6b6b;">Invalid Link</h1>
          <p style="color:#808090;">This verification link is invalid or missing.</p>
          <a href="/" style="display:inline-block;margin-top:24px;background:rgba(0,255,136,0.1);border:1px solid rgba(0,255,136,0.3);color:#00ff88;padding:12px 24px;border-radius:10px;text-decoration:none;">Go to ARIA</a>
        </div>
      </body></html>`,
      { status: 400, headers: { "Content-Type": "text/html" } }
    );
  }

  const user = verifyUser(token);

  if (!user) {
    return new NextResponse(
      `<!DOCTYPE html><html><body style="background:#0a0a0f;color:#e8e8f0;font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;">
        <div style="text-align:center;background:#0d0d14;border:1px solid #ff6b6b;border-radius:16px;padding:48px;max-width:400px;">
          <div style="color:#ff6b6b;font-size:48px;margin-bottom:16px;">✗</div>
          <h1 style="color:#ff6b6b;">Link Expired</h1>
          <p style="color:#808090;">This verification link has expired or already been used.</p>
          <a href="/" style="display:inline-block;margin-top:24px;background:rgba(0,255,136,0.1);border:1px solid rgba(0,255,136,0.3);color:#00ff88;padding:12px 24px;border-radius:10px;text-decoration:none;">Go to ARIA</a>
        </div>
      </body></html>`,
      { status: 400, headers: { "Content-Type": "text/html" } }
    );
  }

  return new NextResponse(
    `<!DOCTYPE html><html><body style="background:#0a0a0f;color:#e8e8f0;font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;">
      <div style="text-align:center;background:#0d0d14;border:1px solid rgba(0,255,136,0.3);border-radius:16px;padding:48px;max-width:400px;">
        <div style="color:#00ff88;font-size:48px;margin-bottom:16px;">✓</div>
        <h1 style="color:#00ff88;">Email Verified!</h1>
        <p style="color:#808090;">Welcome, ${user.name}! Your ARIA account is now active.</p>
        <p style="color:#505070;font-size:13px;">Sign in with your email to start researching.</p>
        <a href="/" style="display:inline-block;margin-top:24px;background:rgba(0,255,136,0.1);border:1px solid rgba(0,255,136,0.3);color:#00ff88;padding:12px 24px;border-radius:10px;text-decoration:none;font-weight:600;">Enter ARIA →</a>
      </div>
    </body></html>`,
    { status: 200, headers: { "Content-Type": "text/html" } }
  );
}
