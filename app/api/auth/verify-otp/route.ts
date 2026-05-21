import { NextRequest, NextResponse } from "next/server";
import { verifyOTP } from "@/lib/auth";
import { checkRateLimit, resetRateLimit } from "@/lib/rateLimiter";

export async function POST(req: NextRequest) {
  try {
    const { email, otp } = await req.json();
    if (!email || !otp) {
      return NextResponse.json({ error: "Email and OTP are required" }, { status: 400 });
    }

    const ip = req.headers.get("x-forwarded-for")?.split(",")[0] ||
               req.headers.get("x-real-ip") ||
               "unknown";

    // Rate limit OTP attempts — max 5 per 15 minutes per email
    // This prevents brute-forcing the 1,000,000 OTP combinations
    const ipCheck = checkRateLimit("otp_ip", ip);
    if (!ipCheck.allowed) {
      return NextResponse.json({ error: ipCheck.error }, { status: 429 });
    }

    const emailCheck = checkRateLimit("otp_email", email);
    if (!emailCheck.allowed) {
      return NextResponse.json({ error: emailCheck.error }, { status: 429 });
    }

    const { user, token, error } = verifyOTP(email, otp);

    if (error || !user || !token) {
      return NextResponse.json({ error }, { status: 400 });
    }

    // Success — reset rate limits
    resetRateLimit("otp_ip",    ip);
    resetRateLimit("otp_email", email);

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
        isNewUser:   true,
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
