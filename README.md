# ARIA — Advanced Research & Intelligence Agent

> AI-powered market research platform built with Next.js 14, LangGraph, OpenAI GPT-4o, and Supabase pgvector.

![Next.js](https://img.shields.io/badge/Next.js-14.2.5-black?style=for-the-badge&logo=next.js)
![OpenAI](https://img.shields.io/badge/OpenAI-GPT--4o-412991?style=for-the-badge&logo=openai)
![LangGraph](https://img.shields.io/badge/LangGraph-ReAct-blue?style=for-the-badge)
![Supabase](https://img.shields.io/badge/Supabase-pgvector-3ECF8E?style=for-the-badge&logo=supabase)

## What is ARIA?

ARIA is a production-grade AI agent that performs autonomous market research. It combines a LangGraph ReAct agent with retrieval-augmented generation, a 4-agent parallel research system, real-time web search, and a full authentication system — all in a dark-themed responsive UI.

## Features

### AI and Research
- LangGraph ReAct Agent — autonomous tool selection and multi-step reasoning loop
- 9 Research Tools — web search, competitor analysis, market sizing, trend analysis, financial data, SWOT analysis, news sentiment, industry reports, currency exchange
- Agentic RAG — query rewriting plus Supabase pgvector similarity search with relevance scoring
- Multi-Agent Deep Research — 4 parallel specialist agents orchestrated by GPT-4o
- Chart Generation — inline bar, line, area, pie charts rendered from agent responses
- Persistent Memory — short-term session memory plus long-term disk-persisted memory
- Response Caching — 30-minute TTL cache to reduce API costs

### Authentication
- Email and Password Registration — bcrypt hashing with salt rounds 12
- 6-Digit OTP Verification — sent via Gmail SMTP or Resend, expires in 10 minutes, never exposed to client
- JWT Session Management — 7-day tokens stored in HttpOnly cookies
- User-Isolated Chat Storage — server-side per-user chat history
- Personalized Welcome — different experience for new vs returning users

### Input and Interaction
- Voice Input — microphone recording transcribed via OpenAI Whisper and inserted as text
- Document Upload — TXT, PDF, CSV, JSON, MD, DOCX files loaded into agent context
- Drag and Drop — drop files directly onto the input area
- Deep Research Mode — star button triggers 4-agent parallel research

### Observability
- Dynamic Agent Trace — step-by-step execution trace shown under every AI response
- RAG Relevance Scores — color-coded progress bars per retrieved chunk
- Session Analytics — token usage, cost estimates, cache hit rate, satisfaction rate
- LangSmith Integration — optional async cloud tracing

### Export and UX
- PDF Export — professional multi-page reports with cover page, TOC, and methodology
- Copy to Clipboard — one-click copy on every AI response
- Thumbs Up/Down Feedback — per-response rating that feeds into memory
- Collapsible Sidebar — icon-only mode for more screen space
- Chat History Search — full-text search across all saved conversations
- 4 Personality Modes — Formal, Balanced, Friendly, Concise
- Help Chatbot — floating assistant powered by GPT-4o Mini

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 14 App Router |
| Language | TypeScript |
| AI Orchestration | LangGraph ReAct StateGraph |
| LLM | OpenAI GPT-4o and GPT-4o Mini |
| Speech-to-Text | OpenAI Whisper |
| Embeddings | OpenAI text-embedding-3-small |
| Vector Database | Supabase pgvector |
| Web Search | Serper.dev |
| Financial Data | Alpha Vantage |
| Authentication | bcryptjs and jsonwebtoken |
| Email | Gmail SMTP or Resend |
| Observability | LangSmith and custom AgentTracer |
| PDF Generation | jsPDF |
| Charts | Recharts |
| Styling | Tailwind CSS |

## Getting Started

```bash
git clone https://github.com/your-username/your-repo.git
cd your-repo
npm install --legacy-peer-deps
cp .env.example .env.local
npm run dev
```

Open http://localhost:3000

## Environment Variables

```env
OPENAI_API_KEY=sk-your-key
SERPER_API_KEY=your-key
ALPHA_VANTAGE_API_KEY=your-key
EXCHANGE_RATE_API_KEY=your-key
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
EMAIL_USER=youremail@gmail.com
EMAIL_PASS=your-16-char-app-password
RESEND_API_KEY=re_your_key
EMAIL_FROM=onboarding@resend.dev
JWT_SECRET=change-this-to-random-string-in-production
LANGSMITH_API_KEY=your-key
LANGSMITH_PROJECT=aria-market-research
LANGCHAIN_TRACING_V2=true
NEXTAUTH_URL=http://localhost:3000
```

## Supabase Setup

Run this SQL in your Supabase SQL Editor:

```sql
create extension if not exists vector;
create table if not exists documents (id bigserial primary key, content text, metadata jsonb, embedding vector(1536));
create index if not exists documents_embedding_idx on documents using ivfflat (embedding vector_cosine_ops) with (lists = 100);
create or replace function match_documents(query_embedding vector(1536), match_count int default 3, filter jsonb default '{}') returns table(id bigint, content text, metadata jsonb, similarity float) language plpgsql as $$ begin return query select documents.id, documents.content, documents.metadata, 1 - (documents.embedding <=> query_embedding) as similarity from documents where documents.metadata @> filter order by documents.embedding <=> query_embedding limit match_count; end; $$;
```

## Authentication Flow

Register — fill name, email, password, role, industry — password hashed with bcrypt — OTP generated and emailed — user enters OTP — account verified — JWT issued for 7 days and stored in HttpOnly cookie.

Login — enter email and password — bcrypt verifies password — JWT issued — chat history loaded.

Session — on page load /api/auth/me validates JWT from cookie — if valid, profile and chats restored.

## AI Agent Pipeline

Message comes in — cache check — agentic RAG query rewrite — pgvector similarity search — memory load — document context if files uploaded — LangGraph ReAct loop with tool selection and execution — memory update — observability data built — response returned with RAG sources and agent trace.

## Multi-Agent Deep Research

Star button triggers 4 specialist agents in parallel — Market Data Analyst, Competitive Intelligence, Strategy Advisor, Risk Analyst — GPT-4o orchestrator synthesizes all 4 outputs into a structured report with Executive Summary, Market Opportunity, Competitive Landscape, Strategic Recommendations, and Key Risks.

## API Routes

| Method | Route | Description |
|---|---|---|
| POST | /api/chat | Main agent endpoint |
| PATCH | /api/chat | Submit feedback |
| POST | /api/multiagent | 4-agent deep research |
| POST | /api/transcribe | Whisper transcription |
| POST | /api/auth/register | Register and send OTP |
| POST | /api/auth/verify-otp | Verify OTP and issue JWT |
| POST | /api/auth/login | Login |
| POST | /api/auth/logout | Logout |
| GET | /api/auth/me | Validate session |
| GET POST DELETE | /api/chats | User chat storage |

## Project Structure
├── app/api/auth/          # register, verify-otp, resend-otp, login, logout, me
├── app/api/chat/          # main agent + feedback
├── app/api/multiagent/    # 4-agent deep research
├── app/api/transcribe/    # Whisper audio
├── app/api/chats/         # user-isolated chat storage
├── components/
│   ├── LoginScreen.tsx    # auth UI with OTP boxes
│   ├── MessageBubble.tsx  # messages with observability
│   ├── ObservabilityPanel.tsx
│   ├── InputBar.tsx       # voice, upload, send
│   └── ...
├── lib/
│   ├── agent.ts           # LangGraph ReAct agent
│   ├── rag.ts             # agentic RAG
│   ├── auth.ts            # bcrypt, JWT, OTP, email
│   ├── multiagent.ts      # 4-agent system
│   ├── observability.ts   # AgentTracer
│   └── ...
└── types/index.ts

## Deployment

```bash
npm install -g vercel
vercel --prod
```

Add all environment variables in Vercel dashboard under Settings then Environment Variables. Note that .aria-data/ does not persist on Vercel serverless — migrate to Supabase or PostgreSQL for production user storage.

## License

MIT

## Ethical Considerations

ARIA was designed with the following ethical principles embedded into the architecture and not treated as an afterthought.

**Hallucination and misinformation risk.** Large language models can generate plausible-sounding but incorrect information. ARIA addresses this with an explicit instruction in every system prompt: "Never fabricate statistics." All responses are grounded in real-time web search results and retrieved knowledge base content so claims are traceable to sources. The observability panel shows users exactly which sources were retrieved and at what confidence level, making the reasoning transparent rather than opaque.

**Data retention and user privacy.** Each user's conversation history is stored in a private server-side folder isolated by their user ID. No user can access another user's data. Passwords are never stored in plain text — only bcrypt hashes with 12 salt rounds. OTP codes are never included in API responses and are deleted immediately after verification. JWT tokens are stored in HttpOnly cookies that JavaScript cannot read, preventing cross-site scripting attacks.

**Not financial advice disclaimer.** ARIA provides market research and analysis to inform decision-making. It does not provide regulated financial advice. Users should conduct their own due diligence before making investment or business decisions based on ARIA outputs. This is stated explicitly in all PDF exports generated by the system.

**Bias acknowledgement.** Market analysis produced by LLMs reflects biases present in training data, which may over-represent certain geographies, industries, or perspectives. ARIA mitigates this by grounding responses in real-time search data and explicitly retrieved frameworks, but users should remain critically aware that AI-generated analysis is a starting point for research, not a definitive conclusion.

**Prompt injection protection.** The document upload feature sanitises content against known adversarial prompt injection patterns before inserting it into the vector database. This prevents malicious documents from manipulating the AI agent's behaviour through poisoned RAG context.

**Rate limiting and account security.** Authentication endpoints enforce per-IP and per-email rate limiting with a maximum of 5 attempts per 15-minute window and a 30-minute lockout after 10 failures. This prevents brute-force attacks against both passwords and OTP codes.

---

## Problem Statement — SCR Framework

**Situation.** Market research is one of the most critical inputs to business strategy. Executives, investors, and entrepreneurs rely on it to decide which markets to enter, which competitors to track, and where to allocate capital. Traditionally this work is performed by specialist analysts using a combination of paid data platforms, industry reports, and manual synthesis — a process that takes days and costs thousands of dollars per engagement.

**Complication.** The pace of market change has accelerated dramatically. By the time a traditional research report is commissioned, produced, and delivered, the market conditions it describes may already have shifted. General-purpose AI assistants have emerged as a faster alternative, but they lack real-time data access, do not apply structured research frameworks, and approach every question with a single model rather than deploying specialised reasoning for different analytical dimensions. The result is fast but shallow — not suitable for decisions with real financial consequences.

**Resolution.** ARIA solves this by combining a LangGraph ReAct agent with nine specialised research tools, a retrieval-augmented knowledge base of proven market frameworks, and a four-agent parallel deep research system. A user asks a market question in natural language. ARIA autonomously selects the right tools, retrieves the most relevant frameworks from its knowledge base, executes searches and financial data lookups in real time, and synthesises everything into a structured report with full transparency into how every answer was produced. Research that previously took hours now takes seconds, with the depth and structure of professional-grade analysis.

---

## SMART Project Scope

| Criterion | Detail |
|---|---|
| Specific | Build an AI market research agent with autonomous tool selection, RAG, multi-agent deep research, and secure user authentication |
| Measurable | 9 functional research tools, 4-agent deep research system, OTP authentication with rate limiting, RAG with similarity scoring, full observability trace per response |
| Achievable | Built using production-grade open-source tools — Next.js, LangGraph, OpenAI API, Supabase — all with free tiers available |
| Relevant | Addresses a real pain point for analysts, strategists, and entrepreneurs who need fast, structured market intelligence |
| Time-bound | Designed, built, and deployed as a capstone project within the course timeline |

---

## Testing

Unit tests cover the critical authentication paths in `lib/auth.ts`.

Run tests with:

```bash
npx jest
```

Test coverage includes registration validation, duplicate email rejection, OTP verification, OTP expiry, incorrect OTP rejection, wrong password rejection, unverified account login blocking, JWT signing, and JWT tampering detection.
