"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { Suspense, useEffect, useState, useCallback, useMemo } from "react";
import Link from "next/link";
import { getRanking } from "@/lib/api";
import type { Skill, SearchResult } from "@/lib/types";
import { formatNumber } from "@/lib/utils";
import { Star, Flame, TrendingUp, Trophy, Crown, Medal, Zap, BarChart3, ExternalLink } from "lucide-react";

type SortKey = "popular" | "quality" | "newest" | "trending";
const TABS: { key: SortKey; label: string; icon: string }[] = [
  { key: "popular", label: "热门", icon: "🔥" },
  { key: "quality", label: "最高评分", icon: "⭐" },
  { key: "newest", label: "最新", icon: "🆕" },
  { key: "trending", label: "趋势", icon: "📈" },
];

function RankBadge({ rank }: { rank: number }) {
  if (rank === 1) return <div className="w-8 h-8 rounded-[10px] flex items-center justify-center text-sm font-black shrink-0" style={{ background: "linear-gradient(135deg, #fbbf24, #f59e0b)", color: "#78350f", boxShadow: "0 0 15px rgba(251,191,36,0.25)" }}>1</div>;
  if (rank === 2) return <div className="w-8 h-8 rounded-[10px] flex items-center justify-center text-sm font-black shrink-0" style={{ background: "linear-gradient(135deg, #e2e8f0, #94a3b8)", color: "#1e293b", boxShadow: "0 0 12px rgba(226,232,240,0.15)" }}>2</div>;
  if (rank === 3) return <div className="w-8 h-8 rounded-[10px] flex items-center justify-center text-sm font-black shrink-0" style={{ background: "linear-gradient(135deg, #fb923c, #ea580c)", color: "#7c2d12", boxShadow: "0 0 12px rgba(251,146,60,0.15)" }}>3</div>;
  return <div className="w-8 h-8 rounded-[10px] flex items-center justify-center text-sm font-semibold shrink-0" style={{ background: "rgba(255,255,255,0.03)", color: "var(--text-lo)", border: "1px solid rgba(255,255,255,0.05)" }}>{rank}</div>;
}

function Pagination({ page, totalPages, total, loading, onPageChange }: { page: number; totalPages: number; total: number; loading: boolean; onPageChange: (p: number) => void }) {
  if (totalPages <= 1) return null;
  const getPages = () => {
    const p: (number | string)[] = [];
    if (totalPages <= 5) { for (let i = 1; i <= totalPages; i++) p.push(i); }
    else { p.push(1); if (page > 3) p.push("..."); for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) p.push(i); if (page < totalPages - 2) p.push("..."); p.push(totalPages); }
    return p;
  };
  return (
    <div className="mt-6 space-y-2">
      <div className="flex justify-center items-center gap-1">
        {getPages().map((p, idx) => typeof p === "string" ? (
          <span key={`e-${idx}`} className="px-1 text-sm" style={{ color: "var(--text-lo)", letterSpacing: "2px" }}>···</span>
        ) : (
          <button key={p} onClick={() => onPageChange(p)} disabled={loading} className="w-8 h-8 rounded-[10px] flex items-center justify-center text-sm font-semibold cursor-pointer transition-all hover:-translate-y-0.5" style={page === p ? { background: "linear-gradient(135deg, var(--cyan), var(--violet))", color: "#fff", border: "none", boxShadow: "0 0 15px rgba(0,240,255,0.2)" } : { border: "1px solid var(--glass-border)", background: "var(--glass)", color: "var(--text-mid)" }}>{p}</button>
        ))}
      </div>
      <p className="text-center text-xs" style={{ color: "var(--text-lo)" }}>第 {page} / {totalPages} 页，共 {total} 条</p>
    </div>
  );
}

