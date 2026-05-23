import { Client }              from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport }   from "@modelcontextprotocol/sdk/inMemory.js";
import { mcpServer }           from "./mcpServer";
import { DynamicStructuredTool } from "@langchain/core/tools";
import { z }                   from "zod";

let mcpClient: Client | null = null;

// ── Initialize MCP client connected to MCP server via in-memory transport ─────
export async function getMCPClient(): Promise<Client> {
  if (mcpClient) return mcpClient;

  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();

  mcpClient = new Client({ name: "aria-agent", version: "1.0.0" });

  // Connect server and client via in-memory transport
  await Promise.all([
    mcpServer.connect(serverTransport),
    mcpClient.connect(clientTransport),
  ]);

  console.log("[MCP] Client connected to ARIA MCP server");
  return mcpClient;
}

// ── Convert MCP tools to LangChain tools for use in LangGraph ─────────────────
export async function getMCPToolsAsLangChain(): Promise<DynamicStructuredTool[]> {
  const client    = await getMCPClient();
  const { tools } = await client.listTools();

  console.log(`[MCP] Loaded ${tools.length} tools from MCP server:`, tools.map(t => t.name).join(", "));

  return tools.map((tool) => {
    // Build a Zod schema from MCP tool input schema
    const schema = buildZodSchema(tool.inputSchema);

    return new DynamicStructuredTool({
      name:        tool.name,
      description: tool.description || tool.name,
      schema,
      func: async (input: Record<string, unknown>) => {
        // Call the MCP tool through the client
        const result = await client.callTool({
          name:      tool.name,
          arguments: input,
        });

        // Extract text content from MCP response
        const text = result.content
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .filter((c: any) => c.type === "text")
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .map((c: any) => c.text)
          .join("\n");

        console.log(`[MCP] Tool "${tool.name}" executed successfully`);
        return text;
      },
    });
  });
}

// ── Build Zod schema from MCP JSON Schema ─────────────────────────────────────
function buildZodSchema(inputSchema: Record<string, unknown>): z.ZodObject<z.ZodRawShape> {
  const properties = (inputSchema?.properties as Record<string, { type: string; description?: string; enum?: string[]; default?: unknown }>) || {};
  const required   = (inputSchema?.required as string[]) || [];
  const shape: z.ZodRawShape = {};

  for (const [key, prop] of Object.entries(properties)) {
    let field: z.ZodTypeAny;

    if (prop.enum) {
      // Enum field
      const enumValues = prop.enum as [string, ...string[]];
      field = z.enum(enumValues).describe(prop.description || key);
    } else if (prop.type === "string") {
      field = z.string().describe(prop.description || key);
    } else if (prop.type === "number") {
      field = z.number().describe(prop.description || key);
    } else if (prop.type === "boolean") {
      field = z.boolean().describe(prop.description || key);
    } else if (prop.type === "array") {
      field = z.array(z.string()).describe(prop.description || key);
    } else {
      field = z.unknown().describe(prop.description || key);
    }

    // Apply default if present
    if (prop.default !== undefined) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      field = (field as any).default(prop.default);
    }

    // Make optional if not in required list
    if (!required.includes(key)) {
      field = field.optional();
    }

    shape[key] = field;
  }

  return z.object(shape);
}
