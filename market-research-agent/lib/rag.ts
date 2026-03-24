import { createClient } from "@supabase/supabase-js";
import { OpenAIEmbeddings } from "@langchain/openai";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";

// ── Supabase client ───────────────────────────────────────────────────────────
function getSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Supabase credentials not configured");
  return createClient(url, key);
}

// ── OpenAI Embeddings ─────────────────────────────────────────────────────────
function getEmbeddings() {
  return new OpenAIEmbeddings({
    apiKey:    process.env.OPENAI_API_KEY,
    modelName: "text-embedding-3-small",
  });
}

// ── Market Research Knowledge Base ───────────────────────────────────────────
const KNOWLEDGE_BASE = [
  {
    id:       "market-sizing",
    title:    "Market Sizing Frameworks",
    content:  "TAM SAM SOM Framework. TAM is Total Addressable Market representing total revenue opportunity if a product achieved 100 percent market share globally. SAM is Serviceable Addressable Market the portion targeted by your products and services within your geographic reach. SOM is Serviceable Obtainable Market the portion you can realistically capture in the short term. Top-Down Approach: Start with macro industry data from Gartner IDC or Statista and narrow down using market share percentages. Bottom-Up Approach: Start with unit economics price per customer times number of potential customers. CAGR Formula: Ending Value divided by Beginning Value to the power of 1 divided by Number of Years minus 1. Key market sizing sources: Gartner IDC Forrester McKinsey Global Institute Statista IBISWorld Grand View Research. Common mistakes: Confusing TAM with SAM using outdated data ignoring geographic constraints not accounting for market maturity and saturation.",
    category: "frameworks",
  },
  {
    id:       "competitive-analysis",
    title:    "Competitive Analysis Frameworks",
    content:  "Porter Five Forces Framework. Threat of New Entrants barriers to entry capital requirements economies of scale. Bargaining Power of Suppliers number of suppliers switching costs uniqueness of inputs. Bargaining Power of Buyers buyer concentration price sensitivity switching costs. Threat of Substitutes availability of alternatives relative price performance. Competitive Rivalry number of competitors industry growth rate differentiation. SWOT Analysis Strengths are internal positive attributes brand technology talent IP. Weaknesses are internal negative attributes gaps in capabilities resources. Opportunities are external positive factors market trends regulatory changes. Threats are external negative factors competition economic downturns disruption. Blue Ocean Strategy Create uncontested market space rather than competing in existing markets. Key data sources Crunchbase LinkedIn G2 Capterra SimilarWeb SEMrush Owler PitchBook.",
    category: "frameworks",
  },
  {
    id:       "industry-trends-2025",
    title:    "Key Industry Trends 2025",
    content:  "Artificial Intelligence and Machine Learning: Generative AI market projected to reach 1.3 trillion by 2032. Enterprise AI adoption growing at 38 percent CAGR. AI agents replacing repetitive knowledge work. Multimodal AI combining text image video audio. Financial Technology: Embedded finance integrating financial services into non-financial apps. DeFi and blockchain adoption in institutional finance. Open banking APIs enabling new fintech ecosystems. Healthcare Technology: Digital therapeutics gaining FDA approval. Remote patient monitoring growing post-pandemic. AI diagnostics achieving radiologist-level accuracy. E-Commerce and Retail: Social commerce growing 3x faster than traditional ecommerce. Same-day delivery becoming standard expectation. SaaS and Cloud: Vertical SaaS outperforming horizontal SaaS. Product-led growth replacing sales-led growth. Consumption-based pricing replacing seat-based models.",
    category: "trends",
  },
  {
    id:       "financial-metrics",
    title:    "Key Financial Metrics for Business Analysis",
    content:  "Valuation Metrics: PE Ratio is Market price per share divided by earnings per share. EV EBITDA is Enterprise Value divided by EBITDA used for comparing companies with different capital structures. DCF Discounted Cash Flow present value of future cash flows foundation of intrinsic valuation. SaaS Specific Metrics: ARR Annual Recurring Revenue total annualized value of subscription contracts. MRR Monthly Recurring Revenue monthly subscription revenue. NRR Net Revenue Retention best in class is 120 percent or higher. CAC Customer Acquisition Cost total sales and marketing spend divided by new customers acquired. LTV Lifetime Value average revenue per customer times gross margin times average customer lifespan. LTV CAC Ratio should be 3 to 1 or higher for healthy SaaS businesses. Churn Rate below 5 percent annually is strong for B2B SaaS. Rule of 40 Growth rate plus profit margin should exceed 40 percent. Burn Rate monthly cash consumption. Runway months of cash remaining at current burn rate.",
    category: "finance",
  },
  {
    id:       "market-entry-strategy",
    title:    "Market Entry Strategy Frameworks",
    content:  "Market Entry Modes: Organic Growth build internally using own resources slowest but highest control. Acquisition buy existing player for speed and market share. Partnership JV share risk and resources with local partner. Licensing license technology or brand to local operator. Franchising expand through franchised model asset-light. Geographic Expansion Framework: Market attractiveness GDP per capita population internet penetration mobile usage. Regulatory environment ease of doing business data privacy laws foreign ownership limits. Competitive intensity number of players market concentration pricing power. Go-to-Market Strategy Components: ICP Ideal Customer Profile firmographics technographics behavioral signals. Value Proposition differentiated benefit delivered better than alternatives. Pricing Strategy penetration premium freemium usage-based tiered. Distribution Channels direct partner marketplace OEM API.",
    category: "strategy",
  },
  {
    id:       "investment-analysis",
    title:    "Investment and Due Diligence Framework",
    content:  "Venture Capital Investment Criteria: Team domain expertise execution track record complementary skills founder-market fit. Market large TAM growing underserved timing is right. Product strong product-market fit signals defensible technology network effects. Traction revenue growth retention NPS organic growth signals. Due Diligence Checklist: Financial revenue quality customer concentration contract terms burn rate. Legal IP ownership pending litigation regulatory compliance cap table. Technical code quality scalability security technical debt. Investment Stages: Pre-Seed idea stage 500K to 2M product validation. Seed early product 2M to 5M initial traction. Series A product-market fit 10M to 20M scale go-to-market. Series B scaling revenue 30M to 80M expand to new markets. Series C market leadership 100M plus international expansion. Key Ratios: PEG Ratio PE divided by earnings growth rate below 1 is undervalued. Debt to Equity total liabilities divided by shareholder equity. Current Ratio current assets divided by current liabilities above 2 is healthy.",
    category: "investment",
  },
];

