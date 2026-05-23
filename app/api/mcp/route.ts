import { NextRequest, NextResponse } from "next/server";
import { getMCPClient } from "@/lib/mcpClient";

export async function GET(req: NextRequest) {
  try {
    const client      = await getMCPClient();
    const { tools }   = await client.listTools();

    return NextResponse.json({
      server:     "ARIA Market Research MCP Server",
      version:    "1.0.0",
      toolsCount: tools.length,
      tools:      tools.map(t => ({
        name:        t.name,
        description: t.description,
        inputSchema: t.inputSchema,
      })),
    });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
