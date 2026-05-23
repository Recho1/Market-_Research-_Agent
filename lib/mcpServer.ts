import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

// ── Create MCP Server ─────────────────────────────────────────────────────────
export const mcpServer = new McpServer({
  name:    "ARIA Market Research",
  version: "1.0.0",
});

// ── Serper web search helper ──────────────────────────────────────────────────
async function serperSearch(query: string, num = 5) {
  const apiKey = process.env.SERPER_API_KEY;
  if (!apiKey || apiKey === "your-serper-key-here") {
    return [{ title: `${query} — Market Overview`, url: "https://example.com", snippet: `Sample result for: ${query}. Add SERPER_API_KEY for live data.` }];
  }
  try {
    const res  = await fetch("https://google.serper.dev/search", {
      method:  "POST",
      headers: { "X-API-KEY": apiKey, "Content-Type": "application/json" },
      body:    JSON.stringify({ q: query, num }),
    });
    const data = await res.json();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (data.organic || []).map((r: any) => ({
      title: r.title, url: r.link, snippet: r.snippet, publishedAt: r.date,
    }));
  } catch { return []; }
}

// ── Tool 1: Web Search ────────────────────────────────────────────────────────
mcpServer.tool(
  "web_search",
  "Search the web for current market news, reports, and research data in real time",
  {
    query: z.string().describe("Search query"),
    focus: z.enum(["news", "reports", "statistics", "general"]).default("general").describe("Type of search"),
  },
  async ({ query, focus }) => {
    const q = focus === "news"       ? `${query} latest news 2025`
            : focus === "reports"    ? `${query} market report 2025`
            : focus === "statistics" ? `${query} market size statistics`
            : query;
    const results = await serperSearch(q, 6);
    return {
      content: [{ type: "text", text: JSON.stringify({ query: q, results }) }],
    };
  }
);

// ── Tool 2: Competitor Analysis ───────────────────────────────────────────────
mcpServer.tool(
  "competitor_analysis",
  "Analyze and map competitors in a specific market or industry",
  {
    industry: z.string().describe("Industry or market to analyze"),
    region:   z.string().default("global").describe("Geographic region"),
    topN:     z.number().default(5).describe("Number of top competitors to find"),
  },
  async ({ industry, region, topN }) => {
    const results = await serperSearch(`top ${topN} competitors ${industry} ${region} 2025`, 8);
    return {
      content: [{ type: "text", text: JSON.stringify({ industry, region, results }) }],
    };
  }
);

// ── Tool 3: Market Sizing ─────────────────────────────────────────────────────
mcpServer.tool(
  "market_sizing",
  "Estimate market size, TAM, SAM, SOM, and CAGR growth projections",
  {
    market:    z.string().describe("Market or industry to size"),
    metric:    z.enum(["TAM", "SAM", "SOM", "CAGR", "all"]).default("all"),
    timeframe: z.string().default("2024-2030").describe("Projection timeframe"),
  },
  async ({ market, metric, timeframe }) => {
    const results = await serperSearch(`${market} market size ${metric} ${timeframe}`, 6);
    return {
      content: [{ type: "text", text: JSON.stringify({ market, metric, timeframe, results }) }],
    };
  }
);

// ── Tool 4: Trend Analysis ────────────────────────────────────────────────────
mcpServer.tool(
  "trend_analysis",
  "Identify emerging trends, market shifts, and industry dynamics",
  {
    topic:    z.string().describe("Topic or industry to analyze"),
    horizon:  z.enum(["short-term", "medium-term", "long-term"]).default("medium-term"),
    category: z.enum(["technology", "consumer", "regulatory", "economic", "all"]).default("all"),
  },
  async ({ topic, horizon, category }) => {
    const period = horizon === "short-term" ? "2025" : horizon === "medium-term" ? "2025-2027" : "2025-2030";
    const results = await serperSearch(`${topic} ${category} trends ${period}`, 6);
    return {
      content: [{ type: "text", text: JSON.stringify({ topic, horizon, period, results }) }],
    };
  }
);

// ── Tool 5: Financial Data ────────────────────────────────────────────────────
mcpServer.tool(
  "financial_data",
  "Fetch live stock prices and financial metrics for public companies",
  {
    symbols:     z.array(z.string()).describe("Stock ticker symbols e.g. AAPL MSFT NVDA"),
    includeNews: z.boolean().default(true).describe("Include recent financial news"),
  },
  async ({ symbols, includeNews }) => {
    const apiKey = process.env.ALPHA_VANTAGE_API_KEY;
    const quotes = await Promise.all(symbols.map(async (symbol) => {
      if (!apiKey || apiKey === "your-alpha-vantage-key-here") {
        return { symbol, note: "Add ALPHA_VANTAGE_API_KEY for real data" };
      }
      try {
        const res  = await fetch(`https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${symbol}&apikey=${apiKey}`);
        const data = await res.json();
        const q    = data["Global Quote"] || {};
        return { symbol, price: q["05. price"], change: q["09. change"], changePercent: q["10. change percent"], volume: q["06. volume"] };
      } catch { return { symbol, error: "Fetch failed" }; }
    }));
    const news = includeNews ? await serperSearch(`${symbols.join(" ")} earnings results 2025`, 4) : [];
    return {
      content: [{ type: "text", text: JSON.stringify({ quotes, news, timestamp: new Date().toISOString() }) }],
    };
  }
);

