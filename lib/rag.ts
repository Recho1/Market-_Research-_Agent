import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { OpenAIEmbeddings } from "@langchain/openai";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import type { RAGSource } from "@/types";

function getSupabaseClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key ||
      url === "your-supabase-url-here" ||
      key === "your-supabase-service-role-key-here") {
    throw new Error("Supabase credentials not configured in .env.local");
  }
  return createClient(url, key);
}

function getEmbeddings() {
  return new OpenAIEmbeddings({
    apiKey:    process.env.OPENAI_API_KEY,
    modelName: "text-embedding-3-small",
  });
}

const KNOWLEDGE_BASE = [
  {
    id: "market-sizing", title: "Market Sizing Frameworks", category: "frameworks",
    content: "TAM SAM SOM Framework. TAM is Total Addressable Market representing total revenue opportunity if a product achieved 100 percent market share globally. SAM is Serviceable Addressable Market the portion targeted by your products and services within your geographic reach. SOM is Serviceable Obtainable Market the portion you can realistically capture in the short term. Top-Down Approach: Start with macro industry data from Gartner IDC or Statista and narrow down using market share percentages. Bottom-Up Approach: Start with unit economics price per customer times number of potential customers. CAGR Formula: Ending Value divided by Beginning Value to the power of 1 divided by Number of Years minus 1. Key market sizing sources: Gartner IDC Forrester McKinsey Global Institute Statista IBISWorld Grand View Research.",
  },
  {
    id: "competitive", title: "Competitive Analysis Frameworks", category: "frameworks",
    content: "Porter Five Forces Framework. Threat of New Entrants barriers to entry capital requirements economies of scale. Bargaining Power of Suppliers number of suppliers switching costs uniqueness of inputs. Bargaining Power of Buyers buyer concentration price sensitivity switching costs. Threat of Substitutes availability of alternatives relative price performance. Competitive Rivalry number of competitors industry growth rate differentiation. SWOT Analysis Strengths internal positive attributes brand technology talent IP. Weaknesses internal negative attributes gaps in capabilities resources. Opportunities external positive factors market trends regulatory changes. Threats external negative factors competition economic downturns disruption. Blue Ocean Strategy Create uncontested market space. Sources: Crunchbase LinkedIn G2 Capterra SimilarWeb SEMrush Owler PitchBook.",
  },
  {
    id: "trends-2025", title: "Key Industry Trends 2025", category: "trends",
    content: "Artificial Intelligence and Machine Learning: Generative AI market projected to reach 1.3 trillion by 2032. Enterprise AI adoption growing at 38 percent CAGR. AI agents replacing repetitive knowledge work. Financial Technology: Embedded finance integrating financial services into non-financial apps. DeFi and blockchain adoption in institutional finance. Open banking APIs enabling new fintech ecosystems. Healthcare Technology: Digital therapeutics gaining FDA approval. Remote patient monitoring growing post-pandemic. AI diagnostics achieving radiologist-level accuracy. E-Commerce and Retail: Social commerce growing 3x faster than traditional ecommerce. SaaS and Cloud: Vertical SaaS outperforming horizontal SaaS. Product-led growth replacing sales-led growth. Consumption-based pricing replacing seat-based models.",
  },
  {
    id: "financial-metrics", title: "Key Financial Metrics for Business Analysis", category: "finance",
    content: "Valuation Metrics: PE Ratio Market price per share divided by earnings per share. EV EBITDA Enterprise Value divided by EBITDA used for comparing companies with different capital structures. DCF Discounted Cash Flow present value of future cash flows. SaaS Metrics: ARR Annual Recurring Revenue total annualized value of subscription contracts. MRR Monthly Recurring Revenue. NRR Net Revenue Retention best in class 120 percent or higher. CAC Customer Acquisition Cost total sales and marketing spend divided by new customers acquired. LTV Lifetime Value average revenue per customer times gross margin times average customer lifespan. LTV CAC Ratio should be 3 to 1 or higher. Churn Rate below 5 percent annually strong for B2B SaaS. Rule of 40 Growth rate plus profit margin should exceed 40 percent.",
  },
  {
    id: "market-entry", title: "Market Entry Strategy Frameworks", category: "strategy",
    content: "Market Entry Modes: Organic Growth build internally using own resources slowest but highest control. Acquisition buy existing player for speed and market share. Partnership JV share risk and resources with local partner. Licensing license technology or brand to local operator. Franchising expand through franchised model asset-light. Geographic Expansion Framework: Market attractiveness GDP per capita population internet penetration mobile usage. Regulatory environment ease of doing business data privacy laws foreign ownership limits. Competitive intensity number of players market concentration pricing power. Go-to-Market Strategy: ICP Ideal Customer Profile firmographics technographics behavioral signals. Value Proposition differentiated benefit delivered better than alternatives. Pricing Strategy penetration premium freemium usage-based tiered.",
  },
  {
    id: "investment", title: "Investment and Due Diligence Framework", category: "investment",
    content: "Venture Capital Investment Criteria: Team domain expertise execution track record complementary skills founder-market fit. Market large TAM growing underserved timing is right. Product strong product-market fit signals defensible technology network effects. Traction revenue growth retention NPS organic growth signals. Due Diligence Checklist: Financial revenue quality customer concentration contract terms burn rate. Legal IP ownership pending litigation regulatory compliance cap table. Technical code quality scalability security technical debt. Investment Stages: Pre-Seed 500K to 2M product validation. Seed 2M to 5M initial traction. Series A 10M to 20M scale go-to-market. Series B 30M to 80M expand to new markets. Series C 100M plus international expansion.",
  },
];

let isSeeded = false;

