import { NextRequest, NextResponse } from "next/server";
import { verifyOTP } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const { email, otp } = await req.json();
    if (!email || !otp) return NextResponse.json({ error: "Email and OTP are required" }, { status: 400 });

    const { user, token, error } = verifyOTP(email, otp);
    if (error || !user || !token) return NextResponse.json({ error }, { status: 400 });

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