// ── Seed knowledge base into Supabase ─────────────────────────────────────────
let isSeeded = false;

export async function seedKnowledgeBase(): Promise<void> {
  if (isSeeded) return;

  const supabase  = getSupabaseClient();
  const embeddings = getEmbeddings();

  try {
    // Check if already seeded
    const { count } = await supabase
      .from("documents")
      .select("*", { count: "exact", head: true });

    if (count && count > 0) {
      console.log("[RAG] Knowledge base already seeded with", count, "documents");
      isSeeded = true;
      return;
    }

    console.log("[RAG] Seeding knowledge base...");

    const splitter = new RecursiveCharacterTextSplitter({
      chunkSize:    800,
      chunkOverlap: 100,
    });

    for (const item of KNOWLEDGE_BASE) {
      const chunks = await splitter.createDocuments(
        [item.content],
        [{ id: item.id, title: item.title, category: item.category, source: "ARIA Knowledge Base" }]
      );

      for (const chunk of chunks) {
        const embedding = await embeddings.embedQuery(chunk.pageContent);
        await supabase.from("documents").insert({
          content:   chunk.pageContent,
          metadata:  chunk.metadata,
          embedding: JSON.stringify(embedding),
        });
      }
    }

    isSeeded = true;
    console.log("[RAG] Knowledge base seeded successfully");
  } catch (err) {
    console.error("[RAG] Seeding error:", err);
  }
}

// ── Retrieve relevant context ─────────────────────────────────────────────────
export async function retrieveRelevantContext(
  query: string,
  topK = 3
): Promise<string> {
  try {
    // Seed on first use
    await seedKnowledgeBase();

    const supabase   = getSupabaseClient();
    const embeddings = getEmbeddings();

    const queryEmbedding = await embeddings.embedQuery(query);

    const { data, error } = await supabase.rpc("match_documents", {
      query_embedding: queryEmbedding,
      match_count:     topK,
      filter:          {},
    });

    if (error) {
      console.error("[RAG] Query error:", error);
      return "";
    }

    if (!data || data.length === 0) return "";

    const context = data
      .map((doc: { metadata: { title: string }; content: string }) =>
        "[" + doc.metadata.title + "] " + doc.content
      )
      .join(" --- ");

    return "\n\nRELEVANT KNOWLEDGE BASE CONTEXT:\n" + context + "\n\nUse the above context to enhance your response with proven frameworks and domain knowledge.";
  } catch (err) {
    console.error("[RAG] Retrieval error:", err);
    return "";
  }
}

// ── Add custom documents ──────────────────────────────────────────────────────
export async function addToKnowledgeBase(
  content:  string,
  metadata: Record<string, string>
): Promise<void> {
  try {
    const supabase   = getSupabaseClient();
    const embeddings = getEmbeddings();

    const splitter = new RecursiveCharacterTextSplitter({
      chunkSize:    800,
      chunkOverlap: 100,
    });

    const docs = await splitter.createDocuments([content], [metadata]);

    for (const doc of docs) {
      const embedding = await embeddings.embedQuery(doc.pageContent);
      await supabase.from("documents").insert({
        content:   doc.pageContent,
        metadata:  doc.metadata,
        embedding: JSON.stringify(embedding),
      });
    }

    console.log("[RAG] Added", docs.length, "chunks to Supabase knowledge base");
  } catch (err) {
    console.error("[RAG] Error adding to knowledge base:", err);
  }
}