export async function seedKnowledgeBase(): Promise<void> {
  if (isSeeded) return;
  try {
    const supabase   = getSupabaseClient();
    const embeddings = getEmbeddings();
    const { count, error } = await supabase
      .from("documents")
      .select("*", { count: "exact", head: true });

    if (error) {
      console.error("[RAG] Cannot check documents table:", error.message);
      console.error("[RAG] Make sure you ran the Supabase SQL setup script.");
      return;
    }

    if (count && count > 0) {
      console.log(`[RAG] Knowledge base already has ${count} chunks — skipping seed`);
      isSeeded = true;
      return;
    }

    console.log("[RAG] Seeding knowledge base...");
    const splitter = new RecursiveCharacterTextSplitter({ chunkSize: 800, chunkOverlap: 100 });
    let totalChunks = 0;

    for (const item of KNOWLEDGE_BASE) {
      const chunks = await splitter.createDocuments(
        [item.content],
        [{ id: item.id, title: item.title, category: item.category, source: "ARIA Knowledge Base" }]
      );
      for (const chunk of chunks) {
        const embedding = await embeddings.embedQuery(chunk.pageContent);
        const { error: insertError } = await supabase.from("documents").insert({
          content:   chunk.pageContent,
          metadata:  chunk.metadata,
          embedding: JSON.stringify(embedding),
        });
        if (insertError) console.error("[RAG] Insert error:", insertError.message);
        else totalChunks++;
      }
    }

    isSeeded = true;
    console.log(`[RAG] Seeded ${totalChunks} chunks successfully`);
  } catch (err) {
    console.error("[RAG] Seeding failed:", err);
  }
}

// ── Agentic RAG — retrieval with diagnostics ──────────────────────────────────
export async function retrieveRelevantContext(
  query: string, topK = 4
): Promise<{ context: string; sources: RAGSource[]; scores: number[] }> {
  const empty = { context: "", sources: [], scores: [] };

  try {
    const supabase       = getSupabaseClient();
    const embeddings     = getEmbeddings();

    await seedKnowledgeBase();

    const queryEmbedding = await embeddings.embedQuery(query);
    console.log(`[RAG] Querying for: "${query.slice(0, 60)}..."`);

    const { data, error } = await supabase.rpc("match_documents", {
      query_embedding: queryEmbedding,
      match_count:     topK,
      filter:          {},
    });

    if (error) {
      console.error("[RAG] RPC error:", error.message);
      console.error("[RAG] Make sure match_documents function exists in Supabase.");
      return empty;
    }

    if (!data || data.length === 0) {
      console.warn("[RAG] No documents returned — knowledge base may be empty");
      return empty;
    }

    console.log(`[RAG] Retrieved ${data.length} chunks, scores: ${data.map((d: { similarity: number }) => d.similarity.toFixed(2)).join(", ")}`);

    const SIMILARITY_THRESHOLD = 0.4; // lowered from 0.6 so more results come through
    const filtered = data.filter((doc: { similarity: number }) => doc.similarity >= SIMILARITY_THRESHOLD);
    console.log(`[RAG] ${filtered.length}/${data.length} chunks passed threshold (≥${SIMILARITY_THRESHOLD})`);

    const sources: RAGSource[] = data.map((doc: {
      metadata: { title: string; category: string; source: string };
      content:  string;
      similarity: number;
    }) => ({
      title:      doc.metadata?.title   || "Knowledge Base",
      content:    doc.content.slice(0, 220),
      similarity: Math.round(doc.similarity * 100) / 100,
      category:   doc.metadata?.category || "general",
      source:     doc.metadata?.source   || "ARIA Knowledge Base",
    }));

    const context = filtered.length > 0
      ? "\n\nRELEVANT KNOWLEDGE BASE CONTEXT:\n" +
        filtered.map((doc: { metadata: { title: string }; content: string }) =>
          `[${doc.metadata?.title}] ${doc.content}`
        ).join("\n---\n") +
        "\n\nUse the above context to enhance your response with proven frameworks and domain knowledge."
      : "";

    return { context, sources, scores: data.map((d: { similarity: number }) => d.similarity) };
  } catch (err) {
    console.error("[RAG] Retrieval error:", err);
    return empty;
  }
}

// ── Upload user document into RAG ─────────────────────────────────────────────
export async function uploadDocumentToRAG(
  content: string, filename: string, userId: string
): Promise<{ success: boolean; chunks: number }> {
  try {
    const supabase   = getSupabaseClient();
    const embeddings = getEmbeddings();
    const splitter   = new RecursiveCharacterTextSplitter({ chunkSize: 600, chunkOverlap: 80 });
    const docs = await splitter.createDocuments([content], [{
      title: filename, category: "user-document",
      source: `User Upload — ${userId}`, userId,
    }]);
    for (const doc of docs) {
      const embedding = await embeddings.embedQuery(doc.pageContent);
      await supabase.from("documents").insert({
        content:   doc.pageContent,
        metadata:  doc.metadata,
        embedding: JSON.stringify(embedding),
      });
    }
    return { success: true, chunks: docs.length };
  } catch (err) {
    console.error("[RAG] Upload error:", err);
    return { success: false, chunks: 0 };
  }
}

// ── Query rewriting for better RAG retrieval ──────────────────────────────────
export function buildAgenticQuery(
  message: string,
  history: { role: string; content: string }[]
): string {
  const recentContext = history
    .filter(m => m.role === "user")
    .slice(-2)
    .map(m => m.content.slice(0, 100))
    .join(" ");
  const combined = recentContext ? `${message} ${recentContext}` : message;
  console.log(`[RAG] Agentic query: "${combined.slice(0, 80)}"`);
  return combined;
}
