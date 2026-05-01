import { NextRequest, NextResponse } from "next/server";
import { verifyJWT, getUserById } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    const token = req.cookies.get("aria_token")?.value || req.headers.get("authorization")?.replace("Bearer ", "");
    if (!token) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

    const payload = verifyJWT(token);
    if (!payload) return NextResponse.json({ error: "Invalid or expired token" }, { status: 401 });

    const user = getUserById(payload.userId);
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    return NextResponse.json({
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
      },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unexpected error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
