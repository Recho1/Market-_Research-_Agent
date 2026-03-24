import jsPDF from "jspdf";
import type { ChatMessage } from "@/types";

function stripMarkdown(text: string): string {
  return text
    .replace(/```chart[\s\S]*?```/g, "[Chart]")
    .replace(/```[\s\S]*?```/g, (m) => m.replace(/```\w*\n?/g, "").trim())
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/\*(.+?)\*/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/^- /gm, "• ")
    .replace(/^\d+\. /gm, "  ")
    .trim();
}

type RGB = [number, number, number];

const BLACK:    RGB = [10,  10,  15];
const DARK_BG:  RGB = [20,  20,  30];
const GREEN:    RGB = [0,   200, 110];
const AMBER:    RGB = [255, 183, 0];
const PURPLE:   RGB = [124, 124, 255];
const WHITE:    RGB = [232, 232, 240];
const GRAY:     RGB = [140, 140, 160];
const DIM_GRAY: RGB = [80,  80,  100];
const LT_GRAY:  RGB = [200, 200, 216];
const BORDER:   RGB = [35,  35,  50];

export async function exportChatToPdf(
  messages:    ChatMessage[],
  profileName: string,
  industry:    string
) {
  const doc    = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
  const PAGE_W = 210;
  const PAGE_H = 297;
  const MARGIN = 18;
  const COL_W  = PAGE_W - MARGIN * 2;
  const LINE_H = 5.5;
  let y        = MARGIN;

  function setFill(c: RGB)   { doc.setFillColor(c[0], c[1], c[2]); }
  function setDraw(c: RGB)   { doc.setDrawColor(c[0], c[1], c[2]); }
  function setColor(c: RGB)  { doc.setTextColor(c[0], c[1], c[2]); }

  function newPage() {
    doc.addPage();
    setFill(BLACK);
    doc.rect(0, 0, PAGE_W, PAGE_H, "F");
    setFill(DARK_BG);
    doc.rect(0, 0, PAGE_W, 10, "F");
    doc.setFontSize(6.5);
    setColor(GREEN);
    doc.setFont("helvetica", "bold");
    doc.text("ARIA", MARGIN, 7);
    setColor(DIM_GRAY);
    doc.setFont("helvetica", "normal");
    doc.text("Market Research Report — Confidential", MARGIN + 8, 7);
    doc.text(new Date().toLocaleDateString(), PAGE_W - MARGIN, 7, { align: "right" });
    y = 18;
  }

  function checkPage(need = 12) {
    if (y + need > PAGE_H - 12) newPage();
  }

  function txt(
    content: string,
    x: number,
    size: number,
    color: RGB,
    bold = false,
    maxW = COL_W
  ) {
    doc.setFontSize(size);
    setColor(color);
    doc.setFont("helvetica", bold ? "bold" : "normal");
    const lines = doc.splitTextToSize(String(content), maxW);
    for (const line of lines) {
      checkPage(LINE_H);
      doc.text(line, x, y);
      y += LINE_H;
    }
  }

  function sectionTitle(title: string, color: RGB = GREEN) {
    checkPage(18);
    y += 5;
    setFill(color);
    doc.rect(MARGIN, y - 4, 3, 9, "F");
    doc.setFontSize(11);
    setColor(color);
    doc.setFont("helvetica", "bold");
    doc.text(title.toUpperCase(), MARGIN + 6, y + 1);
    y += 6;
    setDraw(color);
    doc.setLineWidth(0.2);
    doc.line(MARGIN, y, PAGE_W - MARGIN, y);
    y += 5;
  }

  function subTitle(title: string) {
    checkPage(10);
    y += 3;
    doc.setFontSize(9);
    setColor(WHITE);
    doc.setFont("helvetica", "bold");
    doc.text(title, MARGIN, y);
    y += 5;
  }

  function blt(content: string) {
    checkPage(LINE_H + 2);
    setFill(GREEN);
    doc.circle(MARGIN + 1.5, y - 1.2, 0.9, "F");
    txt(content, MARGIN + 5, 9, LT_GRAY, false, COL_W - 6);
  }

  function hline() {
    setDraw(BORDER);
    doc.setLineWidth(0.15);
    doc.line(MARGIN, y, PAGE_W - MARGIN, y);
    y += 3;
  }

  // ── COVER PAGE ─────────────────────────────────────────────────────────────
  setFill(BLACK);
  doc.rect(0, 0, PAGE_W, PAGE_H, "F");

  setFill(GREEN);
  doc.rect(0, 0, PAGE_W, 2.5, "F");

  setFill(DARK_BG);
  doc.rect(0, 2.5, PAGE_W, 40, "F");

  doc.setFontSize(34);
  setColor(GREEN);
  doc.setFont("helvetica", "bold");
  doc.text("ARIA", MARGIN, 28);

  doc.setFontSize(9);
  setColor(GRAY);
  doc.setFont("helvetica", "normal");
  doc.text("Advanced Research & Intelligence Agent", MARGIN, 36);

  setDraw(GREEN);
  doc.setLineWidth(0.5);
  doc.line(MARGIN, 45, PAGE_W - MARGIN, 45);

  doc.setFillColor(30, 30, 45);
  doc.roundedRect(MARGIN, 51, 58, 7, 1.5, 1.5, "F");
  doc.setDrawColor(0, 200, 110);
  doc.setLineWidth(0.25);
  doc.roundedRect(MARGIN, 51, 58, 7, 1.5, 1.5, "S");
  doc.setFontSize(7);
  setColor(GREEN);
  doc.setFont("helvetica", "bold");
  doc.text("MARKET RESEARCH REPORT", MARGIN + 4, 56.5);

  const firstUser = messages.find(m => m.role === "user");
  const rTitle    = firstUser
    ? firstUser.content.replace("[Deep Research] ", "").slice(0, 65)
    : "Market Research Analysis";

  doc.setFontSize(20);
  setColor(WHITE);
  doc.setFont("helvetica", "bold");
  const tLines = doc.splitTextToSize(rTitle, COL_W);
  let ty = 68;
  for (const tl of tLines) { doc.text(tl, MARGIN, ty); ty += 9; }

  doc.setFontSize(10);
  setColor(GRAY);
  doc.setFont("helvetica", "normal");
  doc.text(industry + " Industry Analysis", MARGIN, ty + 3);

  const cy = PAGE_H - 88;
  setDraw(BORDER);
  doc.setLineWidth(0.2);
  doc.line(MARGIN, cy - 5, PAGE_W - MARGIN, cy - 5);

  doc.setFontSize(7);
  setColor(DIM_GRAY);
  doc.setFont("helvetica", "bold");
  doc.text("PREPARED BY", MARGIN, cy);

  const infoCards = [
    { label: "Analyst",  value: profileName, color: GREEN,  x: MARGIN      },
    { label: "Industry", value: industry,    color: AMBER,  x: MARGIN + 59 },
    { label: "Date",     value: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }), color: PURPLE, x: MARGIN + 118 },
  ];

  for (const ic of infoCards) {
    doc.setFillColor(25, 25, 38);
    doc.roundedRect(ic.x, cy + 5, 55, 14, 1.5, 1.5, "F");
    setFill(ic.color);
    doc.rect(ic.x, cy + 5, 2.5, 14, "F");
    doc.setFontSize(6.5);
    setColor(ic.color);
    doc.setFont("helvetica", "bold");
    doc.text(ic.label.toUpperCase(), ic.x + 5, cy + 11);
    doc.setFontSize(8.5);
    setColor(WHITE);
    doc.setFont("helvetica", "bold");
    doc.text(ic.value.slice(0, 20), ic.x + 5, cy + 17);
  }

  const totalTok   = messages.reduce((s, m) => s + (m.metadata?.tokenUsage?.totalTokens || 0), 0);
  const totalTools = messages.reduce((s, m) => s + (m.toolCalls?.length || 0), 0);
  const statCards  = [
    { label: "Messages",  value: messages.length.toString(), color: GREEN  },
    { label: "Tools Run", value: totalTools.toString(),      color: AMBER  },
    { label: "Tokens",    value: totalTok.toLocaleString(),  color: PURPLE },
  ];

  const sw = (COL_W - 6) / 3;
  statCards.forEach((sc, i) => {
    const sx = MARGIN + i * (sw + 3);
    doc.setFillColor(25, 25, 38);
    doc.roundedRect(sx, cy + 27, sw, 14, 1.5, 1.5, "F");
    doc.setFontSize(13);
    setColor(sc.color);
    doc.setFont("helvetica", "bold");
    doc.text(sc.value, sx + sw / 2, cy + 37, { align: "center" });
    doc.setFontSize(6.5);
    setColor(DIM_GRAY);
    doc.setFont("helvetica", "normal");
    doc.text(sc.label, sx + sw / 2, cy + 39.5, { align: "center" });
  });

  doc.setFillColor(25, 25, 38);
  doc.roundedRect(MARGIN, PAGE_H - 22, COL_W, 9, 1.5, 1.5, "F");
  doc.setFontSize(7);
  setColor(DIM_GRAY);
  doc.setFont("helvetica", "bold");
  doc.text("CONFIDENTIAL", MARGIN + 4, PAGE_H - 16);
  doc.setFont("helvetica", "normal");
  doc.text("Intended solely for the named recipient. Unauthorized distribution is prohibited.", MARGIN + 30, PAGE_H - 16);

  setFill(GREEN);
  doc.rect(0, PAGE_H - 1.5, PAGE_W, 1.5, "F");

  // ── PAGE 2: EXEC SUMMARY + TOC ─────────────────────────────────────────────
  newPage();
  sectionTitle("Executive Summary", GREEN);

  const aiMsgs = messages.filter(m => m.role === "assistant");
  if (aiMsgs.length > 0) {
    doc.setFillColor(22, 22, 35);
    doc.roundedRect(MARGIN, y, COL_W, 28, 2, 2, "F");
    setFill(GREEN);
    doc.rect(MARGIN, y, 2.5, 28, "F");
    const sumText = stripMarkdown(aiMsgs[0].content).slice(0, 350);
    doc.setFontSize(9);
    setColor(LT_GRAY);
    doc.setFont("helvetica", "normal");
    const sl = doc.splitTextToSize(sumText, COL_W - 10);
    let sy = y + 7;
    for (const s of sl.slice(0, 4)) { doc.text(s, MARGIN + 6, sy); sy += LINE_H; }
    y += 34;
  }

  sectionTitle("Table of Contents", PURPLE);
  const toc = [
    { n: "01", t: "Executive Summary",      p: 2 },
    { n: "02", t: "Research Conversations", p: 3 },
    { n: "03", t: "Key Insights",           p: 4 },
    { n: "04", t: "Methodology & Sources",  p: 4 },
    { n: "05", t: "Disclaimer",             p: 4 },
  ];
  for (const item of toc) {
    checkPage(10);
    doc.setFillColor(22, 22, 35);
    doc.roundedRect(MARGIN, y - 3, COL_W, 8, 1, 1, "F");
    doc.setFontSize(8);
    setColor(PURPLE);
    doc.setFont("helvetica", "bold");
    doc.text(item.n, MARGIN + 4, y + 2);
    setColor(LT_GRAY);
    doc.setFont("helvetica", "normal");
    doc.text(item.t, MARGIN + 14, y + 2);
    setColor(DIM_GRAY);
    doc.text("Page " + item.p, PAGE_W - MARGIN - 4, y + 2, { align: "right" });
    setDraw(BORDER);
    doc.setLineWidth(0.1);
    doc.line(MARGIN + 65, y + 1, PAGE_W - MARGIN - 18, y + 1);
    y += 10;
  }

  // ── PAGE 3: CONVERSATIONS ──────────────────────────────────────────────────
  newPage();
  sectionTitle("Research Conversations", GREEN);

  for (const msg of messages) {
    const isUser = msg.role === "user";
    if (msg.role !== "user" && msg.role !== "assistant") continue;
    checkPage(22);

    doc.setFillColor(22, 22, 35);
    doc.roundedRect(MARGIN, y - 1, COL_W, 7, 1, 1, "F");

    if (isUser) {
      doc.setFillColor(60, 45, 10);
      doc.roundedRect(MARGIN + 2, y, 20, 5, 1, 1, "F");
      doc.setFontSize(7);
      setColor(AMBER);
      doc.setFont("helvetica", "bold");
      doc.text("ANALYST", MARGIN + 4, y + 3.5);
    } else {
      doc.setFillColor(10, 40, 25);
      doc.roundedRect(MARGIN + 2, y, 14, 5, 1, 1, "F");
      doc.setFontSize(7);
      setColor(GREEN);
      doc.setFont("helvetica", "bold");
      doc.text("ARIA", MARGIN + 4, y + 3.5);
    }

    const ts = new Date(msg.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    doc.setFontSize(7);
    setColor(DIM_GRAY);
    doc.setFont("helvetica", "normal");
    doc.text(ts, PAGE_W - MARGIN - 2, y + 3.5, { align: "right" });

    if (!isUser && msg.toolCalls && msg.toolCalls.length > 0) {
      const tStr = msg.toolCalls.map(t => t.name.replace(/_/g, " ")).join(" · ");
      doc.setFontSize(6.5);
      doc.setTextColor(0, 160, 90);
      doc.setFont("helvetica", "italic");
      doc.text("Tools: " + tStr, MARGIN + 26, y + 3.5);
    }
    y += 9;

    const cleaned = stripMarkdown(msg.content);
    const lines   = doc.splitTextToSize(cleaned, COL_W - 4);
    const maxL    = isUser ? 4 : 30;
    doc.setFontSize(isUser ? 9.5 : 9);
    setColor(isUser ? WHITE : LT_GRAY);
    doc.setFont("helvetica", isUser ? "bold" : "normal");
    for (let li = 0; li < Math.min(lines.length, maxL); li++) {
      checkPage(LINE_H);
      doc.text(lines[li], MARGIN + 2, y);
      y += LINE_H;
    }
    if (lines.length > maxL) {
      doc.setFontSize(7.5);
      setColor(DIM_GRAY);
      doc.setFont("helvetica", "italic");
      doc.text("... (" + (lines.length - maxL) + " more lines)", MARGIN + 2, y);
      y += LINE_H;
    }

    if (!isUser && msg.metadata?.tokenUsage) {
      const { totalTokens, estimatedCostUsd } = msg.metadata.tokenUsage;
      doc.setFontSize(7);
      setColor(DIM_GRAY);
      doc.setFont("helvetica", "normal");
      doc.text(
        totalTokens.toLocaleString() + " tokens · $" + estimatedCostUsd.toFixed(4),
        PAGE_W - MARGIN, y, { align: "right" }
      );
      y += LINE_H;
    }
    y += 3;
    hline();
  }

  // ── KEY INSIGHTS ───────────────────────────────────────────────────────────
  checkPage(40);
  sectionTitle("Key Insights", AMBER);
  subTitle("Research Topics Covered");
  const queries = messages
    .filter(m => m.role === "user")
    .map(m => m.content.replace("[Deep Research] ", ""));
  for (const q of queries.slice(0, 8)) blt(q.slice(0, 120));

  y += 4;
  subTitle("Capabilities Deployed");
  const allT = messages.flatMap(m => m.toolCalls || []);
  const tCnt = allT.reduce((a, t) => {
    a[t.name] = (a[t.name] || 0) + 1;
    return a;
  }, {} as Record<string, number>);
  for (const [tool, cnt] of Object.entries(tCnt)) {
    blt(tool.replace(/_/g, " ") + " — used " + cnt + " time" + (cnt > 1 ? "s" : ""));
  }

  // ── METHODOLOGY ────────────────────────────────────────────────────────────
  checkPage(50);
  sectionTitle("Methodology & Sources", PURPLE);
  subTitle("Research Architecture");
  blt("ARIA — Advanced Research & Intelligence Agent (LangGraph ReAct)");
  blt("Multi-agent system with 4 parallel specialist sub-agents");
  blt("RAG with Supabase pgvector persistent knowledge base");
  blt("Real-time web search via Serper.dev Google Search API");
  blt("Financial market data via Alpha Vantage");
  blt("Language model: OpenAI GPT-4o");
  y += 4;
  subTitle("Data Sources");
  blt("Serper.dev — Real-time Google Search API");
  blt("Alpha Vantage — Live stock and financial market data");
  blt("Supabase pgvector — Vector similarity search for RAG");
  blt("ARIA Knowledge Base — Proprietary market research frameworks");

  // ── DISCLAIMER ─────────────────────────────────────────────────────────────
  checkPage(30);
  sectionTitle("Disclaimer", DIM_GRAY);
  txt(
    "This report has been generated by an AI-powered market research agent. The information provided is for informational purposes only and should not be construed as financial or investment advice. Always conduct your own due diligence before making business or investment decisions.",
    MARGIN, 8, DIM_GRAY
  );

  // ── FOOTER ALL PAGES ────────────────────────────────────────────────────────
  const total = (doc as jsPDF & { internal: { getNumberOfPages: () => number } }).internal.getNumberOfPages();
  for (let p = 1; p <= total; p++) {
    doc.setPage(p);
    setFill(BLACK);
    doc.rect(0, PAGE_H - 9, PAGE_W, 9, "F");
    setDraw(GREEN);
    doc.setLineWidth(0.3);
    doc.line(0, PAGE_H - 9, PAGE_W, PAGE_H - 9);
    doc.setFontSize(6.5);
    setColor(DIM_GRAY);
    doc.setFont("helvetica", "normal");
    doc.text("ARIA Market Research Agent  ·  Confidential  ·  AI-Powered Analysis", MARGIN, PAGE_H - 4);
    setColor(GREEN);
    doc.setFont("helvetica", "bold");
    doc.text(p + " / " + total, PAGE_W - MARGIN, PAGE_H - 4, { align: "right" });
    setFill(GREEN);
    doc.rect(0, PAGE_H - 1, PAGE_W, 1, "F");
  }

  const fname = "ARIA-Research-" + profileName.replace(/\s+/g, "-") + "-" + new Date().toISOString().split("T")[0] + ".pdf";
  doc.save(fname);
}
