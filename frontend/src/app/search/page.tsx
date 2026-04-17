"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { Suspense, useEffect, useCallback, useRef, useState } from "react";
import SearchBar from "@/components/search/SearchBar";
import SkillCard from "@/components/home/SkillCard";
import { searchSkills } from "@/lib/api";
import { PLATFORM_MAP, SKILL_TYPE_MAP, SKILL_TYPE_COLORS, type Skill } from "@/lib/types";
import { formatNumber } from "@/lib/utils";
import { useSearchStore } from "@/store/searchStore";
import { Star, Heart, Eye, ChevronLeft, ChevronRight } from "lucide-react";

const FILTER_CHIPS = [
  { key: "all", label: "全部", icon: "🎯" },
  { key: "mcp_server", label: "MCP Server", icon: "🤖" },
  { key: "ai_agent", label: "AI Agent", icon: "🧠" },
  { key: "rag", label: "RAG", icon: "📊" },
  { key: "code_gen", label: "Code Gen", icon: "💻" },
];

function RelevanceBar({ score }: { score: number }) {
  const level = score >= 0.8 ? "high" : score >= 0.5 ? "mid" : "low";
  const colors = { high: "linear-gradient(180deg, var(--cyan), var(--violet))", mid: "linear-gradient(180deg, var(--amber), var(--violet))", low: "var(--text-lo)" };
  return <div className="absolute left-0 top-0 bottom-0 w-[3px] rounded-r" style={{ background: colors[level] }} />;
}

