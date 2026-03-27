# ARIA — Advanced Research & Intelligence Agent

> A production-grade AI-powered market research platform built with Next.js 14, LangGraph, and OpenAI GPT-4o. ARIA deploys specialized agents to analyze markets, map competitors, size opportunities, and generate strategic intelligence in real time.

![Next.js](https://img.shields.io/badge/Next.js-14-black?style=flat-square)
![LangGraph](https://img.shields.io/badge/LangGraph-1.2.4-blue?style=flat-square)
![OpenAI](https://img.shields.io/badge/OpenAI-GPT--4o-green?style=flat-square)
![Supabase](https://img.shields.io/badge/Supabase-pgvector-orange?style=flat-square)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?style=flat-square)

---

## What ARIA Does

ARIA is a full-stack AI agent platform for market research. It combines real-time web search, financial data APIs, a vector knowledge base, and multi-agent coordination to deliver research-grade insights on any market, competitor, or industry.

---

## Implemented Features

### 1. AI Agent (LangGraph ReAct)
- LangGraph `StateGraph` with a ReAct loop — Reason, Act, Observe, Repeat
- Agent decides which tools to call based on the query
- Conditional edge — loops through tools until final answer
- Retry logic with exponential backoff for 429, 500, 503, and timeout errors
- Supports GPT-4o, GPT-4o Mini, GPT-4 Turbo, GPT-3.5 Turbo

### 2. Multi-Agent Deep Research
- Click the star button to deploy 4 specialist agents in parallel
- **Market Data Analyst** — market sizes, CAGR, growth projections
- **Competitive Intelligence** — key players, positioning, advantages
- **Strategy Advisor** — market entry, GTM, strategic recommendations
- **Risk Analyst** — regulatory risks, threats, mitigation strategies
- **Orchestrator** (GPT-4o) synthesizes all outputs into a structured report
- Uses `Promise.allSettled` for parallel execution

### 3. RAG — Retrieval Augmented Generation
- Supabase pgvector as persistent vector store
- OpenAI `text-embedding-3-small` for document embeddings
- Cosine similarity search via `match_documents` SQL function
- Knowledge base auto-seeded on first run with 6 domains:
  - Market Sizing Frameworks (TAM/SAM/SOM, CAGR)
  - Competitive Analysis (Porter's Five Forces, SWOT)
  - Industry Trends 2025 (AI, FinTech, Healthcare, SaaS)
  - Financial Metrics (P/E, EV/EBITDA, ARR, LTV/CAC)
  - Market Entry Strategy (GTM, geographic expansion)
  - Investment & Due Diligence (VC criteria, deal stages)
- Custom documents can be added to the knowledge base at runtime

### 4. 9 Research Tools (Plugin System)
**Core Tools (always on):**
- `web_search` — Real-time Google Search via Serper.dev
- `competitor_analysis` — Maps competitive landscapes
- `market_sizing` — TAM/SAM/SOM and CAGR projections
- `trend_analysis` — Emerging shifts by category and horizon
- `financial_data` — Live stock prices via Alpha Vantage
- `swot_analysis` — Structured strategic analysis

**Plugin Tools (enable/disable dynamically):**
- `news_sentiment` — Bullish/Bearish sentiment from media coverage
- `industry_reports` — McKinsey, Gartner, Deloitte, PwC research
- `currency_exchange` — Live forex rates via ExchangeRate API

### 5. Memory System
**Short-term memory:**
- Stores last 10 exchanges per session
- High-importance entries promoted to long-term before dropping
- Injected into system prompt on every request

**Long-term memory:**
- Persisted to `.aria-data/long-term-memory.json` on disk
- Survives server restarts
- Auto-saves every 5 minutes and on every new entry
- Keyed by `userId` from the login profile
- Loads on startup with count logging

### 6. Response Caching
- TTL-based in-memory cache (default 30 minutes)
- Cache key: `model:tools:normalizedQuery`
- Automatic cleanup every 10 minutes
- Cache hit rate tracked in session stats
- Estimated tokens and cost saved shown in Stats tab

### 7. Feedback Learning
- `+` and `−` buttons on every assistant message
- Negative feedback injects a memory entry: "User rated this poorly — improve specificity"
- Positive feedback saves successful query topics to long-term memory
- Feedback stats tracked: positive, negative, satisfaction rate
- `analyzeFeedbackPatterns()` in `lib/multiagent.ts` analyzes patterns using GPT-4o Mini

### 8. LangSmith Observability
- Every agent run logged to LangSmith dashboard
- Captures: session ID, message, tools used, tokens, duration, model, personality
- Feedback ratings can be logged to LangSmith runs
- Falls back gracefully if API key is not configured

### 9. Token Usage and Cost Tracking
- Per-message token breakdown (prompt + completion)
- Estimated cost in USD per message
- Session totals: messages, tokens, cost, tool calls
- Average response time tracked
- Cache hit rate and tokens saved displayed

### 10. User Authentication and Personalization
- Login screen with 2-step onboarding (name → role + industry)
- 9 role options, 10 industry options
- Profile saved to `localStorage`
- Personalized welcome message and placeholder text
- Preferences saved: default model, personality, enabled tools
- Sign out clears profile and resets session

### 11. PDF Export — Professional Reports
Multi-page PDF with:
- **Cover page** — title, analyst info, stats, confidentiality notice
- **Executive summary** — first response highlighted
- **Table of contents** — linked page numbers
- **Research conversations** — full Q&A with role badges and tool calls
- **Key insights** — research topics and tools deployed
- **Methodology** — architecture, data sources
- **Disclaimer** — AI-generated content notice
- **Footer** — page numbers, ARIA branding on every page
- Dark theme with green/amber/purple color coding

### 12. Chat History with Search
- Conversations auto-saved to `localStorage` on every message
- Up to 20 most recent chats stored
- Full-text search across titles and message content
- Click any chat to restore the full conversation
- Delete individual chats with hover reveal
- Active chat highlighted in the list

### 13. 4 Personality Modes
- **Formal** — Executive reports, structured sections, Key Takeaways
- **Balanced** — Professional yet approachable (default)
- **Friendly** — Plain language, analogies, follow-up suggestions
- **Concise** — Bullets only, numbers first, no filler

### 14. Model Settings (All OpenAI Parameters)
- Model selector: GPT-4o, GPT-4o Mini, GPT-4 Turbo, GPT-3.5 Turbo
- Temperature slider (0–1)
- Max Tokens slider (256–4000)
- Top P slider (0.1–1)
- Frequency Penalty slider (0–2)
- Presence Penalty slider (0–2)

### 15. Interactive Help Chatbot
- Floating chat bubble in bottom right corner
- Powered by GPT-4o Mini with ARIA-specific system prompt
- Answers questions about features, tools, settings, and market research
- Quick question buttons on first open
- Unread badge notification after 30 seconds of inactivity
- Independent conversation history

### 16. Interactive Feature Badges
- Clickable badges on the welcome screen
- Expand to show description, how it works, and technical specs
- RAG, Multi-Agent, Memory, PDF Export

### 17. Collapsible Sidebar
- Expand/collapse toggle with smooth animation
- Collapsed: icon-only navigation with tooltips
- Expanded: full labels, user profile, status pills
- Auto-expands when clicking a tab in collapsed mode
- Persistent across navigation

### 18. Chart Generation
- Agent includes structured chart data in responses when relevant
- Supports bar, line, area, and pie charts
- Rendered inline using Recharts
- Triggered by asking "show as a chart" or "visualize this data"

### 19. Session Stats Dashboard
- Total messages, tool calls, tokens, cost
- Average response time
- Cache hit rate with progress bar
- Satisfaction rate from feedback
- Token breakdown table
- Cache savings (tokens and cost)

---

## Tech Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Framework | Next.js | 14.2.5 |
| Language | TypeScript | 5 |
| Styling | Tailwind CSS | 3.4 |
| AI Agent | LangGraph | 1.2.4 |
| LLM | OpenAI GPT-4o | latest |
| Embeddings | text-embedding-3-small | latest |
| RAG Store | Supabase pgvector | — |
| Web Search | Serper.dev | — |
| Financial Data | Alpha Vantage | — |
| Forex Data | ExchangeRate API | — |
| Observability | LangSmith | 0.5.12 |
| Charts | Recharts | 3.8 |
| PDF | jsPDF | latest |
| Validation | Zod | 4.3 |

---

## Project Structure
```
market-research-agent/
├── app/
│   ├── api/
│   │   ├── chat/route.ts         # Main agent + feedback PATCH
│   │   ├── multiagent/route.ts   # Deep research (4 agents)
│   │   └── help/route.ts         # Help chatbot
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx                  # Main UI
├── components/
│   ├── ChartRenderer.tsx         # Recharts bar/line/area/pie
│   ├── FeatureBadges.tsx         # Clickable feature badges
│   ├── HelpChatbot.tsx           # Floating help assistant
│   ├── LoginScreen.tsx           # 2-step onboarding
│   ├── MessageBubble.tsx         # Messages + feedback buttons
│   ├── ModelSettingsPanel.tsx    # All OpenAI parameter sliders
│   ├── SuggestedPrompts.tsx      # Starter prompt cards
│   ├── TokenUsageDisplay.tsx     # Session analytics dashboard
│   └── ToolPanel.tsx             # Plugin system with toggles
├── lib/
│   ├── agent.ts                  # LangGraph ReAct agent
│   ├── exportPdf.ts              # Professional PDF generation
│   ├── memory.ts                 # Short/long-term + cache + feedback
│   ├── multiagent.ts             # 4 agents + orchestrator + feedback analysis
│   ├── observability.ts          # LangSmith tracing
│   ├── rag.ts                    # Supabase pgvector RAG
│   └── tools.ts                  # 9 DynamicStructuredTool definitions
├── types/
│   └── index.ts                  # All TypeScript types
├── .aria-data/
│   └── long-term-memory.json     # Persisted user memory (gitignored)
└── .env.local                    # Environment variables (gitignored)
```

---

## API Routes

| Route | Method | Description |
|-------|--------|-------------|
| `/api/chat` | POST | Run main research agent |
| `/api/chat` | PATCH | Submit message feedback |
| `/api/multiagent` | POST | Deep research with 4 agents |
| `/api/help` | POST | Help chatbot (GPT-4o Mini) |

---

## Environment Variables
```env
# Required
OPENAI_API_KEY=sk-...

# Web Search — serper.dev (2,500 free/month)
SERPER_API_KEY=...

# Financial Data — alphavantage.co (25 free/day)
ALPHA_VANTAGE_API_KEY=...

# Forex — exchangerate-api.com (free tier)
EXCHANGE_RATE_API_KEY=...

# Supabase pgvector — supabase.com (free tier)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...

# LangSmith observability — smith.langchain.com (free tier)
LANGSMITH_API_KEY=ls__...
LANGSMITH_PROJECT=aria-market-research
LANGSMITH_ENDPOINT=https://api.smith.langchain.com
LANGCHAIN_TRACING_V2=true
```

---

## Quick Start
```bash
# 1. Install dependencies
npm install

# 2. Configure environment
cp .env.example .env.local
# Fill in your API keys

# 3. Set up Supabase (run SQL in Supabase SQL Editor)
# See supabase-setup.sql in the repo

# 4. Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## Deployment
```bash
# Deploy to Vercel
npx vercel --prod
```

Add all environment variables in Vercel dashboard under:
**Project Settings → Environment Variables**

---

## Example Queries
```
What is the global SaaS market size and projected CAGR through 2030?

[Deep Research] Analyze the African fintech market opportunity for 2025

Do a SWOT analysis for entering the cloud gaming market in Southeast Asia

Compare key financials for NVDA, AMD, and INTC

Show me the top 5 cloud providers by market share as a chart

What are the biggest regulatory risks facing the healthtech industry?
```

---

## Architecture Overview
```
User Query
    │
    ├── Cache check (30 min TTL)
    ├── RAG retrieval (Supabase pgvector)
    ├── Memory context (short-term + long-term)
    │
    ▼
LangGraph ReAct Agent (GPT-4o)
    │
    ├── Tool selection and execution (up to 9 tools)
    │   ├── Serper.dev (web search)
    │   ├── Alpha Vantage (financial data)
    │   └── Internal analysis tools
    │
    ├── Response generation
    ├── Memory update (short + long term)
    ├── Cache storage
    └── LangSmith logging

Deep Research Mode
    │
    ├── Market Data Analyst    ─┐
    ├── Competitive Intel       ├── parallel (Promise.allSettled)
    ├── Strategy Advisor        │
    ├── Risk Analyst           ─┘
    │
    └── Orchestrator (GPT-4o) → Synthesized report
```

---

## License

MIT — Built for Turing College Sprint 3 Project
