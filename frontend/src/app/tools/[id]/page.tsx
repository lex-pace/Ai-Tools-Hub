"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Star, Eye, Heart, Copy, Share2, ChevronRight, Home, AlertCircle, Package, BookOpen, Code, Loader2, ExternalLink, Calendar, User, RefreshCw, ChevronDown, ChevronUp, Sparkles } from "lucide-react";
import { getToolDetail, favoriteApi, recommendApi } from "@/lib/api";
import { PLATFORM_MAP, TOOL_TYPE_MAP, TOOL_TYPE_COLORS, type Tool } from "@/lib/types";
import { formatNumber } from "@/lib/utils";
import { useAuthStore } from "@/store/authStore";
import MarkdownRenderer from "@/components/common/MarkdownRenderer";
import ToolCard from "@/components/home/ToolCard";
import ReviewList from "@/components/tool/ReviewList";
import ReviewForm from "@/components/tool/ReviewForm";

function renderStars(score: number) {
  const stars = [];
  const full = Math.floor(score);
  const half = score - full >= 0.5;
  for (let i = 0; i < 5; i++) {
    if (i < full) stars.push(<Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />);
    else if (i === full && half) stars.push(<Star key={i} className="w-4 h-4 fill-amber-400/50 text-amber-400" />);
    else stars.push(<Star key={i} className="w-4 h-4" style={{ color: "var(--text-lo)", opacity: 0.3 }} />);
  }
  return stars;
}

function Breadcrumb({ categoryName, categorySlug, toolName }: { categoryName: string; categorySlug: string; toolName: string }) {
  return (
    <nav className="mb-6 flex items-center gap-1.5 text-xs" style={{ color: "var(--text-lo)" }}>
      <Link href="/" className="flex items-center gap-1 transition-colors hover:text-[var(--cyan)]"><Home className="w-3.5 h-3.5" /> 首页</Link>
      <ChevronRight className="w-3 h-3 opacity-30" />
      <Link href={`/categories?cat=${categorySlug}`} className="transition-colors hover:text-[var(--cyan)]">{categoryName}</Link>
      <ChevronRight className="w-3 h-3 opacity-30" />
      <span className="truncate max-w-[200px]" style={{ color: "var(--text-hi)" }}>{toolName}</span>
    </nav>
  );
}

function SkeletonDetail() {
  return (
    <div className="max-w-[1200px] mx-auto py-8 px-4 sm:px-8 overflow-x-hidden">
      <div className="mb-6 flex items-center gap-2">
        {[1,2,3,4,5].map(i => <div key={i} className="h-4 rounded animate-pulse" style={{ background: "var(--glass-border)", width: `${40 + i * 20}px` }} />)}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-8">
        <div className="space-y-6">
          <div className="h-8 w-3/4 rounded animate-pulse" style={{ background: "var(--glass-border)" }} />
          <div className="h-5 w-full rounded animate-pulse" style={{ background: "var(--glass-border)" }} />
          {[1,2,3].map(i => <div key={i} className="h-48 rounded-2xl animate-pulse" style={{ background: "var(--glass)", border: "1px solid var(--glass-border)" }} />)}
        </div>
        <div className="space-y-4">
          <div className="h-28 rounded-2xl animate-pulse" style={{ background: "var(--glass)", border: "1px solid var(--glass-border)" }} />
          <div className="h-56 rounded-2xl animate-pulse" style={{ background: "var(--glass)", border: "1px solid var(--glass-border)" }} />
        </div>
      </div>
    </div>
  );
}

