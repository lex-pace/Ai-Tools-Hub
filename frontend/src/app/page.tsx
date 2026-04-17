"use client";

import HeroSearch from "@/components/home/HeroSearch";
import CategoryGrid from "@/components/home/CategoryGrid";
import ToolCard from "@/components/home/ToolCard";
import { getCategories, getFeaturedTools, getTools } from "@/lib/api";
import type { Tool, Category } from "@/lib/types";
import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, AlertCircle } from "lucide-react";

export default function HomePage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [recommendedTools, setRecommendedTools] = useState<Tool[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      setLoading(true); setError(null);
      try {
        const [catData, toolResult] = await Promise.all([
          getCategories().catch(() => [] as Category[]),
          getFeaturedTools(1, 6).catch(() => null),
        ]);
        setCategories(catData);
        if (toolResult && toolResult.items) {
          setRecommendedTools(toolResult.items);
        } else {
          // fallback: try getTools
          try {
            const fallback = await getTools({ page: 1, pageSize: 6, sortBy: "popular" });
            setRecommendedTools(fallback?.items || []);
          } catch {
            setRecommendedTools([]);
          }
        }
      } catch (err) { setError("数据加载失败，请刷新页面重试"); }
      finally { setLoading(false); }
    }
    fetchData();
  }, []);

  return (
    <div>
      <HeroSearch />
      <CategoryGrid categories={categories.length > 0 ? categories : undefined} />

      {/* Trending Tools */}
      <section className="max-w-[1200px] mx-auto px-8 py-12">
        <div className="flex items-center justify-between mb-7">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center text-sm" style={{ background: "rgba(139,92,246,0.1)", color: "var(--violet)" }}>🔥</div>
            <h2 className="text-xl font-extrabold tracking-tight">热门工具</h2>
          </div>
          <Link href="/search?sortBy=popular" className="text-sm transition-all hover:gap-2 flex items-center gap-1" style={{ color: "var(--text-lo)" }}>查看全部 →</Link>
        </div>

        {error ? (
          <div className="flex flex-col items-center justify-center rounded-2xl py-16" style={{ border: "1px dashed var(--glass-border)" }}>
            <AlertCircle className="mb-3 w-8 h-8" style={{ color: "var(--text-lo)" }} />
            <p className="mb-3" style={{ color: "var(--text-mid)" }}>{error}</p>
            <button onClick={() => window.location.reload()} className="neon-btn px-4 py-2 text-sm">刷新重试</button>
          </div>
        ) : loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="rounded-2xl p-6" style={{ background: "var(--glass)", border: "1px solid var(--glass-border)" }}>
                <div className="animate-pulse space-y-3">
                  <div className="flex gap-2"><div className="h-5 w-16 rounded-md" style={{ background: "var(--glass-border)" }} /><div className="h-5 w-14 rounded-md" style={{ background: "var(--glass-border)" }} /></div>
                  <div className="h-6 w-3/4 rounded" style={{ background: "var(--glass-border)" }} />
                  <div className="h-4 w-full rounded" style={{ background: "var(--glass-border)" }} />
                  <div className="h-4 w-2/3 rounded" style={{ background: "var(--glass-border)" }} />
                </div>
              </div>
            ))}
          </div>
        ) : recommendedTools.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {recommendedTools.map((tool) => <ToolCard key={tool.id} tool={tool} />)}
          </div>
        ) : (
          <div className="rounded-2xl p-12 text-center" style={{ border: "1px dashed var(--glass-border)" }}>
            <p style={{ color: "var(--text-lo)" }}>暂无推荐工具，请稍后再来查看</p>
          </div>
        )}
      </section>
    </div>
  );
}
