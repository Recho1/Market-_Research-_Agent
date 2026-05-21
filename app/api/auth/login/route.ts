import { NextRequest, NextResponse } from "next/server";
import { loginUser } from "@/lib/auth";
import { checkRateLimit, resetRateLimit } from "@/lib/rateLimiter";

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();
    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
    }

    // Get client IP for IP-based rate limiting
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0] ||
               req.headers.get("x-real-ip") ||
               "unknown";

    // Check rate limit by IP
    const ipCheck = checkRateLimit("login_ip", ip);
    if (!ipCheck.allowed) {
      return NextResponse.json({ error: ipCheck.error }, { status: 429 });
    }

    // Check rate limit by email
    const emailCheck = checkRateLimit("login_email", email);
    if (!emailCheck.allowed) {
      return NextResponse.json({ error: emailCheck.error }, { status: 429 });
    }

    const { user, token, error } = await loginUser({ email, password });

    if (error || !user || !token) {
      return NextResponse.json({ error }, { status: 401 });
    }

    // Success — reset rate limits
    resetRateLimit("login_ip",    ip);
    resetRateLimit("login_email", email);

    const response = NextResponse.json({
      success: true,
      token,
      user: {
        id:          user.id,
        name:        user.name,
        email:       user.email,
        role:        user.role,
        industry:    user.industry,
        verified:    user.verified,
        preferences: user.preferences,
        createdAt:   user.createdAt,
        lastLogin:   user.lastLogin,
        isNewUser:   false,
      },
    });

    response.cookies.set("aria_token", token, {
      httpOnly: true,
      secure:   process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge:   7 * 24 * 60 * 60,
      path:     "/",
    });

    return response;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unexpected error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
