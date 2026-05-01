"use client";
import { useState, useRef, useEffect, useCallback } from "react";
import MessageBubble from "@/components/MessageBubble";
import ToolPanel from "@/components/ToolPanel";
import ModelSettingsPanel from "@/components/ModelSettingsPanel";
import TokenUsageDisplay from "@/components/TokenUsageDisplay";
import HelpChatbot from "@/components/HelpChatbot";
import LoginScreen from "@/components/LoginScreen";
import FeatureBadges from "@/components/FeatureBadges";
import InputBar from "@/components/InputBar";
import { exportChatToPdf } from "@/lib/exportPdf";
import type { ChatMessage, ToolName, ModelSettings, SessionStats, TokenUsage, ToolCall, UserProfile, Attachment } from "@/types";

const DEFAULT_SETTINGS: ModelSettings = { model:"gpt-4o", temperature:0.3, maxTokens:2000, topP:1, frequencyPenalty:0, presencePenalty:0, personality:"balanced" };
const DEFAULT_TOOLS: ToolName[] = ["web_search","competitor_analysis","market_sizing","trend_analysis","financial_data","swot_analysis"];
const DEFAULT_STATS: SessionStats = { totalMessages:0,totalTokens:0,totalCostUsd:0,toolCallsCount:0,avgResponseMs:0,cacheHits:0,positiveRatings:0,negativeRatings:0,ragRetrievals:0,documentsUploaded:0 };

function generateId() { return Math.random().toString(36).slice(2,10); }

const PERSONALITY_COLORS: Record<string,string> = { formal:"text-[#7c7cff]",balanced:"text-[#00ff88]",friendly:"text-[#ffb700]",concise:"text-[#ff6b6b]" };
const PERSONALITY_LABELS: Record<string,string> = { formal:"Formal",balanced:"Balanced",friendly:"Friendly",concise:"Concise" };

type SidebarTab = "tools"|"settings"|"stats"|"help";

interface SavedChat {
  id: string; title: string; messages: ChatMessage[]; savedAt: string; msgCount: number;
}

const TABS: {id:SidebarTab;icon:string;label:string;title:string}[] = [
  { id:"tools",    label:"Tools",    title:"Agent Tools",       icon:`<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>` },
  { id:"settings", label:"Settings", title:"Model Settings",    icon:`<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>` },
  { id:"stats",    label:"Stats",    title:"Session Analytics", icon:`<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>` },
  { id:"help",     label:"Help",     title:"Help & Docs",       icon:`<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>` },
];

function IconBtn({ onClick, title, disabled, children }: { onClick:()=>void; title:string; disabled?:boolean; children:React.ReactNode }) {
  return (
    <button onClick={onClick} disabled={disabled} title={title}
      className="relative group w-8 h-8 rounded-lg flex items-center justify-center transition-all disabled:opacity-30 disabled:cursor-not-allowed border border-[#1e1e2e] text-[#505070] hover:border-[#00ff88]/20 hover:text-[#00ff88] hover:bg-[#00ff88]/5">
      {children}
      <span className="pointer-events-none absolute -bottom-7 left-1/2 -translate-x-1/2 whitespace-nowrap text-[10px] font-mono text-[#e8e8f0] bg-[#1a1a24] border border-[#252533] rounded px-2 py-0.5 opacity-0 group-hover:opacity-100 transition-opacity z-50">{title}</span>
    </button>
  );
}