// ── Tool 6: SWOT Analysis ─────────────────────────────────────────────────────
mcpServer.tool(
  "swot_analysis",
  "Perform a SWOT analysis for a company, product, or market entry opportunity",
  {
    subject: z.string().describe("Company, product, or market to analyze"),
    context: z.string().optional().describe("Additional context e.g. market entry, competitive positioning"),
  },
  async ({ subject, context }) => {
    const results = await serperSearch(`${subject} ${context || ""} competitive analysis strengths weaknesses opportunities threats 2025`, 5);
    return {
      content: [{ type: "text", text: JSON.stringify({ subject, context, results }) }],
    };
  }
);

// ── Tool 7: News Sentiment ────────────────────────────────────────────────────
mcpServer.tool(
  "news_sentiment",
  "Analyze news sentiment and media coverage for a company or industry",
  {
    subject:   z.string().describe("Company, industry, or topic to analyze"),
    timeframe: z.string().default("last 7 days").describe("Time period for analysis"),
  },
  async ({ subject, timeframe }) => {
    const [positive, negative, neutral] = await Promise.all([
      serperSearch(`${subject} positive news growth success ${timeframe}`, 3),
      serperSearch(`${subject} negative news risk challenge ${timeframe}`, 3),
      serperSearch(`${subject} market update analysis ${timeframe}`, 3),
    ]);
    return {
      content: [{ type: "text", text: JSON.stringify({ subject, timeframe, sentiment: { positive, negative, neutral } }) }],
    };
  }
);

// ── Tool 8: Industry Reports ──────────────────────────────────────────────────
mcpServer.tool(
  "industry_reports",
  "Fetch professional industry reports from McKinsey, Gartner, Deloitte, PwC, and Forrester",
  {
    industry:   z.string().describe("Industry to research"),
    reportType: z.enum(["overview", "forecast", "competitive", "technology", "regulation"]).default("overview"),
  },
  async ({ industry, reportType }) => {
    const [tier1, tier2, forecasts] = await Promise.all([
      serperSearch(`${industry} ${reportType} report McKinsey Gartner Deloitte 2025`, 3),
      serperSearch(`${industry} ${reportType} analysis PwC BCG Forrester 2025`, 3),
      serperSearch(`${industry} industry outlook forecast 2025 2026`, 3),
    ]);
    return {
      content: [{ type: "text", text: JSON.stringify({ industry, reportType, sources: { tier1, tier2, forecasts } }) }],
    };
  }
);

// ── Tool 9: Currency Exchange ─────────────────────────────────────────────────
mcpServer.tool(
  "currency_exchange",
  "Get live currency exchange rates and analyze forex implications for international market entry",
  {
    baseCurrency:      z.string().describe("Base currency code e.g. USD EUR GBP"),
    targetCurrencies:  z.array(z.string()).describe("Target currency codes e.g. KES UGX NGN"),
    context:           z.string().optional().describe("Business context e.g. market entry pricing strategy"),
  },
  async ({ baseCurrency, targetCurrencies, context }) => {
    const apiKey = process.env.EXCHANGE_RATE_API_KEY;
    const rates  = await Promise.all(targetCurrencies.map(async (target) => {
      if (!apiKey || apiKey === "your-exchange-rate-key-here") {
        return { from: baseCurrency, to: target, rate: 1.0, note: "Add EXCHANGE_RATE_API_KEY for live rates" };
      }
      try {
        const res  = await fetch(`https://v6.exchangerate-api.com/v6/${apiKey}/pair/${baseCurrency}/${target}`);
        const data = await res.json();
        return { from: baseCurrency, to: target, rate: data.conversion_rate };
      } catch { return { from: baseCurrency, to: target, error: "Fetch failed" }; }
    }));
    const news = await serperSearch(`${baseCurrency} forex market outlook ${targetCurrencies.join(" ")} 2025`, 3);
    return {
      content: [{ type: "text", text: JSON.stringify({ baseCurrency, rates, context, marketNews: news }) }],
    };
  }
);

console.log("[MCP] ARIA MCP Server initialized with 9 research tools");