export default function ToolDetailPage() {
  const params = useParams();
  const router = useRouter();
  const toolId = params.id as string;
  const { isAuthenticated } = useAuthStore();
  const [tool, setTool] = useState<Tool | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [favorited, setFavorited] = useState(false);
  const [favoriteLoading, setFavoriteLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [detailExpanded, setDetailExpanded] = useState(false);
  const [relatedTools, setRelatedTools] = useState<Tool[]>([]);
  const [relatedLoading, setRelatedLoading] = useState(false);
  const [reviewRefreshKey, setReviewRefreshKey] = useState(0);

  useEffect(() => {
    async function fetchTool() {
      if (!toolId) return;
      setLoading(true); setError(null);
      try { const data = await getToolDetail(toolId); setTool(data); }
      catch (err) { setError(err instanceof Error ? err.message : "加载失败"); }
      finally { setLoading(false); }
    }
    fetchTool();
  }, [toolId]);

  useEffect(() => {
    if (!toolId || !isAuthenticated) return;
    favoriteApi.check(toolId).then((res) => setFavorited(!!res.data?.data)).catch(() => {});
  }, [toolId, isAuthenticated]);

  useEffect(() => {
    if (!toolId) return;
    setRelatedLoading(true);
    recommendApi.related(toolId, 6).then((s) => setRelatedTools(s.filter((s) => s.id !== toolId))).catch(() => setRelatedTools([])).finally(() => setRelatedLoading(false));
  }, [toolId]);

  const handleToggleFavorite = async () => {
    if (!tool) return;
    if (!isAuthenticated) { router.push("/login"); return; }
    setFavoriteLoading(true);
    try {
      if (favorited) await favoriteApi.remove(tool.id); else await favoriteApi.add(tool.id);
      setFavorited(!favorited);
    } catch {}
    finally { setFavoriteLoading(false); }
  };

  const handleCopy = useCallback(async (text: string) => {
    try { await navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); }
    catch { const ta = document.createElement("textarea"); ta.value = text; document.body.appendChild(ta); ta.select(); document.execCommand("copy"); document.body.removeChild(ta); setCopied(true); setTimeout(() => setCopied(false), 2000); }
  }, []);

  const handleReviewSubmitted = useCallback(() => setReviewRefreshKey((p) => p + 1), []);

  if (loading) return <SkeletonDetail />;
  if (error || !tool) return (
    <div className="max-w-[1200px] mx-auto py-20 px-4 sm:px-8 text-center overflow-x-hidden">
      <AlertCircle className="mx-auto mb-4 w-12 h-12" style={{ color: "var(--text-lo)" }} />
      <p className="mb-4" style={{ color: "var(--magenta)" }}>{error || "工具不存在"}</p>
      <div className="flex justify-center gap-3">
        <button onClick={() => router.back()} className="px-4 py-2 rounded-lg text-sm" style={{ border: "1px solid var(--glass-border)", color: "var(--text-mid)" }}>返回上一页</button>
        <Link href="/"><button className="neon-btn px-4 py-2 text-sm">返回首页</button></Link>
      </div>
    </div>
  );

  const platformInfo = PLATFORM_MAP[tool.platform] || PLATFORM_MAP.general;
  const typeLabel = TOOL_TYPE_MAP[tool.type] || tool.type;
  const DETAIL_TRUNCATE_LENGTH = 300;
  const shouldTruncate = tool.detail && tool.detail.length > DETAIL_TRUNCATE_LENGTH;
  const displayedDetail = tool.detail && shouldTruncate && !detailExpanded ? tool.detail.slice(0, DETAIL_TRUNCATE_LENGTH) + "..." : tool.detail;

  return (
    <div className="max-w-[1200px] mx-auto px-4 sm:px-8 py-8 overflow-x-hidden">
      <Breadcrumb categoryName={tool.category.name} categorySlug={tool.category.id} toolName={tool.name} />

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-8">
        {/* Main content */}
        <div className="space-y-6 min-w-0">
          {/* Badges */}
          <div className="flex flex-wrap gap-2">
            <span className="px-3 py-1 rounded-lg text-xs font-semibold" style={{ background: "rgba(0,240,255,0.08)", color: "var(--cyan)", border: "1px solid rgba(0,240,255,0.12)" }}>{typeLabel}</span>
            <span className="px-3 py-1 rounded-lg text-xs font-semibold" style={{ background: "rgba(139,92,246,0.08)", color: "var(--violet)", border: "1px solid rgba(139,92,246,0.12)" }}>{platformInfo.name}</span>
            <span className="px-3 py-1 rounded-lg text-xs font-semibold" style={{ background: "rgba(16,185,129,0.08)", color: "var(--emerald)", border: "1px solid rgba(16,185,129,0.12)" }}>{tool.category.name}</span>
            {tool.isFeatured && <span className="px-3 py-1 rounded-lg text-xs font-semibold" style={{ background: "rgba(245,158,11,0.08)", color: "var(--amber)", border: "1px solid rgba(245,158,11,0.12)" }}>推荐</span>}
          </div>

          {/* Title */}
          <h1 className="text-3xl font-black tracking-tight" style={{ background: "linear-gradient(135deg, var(--text-hi), var(--cyan))", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>{tool.name}</h1>
          <p className="text-base" style={{ color: "var(--text-mid)", lineHeight: "1.7" }}>{tool.description}</p>

          {/* Stats grid */}
          <div className="grid grid-cols-4 gap-3 p-5 rounded-2xl" style={{ background: "var(--glass)", border: "1px solid var(--glass-border)", backdropFilter: "blur(20px)" }}>
            {[
              { val: formatNumber(tool.usageCount), label: "Stars" },
              { val: tool.rating.score.toFixed(1), label: "评分" },
              { val: formatNumber(tool.favoriteCount || 0), label: "收藏" },
              { val: formatNumber(tool.rating.count), label: "评价" },
            ].map((s) => (
              <div key={s.label} className="text-center">
                <div className="text-xl font-black neon-text">{s.val}</div>
                <div className="text-[11px] mt-0.5" style={{ color: "var(--text-lo)" }}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* Install guide */}
          {tool.installGuide && (
            <div>
              <h3 className="text-sm font-bold mb-3 flex items-center gap-2"><span style={{ color: "var(--cyan)" }}>⌨</span> 安装</h3>
              <div className="rounded-xl p-5 relative overflow-hidden" style={{ background: "var(--code-bg)", border: "1px solid rgba(0,240,255,0.08)" }}>
                <div className="absolute top-0 left-0 right-0 h-[1px]" style={{ background: "linear-gradient(90deg, var(--cyan), var(--violet))", opacity: 0.3 }} />
                <div className="flex gap-1.5 mb-3"><span className="w-2.5 h-2.5 rounded-full bg-red-400" /><span className="w-2.5 h-2.5 rounded-full bg-amber-400" /><span className="w-2.5 h-2.5 rounded-full bg-emerald-400" /></div>
                <MarkdownRenderer content={tool.installGuide} />
              </div>
            </div>
          )}

          {/* Content */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold flex items-center gap-2"><Code className="w-4 h-4" style={{ color: "var(--cyan)" }} /> 工具内容</h3>
              <button onClick={() => handleCopy(tool.content)} className="px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all" style={{ border: "1px solid var(--glass-border)", background: "var(--glass)", color: "var(--text-mid)" }}>
                <Copy className="w-3 h-3 inline mr-1" />{copied ? "已复制" : "复制"}
              </button>
            </div>
            <div className="rounded-xl p-5 relative overflow-hidden" style={{ background: "var(--code-bg)", border: "1px solid rgba(0,240,255,0.08)" }}>
              <div className="absolute top-0 left-0 right-0 h-[1px]" style={{ background: "linear-gradient(90deg, var(--cyan), var(--violet))", opacity: 0.3 }} />
              <MarkdownRenderer content={tool.content} />
            </div>
          </div>

          {/* Usage example */}
          {tool.usageExample && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold flex items-center gap-2"><BookOpen className="w-4 h-4" style={{ color: "var(--amber)" }} /> 使用示例</h3>
                <button onClick={() => handleCopy(tool.usageExample!)} className="px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all" style={{ border: "1px solid var(--glass-border)", background: "var(--glass)", color: "var(--text-mid)" }}>
                  <Copy className="w-3 h-3 inline mr-1" />复制
                </button>
              </div>
              <div className="rounded-xl p-5 relative overflow-hidden" style={{ background: "var(--code-bg)", border: "1px solid rgba(0,240,255,0.08)" }}>
                <div className="absolute top-0 left-0 right-0 h-[1px]" style={{ background: "linear-gradient(90deg, var(--cyan), var(--violet))", opacity: 0.3 }} />
                <MarkdownRenderer content={tool.usageExample} />
              </div>
            </div>
          )}

          {/* Detail */}
          {tool.detail && (
            <div className="rounded-2xl p-5" style={{ background: "var(--glass)", border: "1px solid var(--glass-border)", backdropFilter: "blur(20px)" }}>
              <h3 className="text-sm font-bold mb-3 flex items-center gap-2"><BookOpen className="w-4 h-4" style={{ color: "var(--cyan)" }} /> 详细描述</h3>
              <div style={{ maxHeight: detailExpanded ? "none" : "200px", overflow: "hidden", position: "relative" }}>
                <MarkdownRenderer content={displayedDetail || ""} />
                {shouldTruncate && !detailExpanded && (
                  <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: "60px", background: "linear-gradient(transparent, var(--glass))" }} />
                )}
              </div>
              {shouldTruncate && (
                <button onClick={() => setDetailExpanded(!detailExpanded)} className="mt-3 text-xs font-medium transition-colors" style={{ color: "var(--cyan)" }}>
                  {detailExpanded ? <>收起 <ChevronUp className="w-3 h-3 inline" /></> : <>展开全部 <ChevronDown className="w-3 h-3 inline" /></>}
                </button>
              )}
            </div>
          )}

          {/* Tags */}
          {tool.tags.length > 0 && (
            <div>
              <h3 className="text-sm font-bold mb-2">标签</h3>
              <div className="flex flex-wrap gap-2">
                {tool.tags.map((tag) => <span key={tag} className="px-2.5 py-1 rounded-lg text-xs" style={{ background: "rgba(255,255,255,0.02)", color: "var(--text-lo)", border: "1px solid rgba(255,255,255,0.04)" }}>{tag}</span>)}
              </div>
            </div>
          )}

          {/* Reviews */}
          <div className="rounded-2xl p-5" style={{ background: "var(--glass)", border: "1px solid var(--glass-border)", backdropFilter: "blur(20px)" }}>
            <h3 className="text-sm font-bold mb-4 flex items-center gap-2"><Star className="w-4 h-4" style={{ color: "var(--amber)" }} /> 用户评价</h3>
            <ReviewList key={reviewRefreshKey} toolId={toolId} />
            <div className="mt-6 pt-5" style={{ borderTop: "1px solid var(--glass-border)" }}>
              <h4 className="font-medium mb-4 text-sm">发表评价</h4>
              <ReviewForm toolId={toolId} onSubmitted={handleReviewSubmitted} />
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-4 lg:sticky lg:top-20 lg:self-start min-w-0 overflow-hidden">
          {/* Actions */}
          <div className="rounded-2xl p-5" style={{ background: "var(--glass)", border: "1px solid var(--glass-border)", backdropFilter: "blur(20px)" }}>
            <div className="flex flex-col gap-3">
              <button onClick={handleToggleFavorite} disabled={favoriteLoading} className="neon-btn w-full py-2.5 text-sm flex items-center justify-center gap-2">
                {favoriteLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Heart className={`w-4 h-4 ${favorited ? "fill-white" : ""}`} />}
                {favorited ? "已收藏" : "♥ 添加收藏"}
              </button>
              <button className="w-full py-2.5 rounded-xl text-sm font-semibold cursor-pointer transition-all hover:-translate-y-0.5" style={{ border: "1px solid rgba(0,240,255,0.12)", background: "rgba(0,240,255,0.04)", color: "var(--cyan)" }}>↗ 访问 GitHub</button>
              <button className="w-full py-2.5 rounded-xl text-sm cursor-pointer transition-all" style={{ border: "1px solid var(--glass-border)", background: "transparent", color: "var(--text-mid)" }}>↗ 分享</button>
            </div>
          </div>

          {/* Related */}
          <div className="rounded-2xl p-5" style={{ background: "var(--glass)", border: "1px solid var(--glass-border)", backdropFilter: "blur(20px)" }}>
            <h3 className="text-sm font-bold mb-4 flex items-center gap-2"><Sparkles className="w-4 h-4" style={{ color: "var(--cyan)" }} /> 相关工具</h3>
            {relatedLoading ? (
              <div className="space-y-3">{[1,2,3].map((i) => <div key={i} className="h-16 rounded-lg animate-pulse" style={{ background: "var(--glass-border)" }} />)}</div>
            ) : (
              <div className="space-y-0">
                {relatedTools.slice(0, 4).map((s) => (
                  <Link key={s.id} href={`/tools/${s.id}`} className="flex gap-3 py-3 cursor-pointer transition-all hover:pl-1" style={{ borderBottom: "1px solid var(--glass-border)" }}>
                    <div className="w-9 h-9 rounded-lg flex items-center justify-center text-sm shrink-0" style={{ background: "rgba(0,240,255,0.06)", border: "1px solid rgba(0,240,255,0.08)" }}>🔗</div>
                    <div className="min-w-0">
                      <div className="text-sm font-semibold truncate transition-colors hover:text-[var(--cyan)]">{s.name}</div>
                      <div className="text-xs line-clamp-1 mt-0.5" style={{ color: "var(--text-lo)" }}>{s.description}</div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Tool info */}
          <div className="rounded-2xl p-5" style={{ background: "var(--glass)", border: "1px solid var(--glass-border)", backdropFilter: "blur(20px)" }}>
            <h3 className="text-sm font-bold mb-4">工具信息</h3>
            <div className="space-y-2.5 text-sm">
              {[
                { label: "类型", value: typeLabel },
                { label: "平台", value: platformInfo.name },
                { label: "作者", value: tool.author },
                ...(tool.version ? [{ label: "版本", value: `v${tool.version}` }] : []),
              ].map((item) => (
                <div key={item.label} className="flex justify-between"><span style={{ color: "var(--text-lo)" }}>{item.label}</span><span className="font-medium">{item.value}</span></div>
              ))}
              <div className="flex justify-between items-center"><span className="flex items-center gap-1" style={{ color: "var(--text-lo)" }}><Calendar className="w-3.5 h-3.5" /> 创建时间</span><span>{new Date(tool.createdAt).toLocaleDateString("zh-CN")}</span></div>
              <div className="flex justify-between items-center"><span className="flex items-center gap-1" style={{ color: "var(--text-lo)" }}><RefreshCw className="w-3.5 h-3.5" /> 最后同步</span><span>{new Date(tool.updatedAt).toLocaleDateString("zh-CN")}</span></div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom related grid */}
      {relatedTools.length > 0 && (
        <section className="mt-12">
          <h2 className="text-lg font-bold mb-6 flex items-center gap-2"><Sparkles className="w-5 h-5" style={{ color: "var(--cyan)" }} /> 相关推荐</h2>
          {relatedLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">{[1,2,3,4].map((i) => <div key={i} className="h-48 rounded-2xl animate-pulse" style={{ background: "var(--glass)", border: "1px solid var(--glass-border)" }} />)}</div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">{relatedTools.map((s) => <ToolCard key={s.id} tool={s} />)}</div>
          )}
        </section>
      )}
    </div>
  );
}
