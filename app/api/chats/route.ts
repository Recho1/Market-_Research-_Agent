import { NextRequest, NextResponse } from "next/server";
import { verifyJWT } from "@/lib/auth";
import { saveChat, loadUserChats, deleteChat } from "@/lib/chatStorage";

function getUser(req: NextRequest) {
  const token = req.cookies.get("aria_token")?.value || req.headers.get("authorization")?.replace("Bearer ", "");
  if (!token) return null;
  return verifyJWT(token);
}

export async function GET(req: NextRequest) {
  const payload = getUser(req);
  if (!payload) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const chats = loadUserChats(payload.userId);
  return NextResponse.json({ chats });
}

export async function POST(req: NextRequest) {
  const payload = getUser(req);
  if (!payload) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const chat = await req.json();
  saveChat(payload.userId, { ...chat, userId: payload.userId });
  return NextResponse.json({ success: true });
}

export async function DELETE(req: NextRequest) {
  const payload = getUser(req);
  if (!payload) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const { chatId } = await req.json();
  if (!chatId) return NextResponse.json({ error: "chatId required" }, { status: 400 });
  deleteChat(payload.userId, chatId);
  return NextResponse.json({ success: true });
}
