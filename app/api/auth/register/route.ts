import { NextRequest, NextResponse } from "next/server";
import { registerUser, sendOTPEmail } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const { name, email, password, role, industry } = await req.json();
    if (!name?.trim() || !email?.trim() || !password || !role || !industry) {
      return NextResponse.json({ error: "All fields are required" }, { status: 400 });
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: "Invalid email address" }, { status: 400 });
    }
    const { user, error } = await registerUser({ name, email, password, role, industry });
    if (error || !user) return NextResponse.json({ error }, { status: 400 });

    // Send OTP — result only logged server-side, never returned to client
    await sendOTPEmail(user);

    // Never include the OTP in the response
    return NextResponse.json({
      success: true,
      email:   user.email,
      message: `A 6-digit verification code has been sent to ${user.email}. Please check your inbox.`,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unexpected error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
