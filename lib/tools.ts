import { DynamicStructuredTool } from "@langchain/core/tools";
import { z } from "zod";
import type { Source } from "@/types";

async function serperSearch(query: string, num = 5): Promise<Source[]> {
  const apiKey = process.env.SERPER_API_KEY;
  if (!apiKey || apiKey === "your-serper-key-here") {
    return [{
      title: `${query} - Market Overview`,
      url: "https://example.com",
      snippet: `Sample result for: ${query}. Add SERPER_API_KEY for live data.`,
    }];
  }
  try {
    const res = await fetch("https://google.serper.dev/search", {
      method: "POST",
      headers: { "X-API-KEY": apiKey, "Content-Type": "application/json" },
      body: JSON.stringify({ q: query, num }),
    });
    const data = await res.json();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (data.organic || []).map((r: any) => ({
      title: r.title, url: r.link, snippet: r.snippet, publishedAt: r.date,
    }));
  } catch { return []; }
}

async function fetchFinancialData(symbol: string) {
  const apiKey = process.env.ALPHA_VANTAGE_API_KEY;
  if (!apiKey || apiKey === "your-alpha-vantage-key-here") {
    return { symbol, note: "Add ALPHA_VANTAGE_API_KEY for real data" };
  }
  try {
    const res = await fetch(
      `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${symbol}&apikey=${apiKey}`
    );
    const data = await res.json();
    const q = data["Global Quote"] || {};
    return {
      symbol,
      price: q["05. price"],
      change: q["09. change"],
      changePercent: q["10. change percent"],
      volume: q["06. volume"],
      latestDay: q["07. latest trading day"],
    };
  } catch { return { symbol, error: "Fetch failed" }; }
}

async function fetchExchangeRate(from: string, to: string): Promise<object> {
  const apiKey = process.env.EXCHANGE_RATE_API_KEY;
  if (!apiKey || apiKey === "your-exchange-rate-key-here") {
    const mockRates: Record<string, number> = {
      "USD-EUR": 0.92, "USD-GBP": 0.79, "USD-JPY": 149.5,
      "EUR-USD": 1.09, "GBP-USD": 1.27, "USD-UGX": 3750,
    };
    return {
      from, to,
      rate: mockRates[`${from}-${to}`] || 1.0,
      note: "Mock data. Add EXCHANGE_RATE_API_KEY for live rates.",
    };
  }
  try {
    const res = await fetch(
      `https://v6.exchangerate-api.com/v6/${apiKey}/pair/${from}/${to}`
    );
    const data = await res.json();
    return { from, to, rate: data.conversion_rate, lastUpdated: data.time_last_update_utc };
  } catch { return { from, to, error: "Fetch failed" }; }
}

export const webSearchTool = new DynamicStructuredTool({
  name: "web_search",
  description: "Search the web for current market news, reports, and research data.",
  schema: z.object({
    query: z.string().describe("Search query"),
    focus: z.enum(["news", "reports", "statistics", "general"]).default("general"),
  }),
  async func({ query, focus }) {
    const q = focus === "news" ? `${query} latest news 2025`
      : focus === "reports" ? `${query} market report 2025`
      : focus === "statistics" ? `${query} market size statistics`
      : query;
    const sources = await serperSearch(q, 6);
    return JSON.stringify({ query: q, results: sources });
  },
});

export const competitorAnalysisTool = new DynamicStructuredTool({
  name: "competitor_analysis",
  description: "Analyze competitors in a specific market or industry.",
  schema: z.object({
    industry: z.string(),
    region: z.string().default("global"),
    topN: z.number().default(5),
  }),
  async func({ industry, region, topN }) {
    const sources = await serperSearch(`top ${topN} competitors ${industry} ${region} 2025`, 8);
    return JSON.stringify({ industry, region, sources });
  },
});

export const marketSizingTool = new DynamicStructuredTool({
  name: "market_sizing",
  description: "Estimate market size, TAM/SAM/SOM, and growth rates.",
  schema: z.object({
    market: z.string(),
    metric: z.enum(["TAM", "SAM", "SOM", "CAGR", "all"]).default("all"),
    timeframe: z.string().default("2024-2030"),
  }),
  async func({ market, metric, timeframe }) {
    const sources = await serperSearch(`${market} market size ${metric} ${timeframe}`, 6);
    return JSON.stringify({ market, metric, timeframe, sources });
  },
});

export const trendAnalysisTool = new DynamicStructuredTool({
  name: "trend_analysis",
  description: "Identify emerging trends, shifts, and market dynamics.",
  schema: z.object({
    topic: z.string(),
    horizon: z.enum(["short-term", "medium-term", "long-term"]).default("medium-term"),
    category: z.enum(["technology", "consumer", "regulatory", "economic", "all"]).default("all"),
  }),
  async func({ topic, horizon, category }) {
    const period = horizon === "short-term" ? "2025"
      : horizon === "medium-term" ? "2025-2027" : "2025-2030";
    const sources = await serperSearch(`${topic} ${category} trends ${period}`, 6);
    return JSON.stringify({ topic, horizon, period, sources });
  },
});

export const financialDataTool = new DynamicStructuredTool({
  name: "financial_data",
  description: "Fetch live stock prices and financial metrics for public companies.",
  schema: z.object({
    symbols: z.array(z.string()).describe("Stock tickers e.g. AAPL, MSFT"),
    includeNews: z.boolean().default(true),
  }),
  async func({ symbols, includeNews }) {
    const quotes = await Promise.all(symbols.map(fetchFinancialData));
    const news = includeNews
      ? await serperSearch(`${symbols.join(" ")} earnings results 2025`, 4)
      : [];
    return JSON.stringify({ quotes, news, timestamp: new Date().toISOString() });
  },
});

