import { NextRequest, NextResponse } from "next/server";
import { resendOTP, sendOTPEmail } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();
    if (!email) return NextResponse.json({ error: "Email is required" }, { status: 400 });

    const { user, error } = resendOTP(email);
    if (error || !user) return NextResponse.json({ error }, { status: 400 });

    // Send new OTP — never returned to client
    await sendOTPEmail(user);

    return NextResponse.json({
      success: true,
      message: "A new verification code has been sent to your email.",
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unexpected error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
