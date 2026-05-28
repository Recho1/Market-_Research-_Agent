import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET() {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Check users table
    const { count: userCount, error: userError } = await supabase
      .from("users")
      .select("*", { count: "exact", head: true });

    // Check chats table
    const { count: chatCount, error: chatError } = await supabase
      .from("chats")
      .select("*", { count: "exact", head: true });

    // Check documents table (RAG)
    const { count: docCount, error: docError } = await supabase
      .from("documents")
      .select("*", { count: "exact", head: true });

    // Get latest 3 users
    const { data: latestUsers } = await supabase
      .from("users")
      .select("id, name, email, verified, created_at")
      .order("created_at", { ascending: false })
      .limit(3);

    return NextResponse.json({
      status:    "connected",
      supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
      tables: {
        users: {
          count: userCount,
          error: userError?.message || null,
          latest: latestUsers || [],
        },
        chats: {
          count: chatCount,
          error: chatError?.message || null,
        },
        documents: {
          count: docCount,
          error: docError?.message || null,
        },
      },
    });
  } catch (err) {
    return NextResponse.json({
      status: "error",
      error:  String(err),
    }, { status: 500 });
  }
}