export const swotAnalysisTool = new DynamicStructuredTool({
  name: "swot_analysis",
  description: "Perform a SWOT analysis for a company, product, or market entry.",
  schema: z.object({
    subject: z.string(),
    context: z.string().optional(),
  }),
  async func({ subject, context }) {
    const sources = await serperSearch(
      `${subject} ${context || ""} competitive analysis strengths weaknesses 2025`, 5
    );
    return JSON.stringify({ subject, context, sources });
  },
});

export const newsSentimentTool = new DynamicStructuredTool({
  name: "news_sentiment",
  description: "Analyze news sentiment and media coverage for a company or industry.",
  schema: z.object({
    subject: z.string().describe("Company name, industry, or topic to analyze"),
    timeframe: z.string().default("last 7 days"),
  }),
  async func({ subject, timeframe }) {
    const [positive, negative, neutral] = await Promise.all([
      serperSearch(`${subject} positive news growth success ${timeframe}`, 3),
      serperSearch(`${subject} negative news risk challenge ${timeframe}`, 3),
      serperSearch(`${subject} market update analysis ${timeframe}`, 3),
    ]);
    return JSON.stringify({
      subject, timeframe,
      sentiment: { positive: positive.slice(0, 3), negative: negative.slice(0, 3), neutral: neutral.slice(0, 3) },
      instruction: "Analyze these headlines and provide: overall sentiment score (Bullish/Neutral/Bearish), key themes, and strategic implications.",
    });
  },
});

export const industryReportsTool = new DynamicStructuredTool({
  name: "industry_reports",
  description: "Fetch and summarize professional industry reports from McKinsey, Gartner, Deloitte, and PwC.",
  schema: z.object({
    industry: z.string(),
    reportType: z.enum(["overview", "forecast", "competitive", "technology", "regulation"]).default("overview"),
  }),
  async func({ industry, reportType }) {
    const sources = await Promise.all([
      serperSearch(`${industry} ${reportType} report McKinsey Gartner Deloitte 2025`, 3),
      serperSearch(`${industry} ${reportType} analysis PwC BCG Forrester 2025`, 3),
      serperSearch(`${industry} industry outlook forecast 2025 2026`, 3),
    ]);
    return JSON.stringify({
      industry, reportType,
      sources: { tier1: sources[0], tier2: sources[1], forecasts: sources[2] },
      instruction: "Synthesize these reports into a structured industry brief with key findings, growth drivers, risks, and strategic recommendations.",
    });
  },
});

export const currencyExchangeTool = new DynamicStructuredTool({
  name: "currency_exchange",
  description: "Get live currency exchange rates and analyze forex implications for international market entry.",
  schema: z.object({
    baseCurrency: z.string().describe("Base currency code e.g. USD, EUR, GBP"),
    targetCurrencies: z.array(z.string()).describe("Target currency codes e.g. EUR, JPY, GBP"),
    context: z.string().optional().describe("Business context e.g. market entry, pricing strategy"),
  }),
  async func({ baseCurrency, targetCurrencies, context }) {
    const rates = await Promise.all(
      targetCurrencies.map(target => fetchExchangeRate(baseCurrency, target))
    );
    const news = await serperSearch(
      `${baseCurrency} forex market outlook ${targetCurrencies.join(" ")} 2025`, 3
    );
    return JSON.stringify({
      baseCurrency, rates,
      context: context || "General forex analysis",
      marketNews: news,
      instruction: "Provide exchange rate analysis with business implications for the given context, including currency risk assessment and hedging recommendations.",
    });
  },
});

export const ALL_TOOLS = [
  webSearchTool, competitorAnalysisTool, marketSizingTool,
  trendAnalysisTool, financialDataTool, swotAnalysisTool,
  newsSentimentTool, industryReportsTool, currencyExchangeTool,
];

export const TOOL_MAP = {
  web_search:          webSearchTool,
  competitor_analysis: competitorAnalysisTool,
  market_sizing:       marketSizingTool,
  trend_analysis:      trendAnalysisTool,
  financial_data:      financialDataTool,
  swot_analysis:       swotAnalysisTool,
  news_sentiment:      newsSentimentTool,
  industry_reports:    industryReportsTool,
  currency_exchange:   currencyExchangeTool,
};

export const TOOL_CONFIGS = [
  { name: "web_search"          as const, label: "Web Search",         icon: "[S]", description: "Real-time market news and data",        category: "core",   enabled: true  },
  { name: "competitor_analysis" as const, label: "Competitor Analysis", icon: "[C]", description: "Map competitive landscapes",            category: "core",   enabled: true  },
  { name: "market_sizing"       as const, label: "Market Sizing",       icon: "[M]", description: "TAM/SAM/SOM projections",               category: "core",   enabled: true  },
  { name: "trend_analysis"      as const, label: "Trend Analysis",      icon: "[T]", description: "Emerging shifts and dynamics",          category: "core",   enabled: true  },
  { name: "financial_data"      as const, label: "Financial Data",      icon: "[F]", description: "Live stock prices and metrics",         category: "core",   enabled: true  },
  { name: "swot_analysis"       as const, label: "SWOT Analysis",       icon: "[W]", description: "Strategic SWOT framework",              category: "core",   enabled: true  },
  { name: "news_sentiment"      as const, label: "News Sentiment",      icon: "[N]", description: "Media sentiment and coverage",          category: "plugin", enabled: false },
  { name: "industry_reports"    as const, label: "Industry Reports",    icon: "[R]", description: "McKinsey, Gartner, Deloitte",           category: "plugin", enabled: false },
  { name: "currency_exchange"   as const, label: "Currency Exchange",   icon: "[X]", description: "Live forex rates and analysis",        category: "plugin", enabled: false },
];