export default function HomePage() {
  const [profile,        setProfile]        = useState<UserProfile|null>(null);
  const [authReady,      setAuthReady]      = useState(false);
  const [isNewUser,      setIsNewUser]      = useState(false);
  const [messages,       setMessages]       = useState<ChatMessage[]>([]);
  const [input,          setInput]          = useState("");
  const [isLoading,      setIsLoading]      = useState(false);
  const [isDeepResearch, setIsDeepResearch] = useState(false);
  const [enabledTools,   setEnabledTools]   = useState<ToolName[]>(DEFAULT_TOOLS);
  const [settings,       setSettings]       = useState<ModelSettings>(DEFAULT_SETTINGS);
  const [stats,          setStats]          = useState<SessionStats>(DEFAULT_STATS);
  const [tab,            setTab]            = useState<SidebarTab>("tools");
  const [collapsed,      setCollapsed]      = useState(false);
  const [error,          setError]          = useState<string|null>(null);
  const [sessionId]                         = useState(generateId);
  const [showSearch,     setShowSearch]     = useState(false);
  const [searchQuery,    setSearchQuery]    = useState("");
  const [savedChats,     setSavedChats]     = useState<SavedChat[]>([]);
  const [currentChatId,  setCurrentChatId]  = useState<string>(generateId());
  const [isExporting,    setIsExporting]    = useState(false);
  const [attachments,    setAttachments]    = useState<Attachment[]>([]);

  const endRef    = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  // ── Restore session from JWT ──────────────────────────────────────────────
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await fetch("/api/auth/me");
        if (res.ok) {
          const data = await res.json();
          const profile: UserProfile = {
            id: data.user.id, name: data.user.name, email: data.user.email,
            role: data.user.role, industry: data.user.industry, verified: data.user.verified,
            preferences: data.user.preferences, createdAt: new Date(data.user.createdAt),
          };
          setProfile(profile);
          if (profile.preferences?.enabledTools?.length) setEnabledTools(profile.preferences.enabledTools);
          if (profile.preferences?.defaultPersonality)   setSettings(s=>({...s,personality:profile.preferences.defaultPersonality}));
          if (profile.preferences?.defaultModel)         setSettings(s=>({...s,model:profile.preferences.defaultModel}));
          loadServerChats();
        }
      } catch { /* not logged in */ }
      setAuthReady(true);
    };
    checkAuth();
  }, []);

  const loadServerChats = async () => {
    try {
      const res = await fetch("/api/chats");
      if (res.ok) {
        const data = await res.json();
        setSavedChats(data.chats || []);
      }
    } catch { /* ignore */ }
  };

  useEffect(() => { endRef.current?.scrollIntoView({behavior:"smooth"}); }, [messages,isLoading]);
  useEffect(() => { if(showSearch) setTimeout(()=>searchRef.current?.focus(),50); }, [showSearch]);

  // Auto-save chat to server
  useEffect(() => {
    if (messages.length < 2 || !profile) return;
    const first = messages.find(m=>m.role==="user");
    const title = first ? first.content.replace("[Deep Research] ","").slice(0,50) : "Untitled";
    const chat: SavedChat = { id:currentChatId, title, messages, savedAt:new Date().toISOString(), msgCount:messages.length };
    setSavedChats(prev => [chat, ...prev.filter(c=>c.id!==currentChatId)].slice(0,30));
    fetch("/api/chats", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify(chat) }).catch(()=>{});
  }, [messages, currentChatId, profile]);

  const handleLogin = (p: UserProfile, newUser: boolean) => {
    setProfile(p); setIsNewUser(newUser);
    setEnabledTools(p.preferences.enabledTools);
    setSettings(s=>({...s, personality:p.preferences.defaultPersonality, model:p.preferences.defaultModel}));
    loadServerChats();
  };

  const handleLogout = async () => {
    try { await fetch("/api/auth/logout", {method:"POST"}); } catch { /* ignore */ }
    localStorage.removeItem("aria_profile");
    localStorage.removeItem("aria_token");
    setProfile(null); setMessages([]); setStats(DEFAULT_STATS); setSavedChats([]); setIsNewUser(false);
  };

  const handleNewChat = () => {
    setMessages([]); setStats(DEFAULT_STATS); setError(null);
    setInput(""); setAttachments([]); setCurrentChatId(generateId()); setShowSearch(false);
  };

  const handleLoadChat = (chat: SavedChat) => {
    setMessages(chat.messages.map(m=>({...m,timestamp:new Date(m.timestamp)})));
    setCurrentChatId(chat.id); setShowSearch(false); setStats(DEFAULT_STATS);
  };

  const handleDeleteChat = async (chatId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSavedChats(prev=>prev.filter(c=>c.id!==chatId));
    fetch("/api/chats", { method:"DELETE", headers:{"Content-Type":"application/json"}, body:JSON.stringify({chatId}) }).catch(()=>{});
  };

  const handleExportPdf = async () => {
    if (!messages.length||!profile||isExporting) return;
    setIsExporting(true);
    try { await exportChatToPdf(messages, profile.name, profile.industry); }
    catch { setError("PDF export failed."); }
    finally { setIsExporting(false); }
  };

  const toggleTool = useCallback((t: ToolName) => {
    setEnabledTools(p => p.includes(t) ? p.filter(x=>x!==t) : [...p,t]);
  }, []);

  // ── Standard send ─────────────────────────────────────────────────────────
  const send = useCallback(async (text: string) => {
    const t = text.trim();
    if (!t || isLoading) return;
    if (t.length > 2000) { setError("Message too long."); return; }
    setError(null); setInput(""); setAttachments([]);
    const currentAttachments = [...attachments];
    const userMsg: ChatMessage = { id:generateId(), role:"user", content:t, timestamp:new Date(), attachments:currentAttachments };
    setMessages(p=>[...p,userMsg]); setIsLoading(true);
    try {
      const res = await fetch("/api/chat", {
        method:"POST", headers:{"Content-Type":"application/json"},
        body: JSON.stringify({ message:t, sessionId, userId:profile?.id, history:messages.map(m=>({role:m.role,content:m.content})), enabledTools, settings, attachments:currentAttachments }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      const tokenUsage = data.tokenUsage as TokenUsage;
      const toolCalls  = data.toolCalls  as ToolCall[];
      const durationMs = data.durationMs as number;
      const cached     = data.cached     as boolean;
      const retries    = data.retries    as number;
      setMessages(p=>[...p,{ id:generateId(), role:"assistant", content:data.content, timestamp:new Date(), toolCalls, cached, retries, metadata:{ tokenUsage, durationMs, personality:settings.personality, ragSources:data.ragSources, observabilityData:data.observabilityData } }]);
      setStats(p=>({
        totalMessages:    p.totalMessages+1,
        totalTokens:      p.totalTokens+(tokenUsage?.totalTokens||0),
        totalCostUsd:     p.totalCostUsd+(tokenUsage?.estimatedCostUsd||0),
        toolCallsCount:   p.toolCallsCount+(toolCalls?.length||0),
        cacheHits:        p.cacheHits+(cached?1:0),
        positiveRatings:  p.positiveRatings,
        negativeRatings:  p.negativeRatings,
        ragRetrievals:    p.ragRetrievals+(data.ragSources?.length||0),
        documentsUploaded:p.documentsUploaded+currentAttachments.length,
        avgResponseMs:    p.totalMessages===0?durationMs:Math.round((p.avgResponseMs*p.totalMessages+durationMs)/(p.totalMessages+1)),
      }));
    } catch(err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setMessages(p=>p.filter(m=>m.id!==userMsg.id));
    } finally { setIsLoading(false); }
  }, [messages, isLoading, sessionId, profile?.id, enabledTools, settings, attachments]);

  // ── Deep Research ─────────────────────────────────────────────────────────
  const sendDeepResearch = useCallback(async (text: string) => {
    const t = text.trim();
    if (!t || isLoading) return;
    setError(null); setInput(""); setAttachments([]);
    const userMsg: ChatMessage = { id:generateId(), role:"user", content:"[Deep Research] "+t, timestamp:new Date() };
    setMessages(p=>[...p,userMsg]); setIsLoading(true); setIsDeepResearch(true);
    try {
      const res = await fetch("/api/multiagent", {
        method:"POST", headers:{"Content-Type":"application/json"},
        body: JSON.stringify({ message:t, sessionId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      const agentsUsed = data.agentsUsed as string[];
      setMessages(p=>[...p,{ id:generateId(), role:"assistant", content:data.content, timestamp:new Date(), toolCalls:agentsUsed.map(name=>({name,input:{},status:"success" as const})), metadata:{ durationMs:data.durationMs, personality:settings.personality } }]);
      setStats(p=>({
        ...p, totalMessages:p.totalMessages+1, toolCallsCount:p.toolCallsCount+agentsUsed.length,
        avgResponseMs:p.totalMessages===0?data.durationMs:Math.round((p.avgResponseMs*p.totalMessages+data.durationMs)/(p.totalMessages+1)),
      }));
    } catch(err) {
      setError(err instanceof Error ? err.message : "Deep research failed");
      setMessages(p=>p.filter(m=>m.id!==userMsg.id));
    } finally { setIsLoading(false); setIsDeepResearch(false); }
  }, [isLoading, sessionId, settings.personality]);

  const handleFeedbackChange = (rating:"up"|"down") => {
    setStats(p=>({...p, positiveRatings:rating==="up"?p.positiveRatings+1:p.positiveRatings, negativeRatings:rating==="down"?p.negativeRatings+1:p.negativeRatings}));
  };
  const getPrecedingUserMessage = (index: number) => {
    for(let i=index-1;i>=0;i--) { if(messages[i].role==="user") return messages[i].content; }
    return "";
  };
  const filteredChats = savedChats.filter(c =>
    !searchQuery || c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.messages.some((m:ChatMessage) => m.content.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  if (!authReady) return (
    <div className="fixed inset-0 bg-[#0a0a0f] flex items-center justify-center">
      <div className="w-8 h-8 border border-[#00ff88] border-t-transparent rounded-full animate-spin"/>
    </div>
  );
  if (!profile) return <LoginScreen onLogin={handleLogin}/>;

  // Personalized welcome — new vs returning
  const welcomeTitle = isNewUser
    ? `Welcome to ARIA, ${profile.name.split(" ")[0]}!`
    : `Welcome back, ${profile.name.split(" ")[0]}`;

  return (
    <div className="flex h-screen bg-[#0a0a0f] grid-bg overflow-hidden">

      {/* ── Sidebar ── */}
      <aside className={`flex-shrink-0 border-r border-[#1a1a24] flex flex-col bg-[#0d0d14] transition-all duration-300 relative ${collapsed?"w-14":"w-60"}`}>
        <div className="flex items-center justify-between px-3 py-3 border-b border-[#1a1a24]">
          {!collapsed&&(<div className="flex items-center gap-2 min-w-0">
            <div className="w-7 h-7 rounded-lg bg-[#00ff88]/10 border border-[#00ff88]/20 flex items-center justify-center signal-glow flex-shrink-0">
              <span className="text-[9px] font-bold text-[#00ff88] leading-none">AR</span>
            </div>
            <div><div className="font-bold text-[#e8e8f0] text-xs" style={{fontFamily:"Syne,sans-serif"}}>ARIA</div><div className="text-[9px] text-[#404060] font-mono">Market Research</div></div>
          </div>)}
          {collapsed&&<div className="w-7 h-7 rounded-lg bg-[#00ff88]/10 border border-[#00ff88]/20 flex items-center justify-center signal-glow mx-auto"><span className="text-[9px] font-bold text-[#00ff88] leading-none">AR</span></div>}
          {!collapsed&&<button onClick={()=>setCollapsed(true)} className="w-6 h-6 rounded-md flex items-center justify-center text-[#404060] hover:text-[#e8e8f0] hover:bg-[#1a1a24] transition-all"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M15 18l-6-6 6-6"/></svg></button>}
        </div>

        {collapsed&&<button onClick={()=>setCollapsed(false)} className="absolute -right-3 top-3.5 w-6 h-6 rounded-full border border-[#1a1a24] bg-[#0d0d14] flex items-center justify-center text-[#404060] hover:text-[#00ff88] z-20 shadow-lg transition-all"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M9 18l6-6-6-6"/></svg></button>}

        <div className={`flex items-center border-b border-[#1a1a24] ${collapsed?"flex-col py-2 gap-1 px-2":"gap-1 px-3 py-2"}`}>
          <button onClick={handleNewChat} title="New Chat" className={`flex items-center gap-2 rounded-lg border border-transparent text-[#505070] hover:text-[#00ff88] hover:bg-[#00ff88]/5 hover:border-[#00ff88]/20 transition-all ${collapsed?"w-9 h-9 justify-center":"flex-1 px-2.5 py-2"}`}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14"/></svg>
            {!collapsed&&<span className="text-[11px] font-mono">New Chat</span>}
          </button>
          <button onClick={()=>{setShowSearch(s=>!s);if(collapsed)setCollapsed(false);}} title="Search"
            className={`flex items-center gap-2 rounded-lg border transition-all ${showSearch?"text-[#00ff88] bg-[#00ff88]/8 border-[#00ff88]/20":"border-transparent text-[#505070] hover:text-[#00ff88] hover:bg-[#00ff88]/5 hover:border-[#00ff88]/20"} ${collapsed?"w-9 h-9 justify-center":"flex-1 px-2.5 py-2"}`}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            {!collapsed&&<span className="text-[11px] font-mono">Search</span>}
          </button>
        </div>

        {showSearch&&!collapsed&&(
          <div className="border-b border-[#1a1a24] flex flex-col" style={{maxHeight:"260px"}}>
            <div className="px-3 py-2">
              <div className="flex items-center gap-2 bg-[#111118] border border-[#1e1e2e] rounded-lg px-2.5 py-1.5 focus-within:border-[#00ff88]/30 transition-all">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="text-[#404060] flex-shrink-0"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                <input ref={searchRef} type="text" value={searchQuery} onChange={e=>setSearchQuery(e.target.value)} placeholder="Search conversations..." className="flex-1 bg-transparent text-xs text-[#e8e8f0] placeholder-[#404060] outline-none"/>
                {searchQuery&&<button onClick={()=>setSearchQuery("")} className="text-[#404060] hover:text-[#e8e8f0] text-xs">x</button>}
              </div>
            </div>
            <div className="overflow-y-auto flex-1 px-2 pb-2">
              {filteredChats.length===0
                ? <p className="text-[10px] text-[#404060] text-center py-4 font-mono">{searchQuery?"No results":"No saved chats yet"}</p>
                : <div className="space-y-1">{filteredChats.map(chat=>(
                    <button key={chat.id} onClick={()=>handleLoadChat(chat)}
                      className={`w-full text-left p-2 rounded-lg border transition-all group ${chat.id===currentChatId?"border-[#00ff88]/20 bg-[#00ff88]/5":"border-transparent hover:border-[#1e1e2e] hover:bg-[#111118]"}`}>
                      <div className="flex items-start justify-between gap-1">
                        <div className="min-w-0 flex-1"><p className="text-[11px] text-[#c8c8d8] truncate">{chat.title}</p><p className="text-[9px] text-[#404060] font-mono">{chat.msgCount} msgs · {new Date(chat.savedAt).toLocaleDateString()}</p></div>
                        <button onClick={e=>handleDeleteChat(chat.id,e)} className="opacity-0 group-hover:opacity-100 text-[#404060] hover:text-[#ff6b6b] text-xs transition-all">x</button>
                      </div>
                    </button>
                  ))}</div>
              }
            </div>
          </div>
        )}

        {!collapsed&&!showSearch&&(
          <div className="px-3 py-2 border-b border-[#1a1a24]">
            <div className="flex items-center justify-between bg-[#111118] border border-[#1e1e2e] rounded-lg px-2 py-1.5">
              <div className="flex items-center gap-1.5 min-w-0">
                <div className="w-5 h-5 rounded-md bg-[#00ff88]/15 border border-[#00ff88]/25 flex items-center justify-center flex-shrink-0">
                  <span className="text-[9px] font-bold text-[#00ff88] leading-none">{profile.name[0].toUpperCase()}</span>
                </div>
                <div className="min-w-0">
                  <div className="text-[10px] font-semibold text-[#c8c8d8] truncate">{profile.name}</div>
                  <div className="text-[9px] text-[#404060] truncate flex items-center gap-1">
                    {profile.verified&&<span className="text-[#00ff88]">✓</span>}{profile.industry}
                  </div>
                </div>
              </div>
              <button onClick={handleLogout} className="text-[9px] font-mono text-[#404060] hover:text-[#ff6b6b] transition-colors ml-1">out</button>
            </div>
            <div className="flex items-center gap-1 mt-1.5 flex-wrap">
              <span className="flex items-center gap-1 text-[8px] font-mono text-[#505070] bg-[#0d0d14] border border-[#1a1a24] rounded-full px-1.5 py-0.5"><span className="w-1 h-1 rounded-full bg-[#00ff88]"/>{enabledTools.length} tools</span>
              <span className={`text-[8px] font-mono bg-[#0d0d14] border border-[#1a1a24] rounded-full px-1.5 py-0.5 ${PERSONALITY_COLORS[settings.personality]}`}>{PERSONALITY_LABELS[settings.personality]}</span>
            </div>
          </div>
        )}
        {collapsed&&<div className="flex flex-col items-center py-2 border-b border-[#1a1a24]"><div className="w-7 h-7 rounded-md bg-[#00ff88]/15 border border-[#00ff88]/25 flex items-center justify-center" title={profile.name}><span className="text-[10px] font-bold text-[#00ff88] leading-none">{profile.name[0].toUpperCase()}</span></div></div>}

        <nav className="flex flex-col py-2 gap-0.5 border-b border-[#1a1a24] px-2">
          {TABS.map(t=>(
            <button key={t.id} onClick={()=>{setTab(t.id);setShowSearch(false);if(collapsed)setCollapsed(false);}} title={t.title}
              className={`flex items-center gap-2.5 rounded-lg transition-all ${collapsed?"w-9 h-9 justify-center mx-auto":"px-2.5 py-2 w-full"} ${tab===t.id&&!showSearch?"bg-[#00ff88]/8 text-[#00ff88] border border-[#00ff88]/20":"text-[#404060] hover:text-[#808090] hover:bg-[#111118] border border-transparent"}`}>
              <span className="flex-shrink-0" dangerouslySetInnerHTML={{__html:t.icon}}/>
              {!collapsed&&<span className="text-[11px] font-mono">{t.label}</span>}
            </button>
          ))}
        </nav>

        {!collapsed&&!showSearch&&(
          <div className="flex-1 overflow-y-auto p-3">
            {tab==="tools"    && <ToolPanel enabledTools={enabledTools} onToggle={toggleTool}/>}
            {tab==="settings" && <ModelSettingsPanel settings={settings} onChange={setSettings}/>}
            {tab==="stats"    && <TokenUsageDisplay stats={stats}/>}
            {tab==="help"     && (
              <div className="space-y-2">
                <p className="text-[10px] font-mono text-[#505070] uppercase tracking-widest mb-3">Help & Docs</p>
                {[
                  {color:"text-[#7c7cff] bg-[#7c7cff]/5 border-[#7c7cff]/20",title:"Agentic RAG",   desc:"Query rewriting + pgvector retrieval with relevance scores."},
                  {color:"text-[#ffb700] bg-[#ffb700]/5 border-[#ffb700]/20",title:"Deep Research", desc:"Star button runs 4 specialist agents in parallel."},
                  {color:"text-[#00ff88] bg-[#00ff88]/5 border-[#00ff88]/15",title:"Observability", desc:"Click the trace icon to see full agent execution steps."},
                  {color:"text-[#ff6b6b] bg-[#ff6b6b]/5 border-[#ff6b6b]/20",title:"Voice + Docs", desc:"Mic for voice input. Paperclip to upload documents."},
                ].map((item,i)=>(
                  <div key={i} className={`rounded-lg p-2.5 border ${item.color.split(" ").slice(1).join(" ")}`}>
                    <p className={`text-[10px] font-mono mb-1 ${item.color.split(" ")[0]}`}>{item.title}</p>
                    <p className="text-[11px] text-[#505070]">{item.desc}</p>
                  </div>
                ))}
                {[
                  {title:"Tool Reference",    desc:"What each of the 9 tools does"},
                  {title:"Personality Modes", desc:"Formal, Balanced, Friendly, Concise"},
                  {title:"Plugin System",     desc:"Enable extra tools dynamically"},
                  {title:"PDF Export",        desc:"Download research as a formatted report"},
                ].map((item,i)=>(
                  <div key={i} className="p-2.5 rounded-lg border border-[#1e1e2e] bg-[#111118]">
                    <div className="text-xs font-semibold text-[#c8c8d8]">{item.title}</div>
                    <div className="text-[10px] text-[#404060] mt-0.5">{item.desc}</div>
                  </div>
                ))}
                <div className="mt-2 bg-[#00ff88]/5 border border-[#00ff88]/15 rounded-lg p-3">
                  <p className="text-[10px] font-mono text-[#00ff88] mb-1">Need help?</p>
                  <p className="text-[11px] text-[#505070]">Click the chat bubble in the bottom right.</p>
                </div>
              </div>
            )}
          </div>
        )}

        <div className={`border-t border-[#1a1a24] ${collapsed?"p-2":"p-3"}`}>
          {collapsed ? (
            <button onClick={handleLogout} title="Sign out" className="w-9 h-9 mx-auto flex items-center justify-center rounded-lg text-[#404060] hover:text-[#ff6b6b] hover:bg-[#1a1a24] transition-all">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
            </button>
          ) : messages.length>0 ? (
            <button onClick={()=>{setMessages([]);setStats(DEFAULT_STATS);setError(null);setCurrentChatId(generateId());}} className="w-full py-1.5 text-[11px] font-mono text-[#505070] hover:text-[#ff6b6b] border border-[#1e1e2e] hover:border-[#ff6b6b]/20 rounded-lg transition-all">Clear Chat</button>
          ) : (
            <p className="text-[9px] text-[#252535] font-mono text-center">OpenAI · LangGraph · RAG</p>
          )}
        </div>
      </aside>

      {/* ── Main ── */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-2.5 border-b border-[#1a1a24] bg-[#0a0a0f]/90 backdrop-blur-sm flex-shrink-0">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-[#00ff88] animate-pulse flex-shrink-0"/>
            <span className="text-[10px] font-mono text-[#404060]">{profile.name.split(" ")[0]} · {profile.industry}</span>
            {profile.verified&&<span className="text-[9px] font-mono text-[#00ff88] bg-[#00ff88]/8 border border-[#00ff88]/20 rounded-full px-1.5 py-0.5">✓ verified</span>}
            {messages.length>0&&<><span className="text-[#1e1e2e]">|</span><span className="text-[10px] font-mono text-[#303050]">{messages.length} msg{messages.length!==1?"s":""}</span></>}
          </div>
          <div className="flex items-center gap-1.5">
            <IconBtn onClick={handleNewChat} title="New Chat"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14"/></svg></IconBtn>
            {messages.length>0&&<IconBtn onClick={handleExportPdf} title="Export PDF" disabled={isExporting}>{isExporting?<div className="w-3 h-3 border border-[#00ff88] border-t-transparent rounded-full animate-spin"/>:<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>}</IconBtn>}
            {messages.length>0&&<IconBtn onClick={()=>{setMessages([]);setStats(DEFAULT_STATS);setError(null);setCurrentChatId(generateId());}} title="Clear Chat"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg></IconBtn>}
            <div className="w-px h-4 bg-[#1e1e2e] mx-0.5"/>
            <span className="text-[9px] font-mono text-[#404060] bg-[#111118] border border-[#1e1e2e] rounded px-2 py-1">{settings.model.replace("gpt-","").replace("-turbo","-t")}</span>
            <span className={`text-[9px] font-mono bg-[#111118] border border-[#1e1e2e] rounded px-2 py-1 ${PERSONALITY_COLORS[settings.personality]}`}>{PERSONALITY_LABELS[settings.personality]}</span>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {messages.length===0 ? (
            <div className="flex flex-col items-center justify-center h-full px-6 py-10">

              {/* ── Fixed ARIA icon — properly centered, not clipped ── */}
              <div className="flex flex-col items-center mb-8">
                <div className="w-16 h-16 rounded-2xl bg-[#00ff88]/8 border border-[#00ff88]/15 flex items-center justify-center mb-4 signal-glow">
                  <span className="text-2xl font-bold text-[#00ff88] signal-glow-text leading-none select-none"
                    style={{fontFamily:"Syne,sans-serif", lineHeight:"1", display:"block"}}>A</span>
                </div>

                {/* Personalized welcome */}
                <h1 className="text-2xl font-bold text-[#e8e8f0] mb-2 text-center" style={{fontFamily:"Syne,sans-serif"}}>
                  {welcomeTitle}
                </h1>

                {/* Specialization — no chat count, no "recent chats" hint */}
                <p className="text-sm text-[#505070] text-center max-w-xs leading-relaxed">
                  Specialized in{" "}
                  <span className="text-[#00ff88]">{profile.industry}</span>{" "}
                  research. How can I help you today?
                </p>

                {isNewUser && (
                  <div className="inline-flex items-center gap-1.5 mt-3 text-[10px] font-mono text-[#00ff88] bg-[#00ff88]/8 border border-[#00ff88]/20 rounded-full px-3 py-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#00ff88] animate-pulse"/>
                    Account verified · Ready to research
                  </div>
                )}

                <div className="mt-6">
                  <FeatureBadges/>
                </div>
              </div>
            </div>
          ) : (
            <div className="px-6 py-6 space-y-5 max-w-3xl mx-auto w-full">
              {messages.map((m,i)=>(
                <MessageBubble key={m.id} message={m} sessionId={sessionId}
                  precedingUserMessage={getPrecedingUserMessage(i)}
                  onFeedback={m.role==="assistant"?handleFeedbackChange:undefined}/>
              ))}
              {isLoading&&(
                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-lg bg-[#00ff88]/10 border border-[#00ff88]/20 flex items-center justify-center flex-shrink-0">
                    <span className="text-[10px] font-bold text-[#00ff88] leading-none">AI</span>
                  </div>
                  <div className="bg-[#111118] border border-[#1e1e2e] rounded-2xl rounded-tl-sm px-4 py-3 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#00ff88] typing-dot"/>
                    <span className="w-1.5 h-1.5 rounded-full bg-[#00ff88] typing-dot"/>
                    <span className="w-1.5 h-1.5 rounded-full bg-[#00ff88] typing-dot"/>
                    <span className="text-xs text-[#505070] ml-2 font-mono">
                      {isDeepResearch?"4 specialist agents researching...":"Researching..."}
                    </span>
                  </div>
                </div>
              )}
              <div ref={endRef}/>
            </div>
          )}
        </div>

        {error&&(
          <div className="px-6 pb-2 max-w-3xl mx-auto w-full">
            <div className="bg-[#ff6b6b]/6 border border-[#ff6b6b]/15 rounded-xl px-4 py-2.5 flex items-center justify-between">
              <p className="text-xs text-[#ff9999]"><span className="font-mono text-[#ff6b6b] mr-2">Error</span>{error}</p>
              <button onClick={()=>setError(null)} className="text-[#ff6b6b] text-xs ml-3">x</button>
            </div>
          </div>
        )}

        <InputBar
          value={input}
          onChange={setInput}
          onSend={()=>send(input)}
          onDeepResearch={()=>sendDeepResearch(input)}
          isLoading={isLoading}
          isDeepResearch={isDeepResearch}
          placeholder={`Ask anything about ${profile.industry} markets...`}
          onAttachmentsChange={setAttachments}
          attachments={attachments}
        />
      </main>

      <HelpChatbot/>
    </div>
  );
}