/** Top3 高亮卡片 */
function Top3Card({ skill, rank }: { skill: Skill; rank: number }) {
  const gradients = [
    "linear-gradient(135deg, rgba(251,191,36,0.12), rgba(245,158,11,0.06))",
    "linear-gradient(135deg, rgba(226,232,240,0.10), rgba(148,163,184,0.05))",
    "linear-gradient(135deg, rgba(251,146,60,0.10), rgba(234,88,12,0.05))",
  ];
  const borders = [
    "rgba(251,191,36,0.25)",
    "rgba(226,232,240,0.20)",
    "rgba(251,146,60,0.20)",
  ];
  const icons = ["🥇", "🥈", "🥉"];

  return (
    <Link href={`/skills/${skill.id}`} className="block group">
      <div className="rounded-xl p-3.5 transition-all duration-300 hover:-translate-y-0.5 cursor-pointer" style={{ background: gradients[rank - 1], border: `1px solid ${borders[rank - 1]}` }}>
        <div className="flex items-start gap-2.5">
          <span className="text-lg shrink-0">{icons[rank - 1]}</span>
          <div className="flex-1 min-w-0">
            <div className="font-bold text-sm truncate transition-colors group-hover:text-[var(--cyan)]">{skill.name}</div>
            <div className="text-[11px] line-clamp-1 mt-0.5" style={{ color: "var(--text-lo)" }}>{skill.description}</div>
            <div className="flex gap-3 mt-2 text-[11px]" style={{ color: "var(--text-mid)" }}>
              <span>★ {skill.rating.score.toFixed(1)}</span>
              <span>⭐ {formatNumber(skill.usageCount)}</span>
            </div>
          </div>
          <ExternalLink className="w-3.5 h-3.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity mt-0.5" style={{ color: "var(--text-lo)" }} />
        </div>
      </div>
    </Link>
  );
}

function RankingContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const sortParam = (searchParams.get("sort") as SortKey) || "popular";
  const [activeTab, setActiveTab] = useState<SortKey>(sortParam);
  const [data, setData] = useState<SearchResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);

  const fetchData = useCallback(async (sortBy: SortKey, pageNum: number) => {
    setLoading(true); setError(null);
    try { const result = await getRanking({ sort_by: sortBy, page: pageNum, size: 20 }); setData(result); }
    catch (err) { setError(err instanceof Error ? err.message : "加载失败"); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { setActiveTab(sortParam); setPage(1); fetchData(sortParam, 1); }, [sortParam, fetchData]);
  const handleTabChange = (tab: SortKey) => { if (tab !== activeTab || page !== 1) router.push(`/ranking?sort=${tab}`); };
  const handlePageChange = (p: number) => { setPage(p); fetchData(activeTab, p); window.scrollTo({ top: 0, behavior: "smooth" }); };

  // 统计数据
  const stats = useMemo(() => {
    if (!data?.items.length) return { avgScore: 0, totalUsage: 0, topType: "—", topTypeCount: 0 };
    const items = data.items;
    const avgScore = items.reduce((s, sk) => s + sk.rating.score, 0) / items.length;
    const totalUsage = items.reduce((s, sk) => s + sk.usageCount, 0);
    const typeCount: Record<string, number> = {};
    items.forEach((sk) => { const t = sk.type || "other"; typeCount[t] = (typeCount[t] || 0) + 1; });
    const topEntry = Object.entries(typeCount).sort((a, b) => b[1] - a[1])[0];
    return { avgScore, totalUsage, topType: topEntry?.[0] || "—", topTypeCount: topEntry?.[1] || 0 };
  }, [data]);

  const top3 = data?.items.slice(0, 3) || [];
  const restItems = data?.items.slice(3) || [];

  return (
    <div className="max-w-[1200px] mx-auto px-8 py-8">
      <h1 className="text-3xl font-black tracking-tight mb-5" style={{ background: "linear-gradient(135deg, var(--cyan), var(--violet), var(--magenta))", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>🏆 排行榜</h1>

      {/* Tabs */}
      <div className="flex gap-0 mb-6" style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
        {TABS.map((tab) => (
          <button key={tab.key} onClick={() => handleTabChange(tab.key)} className="relative px-5 py-3 text-sm font-medium cursor-pointer transition-colors" style={{ color: activeTab === tab.key ? "var(--cyan)" : "var(--text-lo)", borderBottom: activeTab === tab.key ? "2px solid var(--cyan)" : "2px solid transparent" }}>
            {tab.icon} {tab.label}
            {activeTab === tab.key && <div className="absolute bottom-[-1px] left-0 right-0 h-[2px]" style={{ background: "var(--cyan)", boxShadow: "0 0 8px rgba(0,240,255,0.4)" }} />}
          </button>
        ))}
      </div>

      {loading && !data && (
        <div className="flex gap-6">
          <div className="flex-1 space-y-3">{Array.from({ length: 8 }).map((_, i) => <div key={i} className="rounded-xl p-4 animate-pulse" style={{ background: "var(--glass)", border: "1px solid var(--glass-border)" }}><div className="h-4 w-3/4 rounded" style={{ background: "var(--glass-border)" }} /></div>)}</div>
          <aside className="w-[280px] shrink-0 space-y-4">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="rounded-xl p-4 animate-pulse h-24" style={{ background: "var(--glass)", border: "1px solid var(--glass-border)" }} />)}</aside>
        </div>
      )}

      {error && !loading && (
        <div className="text-center py-16">
          <p className="mb-4" style={{ color: "var(--magenta)" }}>加载失败</p>
          <button onClick={() => fetchData(activeTab, page)} className="neon-btn px-4 py-2 text-sm">重试</button>
        </div>
      )}

      {!loading && !error && data && data.items.length === 0 && (
        <div className="text-center py-16"><Trophy className="mx-auto mb-4 w-12 h-12" style={{ color: "var(--text-lo)", opacity: 0.3 }} /><p style={{ color: "var(--text-lo)" }}>暂无排行数据</p></div>
      )}

      {!loading && !error && data && data.items.length > 0 && (
        <div className="flex gap-6">
          {/* 左侧：排行列表 */}
          <div className="flex-1 min-w-0">
            {/* Top3 高亮卡片 */}
            {page === 1 && top3.length > 0 && (
              <div className="grid grid-cols-3 gap-3 mb-5">
                {top3.map((skill, i) => <Top3Card key={skill.id} skill={skill} rank={i + 1} />)}
              </div>
            )}

            {/* 4+ 列表 */}
            <div className="space-y-2">
              {restItems.map((skill, index) => {
                const rank = (data.page - 1) * data.pageSize + index + 4;
                return (
                  <Link key={skill.id} href={`/skills/${skill.id}`} className="block">
                    <div className="flex items-center gap-3.5 p-3.5 rounded-xl cursor-pointer transition-all duration-[400ms] hover:translate-x-1 relative overflow-hidden group" style={{ background: "var(--glass)", border: "1px solid var(--glass-border)" }}>
                      <div className="absolute left-0 top-0 bottom-0 w-0 group-hover:w-full transition-all duration-[400ms]" style={{ background: "linear-gradient(90deg, rgba(0,240,255,0.04), transparent)" }} />
                      <div className="relative z-[1]"><RankBadge rank={rank} /></div>
                      <div className="flex-1 min-w-0 relative z-[1]">
                        <div className="font-bold text-sm mb-0.5 transition-colors group-hover:text-[var(--cyan)]">{skill.name}</div>
                        <div className="text-xs line-clamp-1" style={{ color: "var(--text-lo)" }}>{skill.description}</div>
                      </div>
                      <div className="flex gap-4 items-center shrink-0 relative z-[1]">
                        <span className="text-xs" style={{ color: "var(--text-mid)" }}>★ {skill.rating.score.toFixed(1)}</span>
                        <span className="text-xs" style={{ color: "var(--text-mid)" }}>⭐ {formatNumber(skill.usageCount)}</span>
                        <ExternalLink className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: "var(--text-lo)" }} />
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>

            <Pagination page={page} totalPages={data.totalPages} total={data.total} loading={loading} onPageChange={handlePageChange} />
          </div>

          {/* 右侧：统计面板 */}
          <aside className="w-[280px] shrink-0">
            <div className="sticky top-24 space-y-4">
              {/* 数据概览 */}
              <div className="rounded-2xl p-5" style={{ background: "var(--glass)", border: "1px solid var(--glass-border)", backdropFilter: "blur(20px)" }}>
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-6 h-6 rounded-md flex items-center justify-center text-xs" style={{ background: "rgba(0,240,255,0.1)" }}>
                    <BarChart3 className="w-3.5 h-3.5" style={{ color: "var(--cyan)" }} />
                  </div>
                  <span className="text-xs font-semibold" style={{ color: "var(--text-mid)" }}>数据概览</span>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs" style={{ color: "var(--text-lo)" }}>收录总数</span>
                    <span className="text-sm font-bold" style={{ color: "var(--cyan)" }}>{formatNumber(data.total)}</span>
                  </div>
                  <div className="h-[1px]" style={{ background: "var(--glass-border)" }} />
                  <div className="flex items-center justify-between">
                    <span className="text-xs" style={{ color: "var(--text-lo)" }}>平均评分</span>
                    <span className="text-sm font-bold" style={{ color: "var(--amber)" }}>{stats.avgScore.toFixed(1)}</span>
                  </div>
                  <div className="h-[1px]" style={{ background: "var(--glass-border)" }} />
                  <div className="flex items-center justify-between">
                    <span className="text-xs" style={{ color: "var(--text-lo)" }}>总使用量</span>
                    <span className="text-sm font-bold" style={{ color: "var(--emerald)" }}>{formatNumber(stats.totalUsage)}</span>
                  </div>
                  <div className="h-[1px]" style={{ background: "var(--glass-border)" }} />
                  <div className="flex items-center justify-between">
                    <span className="text-xs" style={{ color: "var(--text-lo)" }}>最热类型</span>
                    <span className="text-xs px-2 py-0.5 rounded-md font-medium" style={{ background: "rgba(139,92,246,0.1)", color: "var(--violet)", border: "1px solid rgba(139,92,246,0.15)" }}>
                      {stats.topType} ({stats.topTypeCount})
                    </span>
                  </div>
                </div>
              </div>

              {/* Top3 王者 */}
              {page === 1 && top3.length >= 3 && (
                <div className="rounded-2xl p-5" style={{ background: "var(--glass)", border: "1px solid var(--glass-border)", backdropFilter: "blur(20px)" }}>
                  <div className="flex items-center gap-2 mb-4">
                    <Crown className="w-4 h-4" style={{ color: "#fbbf24" }} />
                    <span className="text-xs font-semibold" style={{ color: "var(--text-mid)" }}>王者之巅</span>
                  </div>
                  <div className="space-y-2.5">
                    {top3.map((skill, i) => (
                      <Link key={skill.id} href={`/skills/${skill.id}`} className="flex items-center gap-2.5 group cursor-pointer">
                        <span className="text-sm">{["🥇", "🥈", "🥉"][i]}</span>
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-semibold truncate transition-colors group-hover:text-[var(--cyan)]">{skill.name}</div>
                        </div>
                        <span className="text-[11px] shrink-0" style={{ color: "var(--text-lo)" }}>★ {skill.rating.score.toFixed(1)}</span>
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {/* 快捷入口 */}
              <div className="rounded-2xl p-5" style={{ background: "var(--glass)", border: "1px solid var(--glass-border)", backdropFilter: "blur(20px)" }}>
                <div className="flex items-center gap-2 mb-3">
                  <Zap className="w-4 h-4" style={{ color: "var(--cyan)" }} />
                  <span className="text-xs font-semibold" style={{ color: "var(--text-mid)" }}>快捷入口</span>
                </div>
                <div className="space-y-1.5">
                  {[
                    { label: "热门技能", sort: "popular", icon: "🔥" },
                    { label: "最高评分", sort: "quality", icon: "⭐" },
                    { label: "最新上线", sort: "newest", icon: "🆕" },
                    { label: "趋势飙升", sort: "trending", icon: "📈" },
                  ].map((item) => (
                    <button
                      key={item.sort}
                      onClick={() => router.push(`/ranking?sort=${item.sort}`)}
                      className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left cursor-pointer transition-all text-xs group"
                      style={{
                        background: activeTab === item.sort ? "rgba(0,240,255,0.08)" : "transparent",
                        border: activeTab === item.sort ? "1px solid rgba(0,240,255,0.12)" : "1px solid transparent",
                        color: activeTab === item.sort ? "var(--cyan)" : "var(--text-mid)",
                      }}
                    >
                      <span>{item.icon}</span>
                      <span className="font-medium">{item.label}</span>
                      {activeTab === item.sort && <span className="ml-auto text-[10px]">●</span>}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}

export default function RankingPage() {
  return (
    <Suspense fallback={<div className="max-w-[1200px] mx-auto px-8 py-8"><div className="h-8 w-40 animate-pulse rounded" style={{ background: "var(--glass-border)" }} /></div>}>
      <RankingContent />
    </Suspense>
  );
}