function ResultCard({ skill, query }: { skill: Skill; query?: string }) {
  const [mx, setMx] = useState("50%");
  const [my, setMy] = useState("50%");
  const typeLabel = SKILL_TYPE_MAP[skill.type] || skill.type;
  const platformInfo = PLATFORM_MAP[skill.platform] || PLATFORM_MAP.general;
  const relevance = 0.5 + Math.random() * 0.5; // Simulated relevance

  const highlightText = (text: string) => {
    if (!query) return text;
    const parts = text.split(new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'));
    return parts.map((part, i) => part.toLowerCase() === query.toLowerCase() ? <em key={i} style={{ color: "var(--cyan)", fontStyle: "normal", fontWeight: 500 }}>{part}</em> : part);
  };

  return (
    <div className="group relative rounded-2xl overflow-hidden cursor-pointer transition-all duration-[500ms] hover:-translate-y-1" style={{ background: "var(--glass)", border: "1px solid var(--glass-border)", backdropFilter: "blur(20px)", marginBottom: "0.85rem" }} onMouseMove={(e) => { const r = e.currentTarget.getBoundingClientRect(); setMx(`${e.clientX - r.left}px`); setMy(`${e.clientY - r.top}px`); }}>
      <RelevanceBar score={relevance} />
      {/* Holographic border */}
      <div className="absolute inset-[-1px] rounded-[17px] z-[-1] opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" style={{ background: "conic-gradient(from 0deg, transparent 0%, var(--holo-1) 10%, transparent 20%, var(--holo-2) 40%, transparent 50%, var(--holo-3) 70%, transparent 80%)" }} />
      {/* Mouse light */}
      <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" style={{ background: `radial-gradient(400px circle at ${mx} ${my}, rgba(0,240,255,0.04), transparent 40%)` }} />

      <div className="relative z-[1] p-5 pl-6">
        <div className="flex justify-between items-start mb-2.5">
          <div className="flex items-center gap-3">
            <div className="flex gap-1.5">
              <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold" style={{ background: "rgba(0,240,255,0.08)", color: "var(--cyan)", border: "1px solid rgba(0,240,255,0.12)" }}>{typeLabel}</span>
              <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold" style={{ background: "rgba(139,92,246,0.08)", color: "var(--violet)", border: "1px solid rgba(139,92,246,0.12)" }}>{platformInfo.name}</span>
            </div>
            <div className="flex items-center gap-1.5 text-[11px]" style={{ color: "var(--text-lo)" }}>
              <span className="w-[5px] h-[5px] rounded-full" style={{ background: "var(--emerald)" }} />
              GitHub · 已验证
            </div>
          </div>
          <div className="flex gap-1">
            <button className="w-7 h-7 rounded-lg flex items-center justify-center text-xs cursor-pointer transition-all" style={{ border: "1px solid rgba(255,255,255,0.05)", background: "rgba(255,255,255,0.02)", color: "var(--text-lo)" }}>♡</button>
            <button className="w-7 h-7 rounded-lg flex items-center justify-center text-xs cursor-pointer transition-all" style={{ border: "1px solid rgba(255,255,255,0.05)", background: "rgba(255,255,255,0.02)", color: "var(--text-lo)" }}>⋯</button>
          </div>
        </div>
        <h3 className="text-base font-extrabold tracking-tight mb-1 transition-colors group-hover:text-[var(--cyan)]">{skill.name}</h3>
        <p className="text-sm mb-3 line-clamp-2" style={{ color: "var(--text-mid)", lineHeight: "1.6" }}>{highlightText(skill.description)}</p>
        {skill.tags.length > 0 && (
          <div className="flex gap-1.5 flex-wrap mb-3">
            {skill.tags.slice(0, 5).map((tag) => (
              <span key={tag} className="px-2 py-0.5 rounded text-[11px]" style={{ background: "rgba(255,255,255,0.02)", color: "var(--text-lo)", border: "1px solid rgba(255,255,255,0.04)" }}>{tag}</span>
            ))}
          </div>
        )}
        <div className="flex justify-between items-center">
          <div className="flex gap-3 items-center text-xs" style={{ color: "var(--text-lo)" }}>
            <span className="flex items-center gap-1">👤 {skill.author || "unknown"}</span>
            <span>·</span>
            <span>⭐ {formatNumber(skill.usageCount)}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="flex gap-0.5">{[1,2,3,4,5].map(i => <Star key={i} className="w-3 h-3" style={{ color: i <= Math.round(skill.rating.score) ? "var(--amber)" : "var(--text-lo)", opacity: i <= Math.round(skill.rating.score) ? 1 : 0.3, fill: i <= Math.round(skill.rating.score) ? "var(--amber)" : "none" }} />)}</div>
            <span className="text-sm font-bold" style={{ color: "var(--cyan)" }}>{skill.rating.score.toFixed(1)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function SearchContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const queryParam = searchParams.get("q") || "";
  const sortByParam = searchParams.get("sortBy") || undefined;
  const initializedRef = useRef(false);
  const [activeFilter, setActiveFilter] = useState("all");
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");

  const { query, results, total, page, totalPages, loading, error, filters, setQuery, setFilters, setPage, setResults, setLoading, setError } = useSearchStore();

  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;
    if (queryParam) setQuery(queryParam);
    const initFilters: Record<string, any> = {};
    if (sortByParam) initFilters.sortBy = sortByParam;
    if (Object.keys(initFilters).length > 0) setFilters(initFilters);
  }, [queryParam, sortByParam, setQuery, setFilters]);

  const doSearch = useCallback(async () => {
    if (!query.trim()) return;
    setLoading(true); setError(null);
    try { const result = await searchSkills({ query, ...filters, page }); setResults(result); }
    catch (err) { setError(err instanceof Error ? err.message : "搜索失败"); }
  }, [query, filters, page, setResults, setLoading, setError]);

  useEffect(() => { if (initializedRef.current && query.trim()) doSearch(); }, [query, filters, page, doSearch]);

  const handleSearch = (q: string) => { setQuery(q); setPage(1); };
  const handleFilterChange = (f: Partial<typeof filters>) => setFilters(f);
  const handlePageChange = (p: number) => { setPage(p); window.scrollTo({ top: 0, behavior: "smooth" }); };

  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    if (totalPages <= 5) { for (let i = 1; i <= totalPages; i++) pages.push(i); }
    else { pages.push(1); if (page > 3) pages.push("..."); for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) pages.push(i); if (page < totalPages - 2) pages.push("..."); pages.push(totalPages); }
    return pages;
  };

  return (
    <div className="max-w-[1200px] mx-auto px-8 py-8">
      {/* Search bar */}
      <div className="mb-6">
        <SearchBar defaultValue={queryParam} onSearch={handleSearch} placeholder="输入关键词搜索 AI 工具..." />
      </div>

      {/* AI Insight Filter Bar */}
      <div className="flex gap-3 mb-5 flex-wrap items-center">
        {FILTER_CHIPS.map((chip) => (
          <button key={chip.key} onClick={() => setActiveFilter(chip.key)}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs cursor-pointer transition-all duration-[400ms] relative overflow-hidden"
            style={{ border: `1px solid ${activeFilter === chip.key ? "var(--cyan)" : "var(--glass-border)"}`, background: "var(--glass)", backdropFilter: "blur(10px)", boxShadow: activeFilter === chip.key ? "0 0 12px rgba(0,240,255,0.15)" : "none", transform: activeFilter === chip.key ? "translateY(-2px)" : "none" }}>
            <span className="relative z-[1]">{chip.icon}</span>
            <span className="relative z-[1] font-medium" style={{ color: activeFilter === chip.key ? "var(--cyan)" : "var(--text-mid)" }}>{chip.label}</span>
          </button>
        ))}
        <button className="ml-auto inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs cursor-pointer transition-all" style={{ border: "1px solid var(--glass-border)", background: "var(--glass)", color: "var(--text-mid)" }}>
          <span>⚙️</span><span className="font-medium">更多筛选</span>
        </button>
      </div>

      {/* AI Context Summary */}
      {query && results.length > 0 && (
        <div className="flex items-start gap-4 p-5 rounded-2xl mb-5 relative overflow-hidden" style={{ background: "var(--glass)", border: "1px solid var(--glass-border)", backdropFilter: "blur(20px)" }}>
          <div className="absolute top-0 left-0 right-0 h-[2px]" style={{ background: "linear-gradient(90deg, var(--cyan), var(--violet), var(--magenta))", opacity: 0.5 }} />
          <div className="w-9 h-9 rounded-[10px] flex items-center justify-center text-base shrink-0 relative z-[1]" style={{ background: "linear-gradient(135deg, var(--cyan), var(--violet))", animation: "ctx-pulse 3s ease-in-out infinite" }}>🧠</div>
          <div className="flex-1 relative z-[1]">
            <div className="text-[11px] uppercase tracking-widest font-semibold mb-1" style={{ color: "var(--cyan)" }}>AI 智能分析</div>
            <div className="text-sm" style={{ color: "var(--text-mid)", lineHeight: "1.6" }}>
              找到 <strong style={{ color: "var(--text-hi)" }}>{total}</strong> 个与 "<em style={{ color: "var(--cyan)", fontStyle: "normal", fontWeight: 500 }}>{query}</em>" 相关的结果。
            </div>
          </div>
        </div>
      )}

      {/* Toolbar */}
      <div className="flex justify-between items-center mb-5">
        <div className="flex items-baseline gap-3">
          <h2 className="text-base font-semibold">搜索结果 · <em style={{ color: "var(--cyan)", fontStyle: "normal" }}>{total}</em> 条</h2>
          <span className="text-xs" style={{ color: "var(--text-lo)" }}>按相关性排序</span>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-xs" style={{ color: "var(--text-lo)" }}>
            <span>排序</span>
            <select className="rounded-lg px-2.5 py-1 text-xs outline-none cursor-pointer" style={{ background: "var(--glass)", border: "1px solid var(--glass-border)", color: "var(--text-mid)" }}>
              <option>相关性</option><option>最新</option><option>评分</option><option>热度</option>
            </select>
          </div>
          <div className="flex gap-1">
            {(["list", "grid"] as const).map((mode) => (
              <button key={mode} onClick={() => setViewMode(mode)} className="w-8 h-8 rounded-lg flex items-center justify-center text-sm cursor-pointer transition-all" style={{ border: `1px solid ${viewMode === mode ? "rgba(0,240,255,0.2)" : "var(--glass-border)"}`, background: viewMode === mode ? "rgba(0,240,255,0.08)" : "var(--glass)", color: viewMode === mode ? "var(--cyan)" : "var(--text-lo)" }}>
                {mode === "list" ? "☰" : "⊞"}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Results */}
      {loading ? (
        <div className="space-y-4">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="rounded-2xl p-5 animate-pulse" style={{ background: "var(--glass)", border: "1px solid var(--glass-border)" }}><div className="h-5 w-3/4 rounded mb-3" style={{ background: "var(--glass-border)" }} /><div className="h-4 w-full rounded mb-2" style={{ background: "var(--glass-border)" }} /><div className="h-4 w-2/3 rounded" style={{ background: "var(--glass-border)" }} /></div>)}</div>
      ) : error ? (
        <div className="text-center py-16"><p style={{ color: "var(--text-mid)" }}>{error}</p></div>
      ) : results.length === 0 ? (
        <div className="text-center py-16 rounded-2xl" style={{ border: "1px dashed var(--glass-border)" }}><p style={{ color: "var(--text-lo)" }}>没有找到相关结果</p></div>
      ) : viewMode === "grid" ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">{results.map((skill: Skill) => <SkillCard key={skill.id} skill={skill} />)}</div>
      ) : (
        <div>{results.map((skill: Skill) => <ResultCard key={skill.id} skill={skill} query={query} />)}</div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-1 mt-8">
          <button onClick={() => handlePageChange(page - 1)} disabled={page <= 1 || loading} className="w-9 h-9 rounded-[10px] flex items-center justify-center text-sm font-semibold cursor-pointer transition-all hover:-translate-y-0.5 disabled:opacity-30" style={{ border: "1px solid var(--glass-border)", background: "var(--glass)", color: "var(--text-mid)" }}>←</button>
          {getPageNumbers().map((p, idx) => typeof p === "string" ? (
            <span key={`e-${idx}`} className="px-1 text-sm" style={{ color: "var(--text-lo)", letterSpacing: "2px" }}>···</span>
          ) : (
            <button key={p} onClick={() => handlePageChange(p)} disabled={loading} className="w-9 h-9 rounded-[10px] flex items-center justify-center text-sm font-semibold cursor-pointer transition-all hover:-translate-y-0.5" style={page === p ? { background: "linear-gradient(135deg, var(--cyan), var(--violet))", color: "#fff", border: "none", boxShadow: "0 0 15px rgba(0,240,255,0.2)" } : { border: "1px solid var(--glass-border)", background: "var(--glass)", color: "var(--text-mid)" }}>{p}</button>
          ))}
          <button onClick={() => handlePageChange(page + 1)} disabled={page >= totalPages || loading} className="w-9 h-9 rounded-[10px] flex items-center justify-center text-sm font-semibold cursor-pointer transition-all hover:-translate-y-0.5 disabled:opacity-30" style={{ border: "1px solid var(--glass-border)", background: "var(--glass)", color: "var(--text-mid)" }}>→</button>
        </div>
      )}
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={<div className="max-w-[1200px] mx-auto px-8 py-8 text-center" style={{ color: "var(--text-lo)" }}>加载中...</div>}>
      <SearchContent />
    </Suspense>
  );
}
