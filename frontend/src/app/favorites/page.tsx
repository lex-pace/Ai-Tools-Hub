"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Heart, Trash2, ArrowLeft, AlertCircle, Loader2, LogIn } from "lucide-react";
import ToolCard from "@/components/home/ToolCard";
import { useAuthStore } from "@/store/authStore";
import { favoriteApi, getFavorites as getLocalFavorites, removeFavorite as removeLocalFavorite, getToolDetail } from "@/lib/api";
import type { Tool } from "@/lib/types";

// 将后端 ToolList 转换为前端 Tool 类型
function mapToolFromApi(item: any): Tool {
  return {
    id: item.id,
    name: item.name,
    description: item.description || "",
    detail: item.detail || "",
    type: item.tool_type || item.type || "tool",
    platform: item.platforms?.[0] || "general",
    category: item.category || { id: "", name: "", slug: "" },
    tags: item.tags || [],
    author: item.author || "",
    rating: { score: Number(item.quality_score) || 0, count: 0 },
    usageCount: item.usage_count || 0,
    favoriteCount: item.favorite_count || 0,
    isFeatured: item.is_featured || false,
    content: item.content || "",
    createdAt: item.created_at || "",
    updatedAt: item.updated_at || "",
  };
}

export default function FavoritesPage() {
  const router = useRouter();
  const { isAuthenticated, loading: authLoading, checkAuth } = useAuthStore();
  const [favoriteTools, setFavoriteTools] = useState<Tool[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => { checkAuth(); }, [checkAuth]);

  const loadFavorites = useCallback(async (pageNum: number = 1) => {
    setLoading(true); setError(null);
    try {
      if (isAuthenticated) {
        const res = await favoriteApi.getList(pageNum, 12);
        const body = res.data;
        // 后端返回 { code, data: [ToolList...], pagination: { page, size, total, pages } }
        const items = Array.isArray(body?.data) ? body.data : [];
        const pag = body?.pagination || {};
        setFavoriteTools(items.map((item: any) => mapToolFromApi(item)));
        setTotalPages(pag.pages || 1);
        setPage(pag.page || 1);
      } else {
        const ids = getLocalFavorites();
        if (ids.length === 0) { setFavoriteTools([]); setLoading(false); return; }
        const results = await Promise.allSettled(ids.map((id) => getToolDetail(id)));
        setFavoriteTools(results.filter((r): r is PromiseFulfilledResult<Tool> => r.status === "fulfilled").map((r) => r.value));
        setTotalPages(1);
      }
    } catch (err) { setError("加载收藏列表失败"); }
    finally { setLoading(false); }
  }, [isAuthenticated]);

  useEffect(() => { if (!authLoading) loadFavorites(page); }, [authLoading, isAuthenticated, page, loadFavorites]);

  const handleRemove = async (toolId: string) => {
    try {
      if (isAuthenticated) await favoriteApi.remove(toolId); else removeLocalFavorite(toolId);
      setFavoriteTools((prev) => prev.filter((s) => s.id !== toolId));
      window.dispatchEvent(new Event("favorites-changed"));
    } catch (err) { console.error("Failed to remove:", err); }
  };

  if (!authLoading && !isAuthenticated) {
    return (
      <div className="max-w-[1200px] mx-auto px-8 py-8">
        <div className="flex flex-col items-center justify-center rounded-2xl py-20" style={{ border: "1px dashed var(--glass-border)" }}>
          <LogIn className="mb-4 w-12 h-12" style={{ color: "var(--text-lo)", opacity: 0.3 }} />
          <h3 className="mb-2 text-lg font-medium">请先登录</h3>
          <p className="mb-6 text-sm" style={{ color: "var(--text-lo)" }}>登录后即可查看和管理你的收藏</p>
          <div className="flex gap-3">
            <Link href="/login"><button className="neon-btn px-5 py-2.5 text-sm"><LogIn className="w-4 h-4 inline mr-2" />去登录</button></Link>
            <Link href="/"><button className="px-5 py-2.5 rounded-xl text-sm cursor-pointer" style={{ border: "1px solid var(--glass-border)", color: "var(--text-mid)" }}><ArrowLeft className="w-4 h-4 inline mr-2" />返回首页</button></Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-[1200px] mx-auto px-8 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-black tracking-tight">我的收藏</h1>
        <p className="mt-1 text-sm" style={{ color: "var(--text-lo)" }}>{isAuthenticated ? "你收藏的 AI 工具" : "你收藏的 AI 工具（数据保存在本地浏览器中）"}</p>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="mb-4 w-8 h-8 animate-spin" style={{ color: "var(--text-lo)" }} />
          <p style={{ color: "var(--text-lo)" }}>加载收藏列表...</p>
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center rounded-2xl py-16" style={{ border: "1px dashed var(--glass-border)" }}>
          <AlertCircle className="mb-3 w-8 h-8" style={{ color: "var(--text-lo)" }} />
          <p className="mb-3" style={{ color: "var(--text-mid)" }}>{error}</p>
          <button onClick={() => loadFavorites(page)} className="neon-btn px-4 py-2 text-sm">重新加载</button>
        </div>
      ) : favoriteTools.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl py-20" style={{ border: "1px dashed var(--glass-border)" }}>
          <Heart className="mb-4 w-12 h-12" style={{ color: "var(--text-lo)", opacity: 0.3 }} />
          <h3 className="mb-2 text-lg font-medium">还没有收藏</h3>
          <p className="mb-6 text-sm" style={{ color: "var(--text-lo)" }}>浏览工具时点击收藏按钮，即可在这里查看</p>
          <Link href="/"><button className="neon-btn px-5 py-2.5 text-sm"><ArrowLeft className="w-4 h-4 inline mr-2" />去发现工具</button></Link>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {favoriteTools.map((tool) => (
              <div key={tool.id} className="relative">
                <ToolCard tool={tool} />
                <button onClick={() => handleRemove(tool.id)} className="absolute right-3 top-3 z-10 w-8 h-8 rounded-lg flex items-center justify-center cursor-pointer transition-all hover:text-[var(--magenta)]" style={{ background: "var(--glass)", border: "1px solid var(--glass-border)", color: "var(--text-lo)", backdropFilter: "blur(10px)" }} aria-label="取消收藏">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
          {totalPages > 1 && (
            <div className="mt-8 flex justify-center items-center gap-2">
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1} className="px-4 py-2 rounded-xl text-sm cursor-pointer transition-all disabled:opacity-30" style={{ border: "1px solid var(--glass-border)", background: "var(--glass)", color: "var(--text-mid)" }}>上一页</button>
              <span className="text-sm" style={{ color: "var(--text-lo)" }}>第 {page} / {totalPages} 页</span>
              <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages} className="px-4 py-2 rounded-xl text-sm cursor-pointer transition-all disabled:opacity-30" style={{ border: "1px solid var(--glass-border)", background: "var(--glass)", color: "var(--text-mid)" }}>下一页</button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
