"use client";

import { useEffect, useState, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Suspense } from "react";
import Link from "next/link";
import {
  MessageSquare, Workflow, Bot, Plug, Wrench, Image,
  Sparkles, Wand2, AlertCircle, ChevronLeft,
  ChevronRight, Layers, Zap, Database, type LucideIcon,
} from "lucide-react";
import { getCategories, getToolsByCategory } from "@/lib/api";
import ToolCard from "@/components/home/ToolCard";
import type { Category, Tool } from "@/lib/types";

const CATEGORY_ICONS: Record<string, LucideIcon> = {
  "mcp-tools": Plug, "mcp-server": Plug, "mcp-client": Plug, "mcp-toolkit": Plug,
  "ai-agent": Bot, "agent-framework": Bot, "agent-tool": Bot, "multi-agent": Bot,
  "prompt-engineering": Wand2, "prompt-template": Wand2, "prompt-optimizer": Wand2, "prompt-ide": Wand2,
  "llm-framework": Workflow, "langchain": Workflow, "llamaindex": Workflow, "semantic-kernel": Workflow,
  "rag-tools": Database, "vector-database": Database, "embedding": Database, "document-parser": Database,
  "ai-coding": Wrench, "code-generation": Wrench, "code-review": Wrench, "copilot-tool": Wrench,
  "ai-creation": Sparkles, "copywriting": Sparkles, "image-generation": Image, "audio-generation": Image,
  "gpts-plugins": MessageSquare, "custom-gpt": MessageSquare, "openai-plugin": MessageSquare, "claude-tool": MessageSquare,
};
const DEFAULT_ICON = Sparkles;

const CATEGORY_GRADIENTS: Record<string, { from: string; to: string }> = {
  "mcp-tools": { from: "rgba(0,240,255,0.15)", to: "rgba(0,240,255,0.03)" },
  "ai-agent": { from: "rgba(139,92,246,0.15)", to: "rgba(139,92,246,0.03)" },
  "prompt-engineering": { from: "rgba(16,185,129,0.15)", to: "rgba(16,185,129,0.03)" },
  "llm-framework": { from: "rgba(245,158,11,0.15)", to: "rgba(245,158,11,0.03)" },
  "rag-tools": { from: "rgba(236,72,153,0.15)", to: "rgba(236,72,153,0.03)" },
  "ai-coding": { from: "rgba(99,102,241,0.15)", to: "rgba(99,102,241,0.03)" },
  "ai-creation": { from: "rgba(239,68,68,0.15)", to: "rgba(239,68,68,0.03)" },
  "gpts-plugins": { from: "rgba(34,211,238,0.15)", to: "rgba(34,211,238,0.03)" },
};

function CategoriesContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const selectedCat = searchParams.get("cat");

  const [categories, setCategories] = useState<Category[]>([]);
  const [tools, setTools] = useState<Tool[]>([]);
  const [loading, setLoading] = useState(true);
  const [toolsLoading, setToolsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toolPage, setToolPage] = useState(1);
  const [toolTotalPages, setToolTotalPages] = useState(0);
  const [toolTotal, setToolTotal] = useState(0);

  // 一级分类
  const topLevelCategories = categories.filter((c) => !c.parentId);
  // 当前选中的一级分类
  const selectedTopCategory = selectedCat
    ? topLevelCategories.find((c) => c.id === selectedCat) ||
      topLevelCategories.find((c) => c.children?.some((ch) => ch.id === selectedCat))
    : null;
  // 当前选中的分类对象（可能是一级或二级）
  const selectedCategory = categories.find((c) => c.id === selectedCat)
    || categories.flatMap(c => c.children || []).find((c) => c.id === selectedCat);

  useEffect(() => {
    async function fetchCategories() {
      try {
        const catData = await getCategories();
        setCategories(catData);
      } catch (err) {
        console.error("Failed to fetch categories:", err);
        setError("分类数据加载失败");
      }
    }
    fetchCategories();
  }, []);

  const fetchToolsByCategory = useCallback(async (categoryId: string, page: number) => {
    setToolsLoading(true);
    try {
      const result = await getToolsByCategory(categoryId, page, 12);
      setTools(result.items);
      setToolTotalPages(result.totalPages);
      setToolTotal(result.total);
    } catch (err) {
      console.error("Failed to fetch tools:", err);
      setTools([]);
    } finally {
      setToolsLoading(false);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selectedCat) {
      setToolPage(1);
      fetchToolsByCategory(selectedCat, 1);
    } else {
      setTools([]);
      setLoading(false);
    }
  }, [selectedCat, fetchToolsByCategory]);

  const handleCategoryClick = (catId: string) => {
    if (selectedCat === catId) {
      router.push("/categories");
    } else {
      router.push(`/categories?cat=${catId}`);
    }
  };

  const handlePageChange = (newPage: number) => {
    if (selectedCat) {
      setToolPage(newPage);
      fetchToolsByCategory(selectedCat, newPage);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const totalTools = categories.reduce((sum, c) => sum + (c.toolCount || 0), 0);

  return (
    <div className="max-w-[1200px] mx-auto px-4 sm:px-8 py-8">
      {/* 页面标题 */}
      <div className="mb-6">
        <h1 className="text-3xl font-black tracking-tight" style={{ background: "linear-gradient(135deg, var(--cyan), var(--violet))", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>分类浏览</h1>
        <p className="mt-1.5 text-sm" style={{ color: "var(--text-mid)" }}>
          {totalTools > 0 ? `共 ${topLevelCategories.length} 个分类，${totalTools} 个 AI 工具` : `共 ${topLevelCategories.length} 个分类`}
        </p>
      </div>

      {/* 一级分类标签页 */}
      <div className="flex gap-2 flex-wrap mb-6">
        {topLevelCategories.map((cat) => {
          const Icon = CATEGORY_ICONS[cat.slug] || CATEGORY_ICONS[cat.icon || ""] || DEFAULT_ICON;
          const isActive = selectedTopCategory?.id === cat.id;
          const gradient = CATEGORY_GRADIENTS[cat.slug] || { from: "rgba(255,255,255,0.08)", to: "rgba(255,255,255,0.02)" };

          return (
            <button
              key={cat.id}
              onClick={() => handleCategoryClick(cat.id)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium cursor-pointer transition-all duration-300"
              style={{
                background: isActive ? gradient.from : "var(--glass)",
                border: isActive ? `1px solid rgba(255,255,255,0.1)` : "1px solid var(--glass-border)",
                color: isActive ? "var(--text-hi)" : "var(--text-mid)",
                boxShadow: isActive ? `0 0 20px ${gradient.from}` : "none",
              }}
            >
              <Icon className="w-4 h-4" />
              <span>{cat.name}</span>
              {cat.toolCount > 0 && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-md" style={{ background: "rgba(255,255,255,0.06)", color: "var(--text-lo)" }}>{cat.toolCount}</span>
              )}
            </button>
          );
        })}
      </div>

      {/* 选中一级分类后，显示子分类胶囊 */}
      {selectedTopCategory && selectedTopCategory.children && selectedTopCategory.children.length > 0 && (
        <div className="flex gap-2 flex-wrap mb-6">
          {/* "全部"胶囊 */}
          <button
            onClick={() => handleCategoryClick(selectedTopCategory.id)}
            className="px-3.5 py-1.5 rounded-full text-xs font-medium cursor-pointer transition-all duration-200"
            style={{
              background: selectedCat === selectedTopCategory.id ? "rgba(0,240,255,0.15)" : "rgba(255,255,255,0.03)",
              border: selectedCat === selectedTopCategory.id ? "1px solid rgba(0,240,255,0.25)" : "1px solid rgba(255,255,255,0.06)",
              color: selectedCat === selectedTopCategory.id ? "var(--cyan)" : "var(--text-mid)",
            }}
          >
            全部 {selectedTopCategory.name}
          </button>
          {selectedTopCategory.children.map((child) => {
            const ChildIcon = CATEGORY_ICONS[child.slug] || CATEGORY_ICONS[child.icon || ""] || DEFAULT_ICON;
            const isChildActive = selectedCat === child.id;
            return (
              <button
                key={child.id}
                onClick={() => handleCategoryClick(child.id)}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-medium cursor-pointer transition-all duration-200"
                style={{
                  background: isChildActive ? "rgba(0,240,255,0.15)" : "rgba(255,255,255,0.03)",
                  border: isChildActive ? "1px solid rgba(0,240,255,0.25)" : "1px solid rgba(255,255,255,0.06)",
                  color: isChildActive ? "var(--cyan)" : "var(--text-mid)",
                }}
              >
                <ChildIcon className="w-3 h-3" />
                <span>{child.name}</span>
                {child.toolCount > 0 && (
                  <span style={{ color: isChildActive ? "rgba(0,240,255,0.6)" : "var(--text-lo)" }}>({child.toolCount})</span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* 分隔线 */}
      <div className="h-[1px] mb-6" style={{ background: "linear-gradient(90deg, transparent, var(--glass-border), transparent)" }} />

      {/* 工具结果区域 */}
      {error ? (
        <div className="flex flex-col items-center justify-center rounded-2xl py-16" style={{ border: "1px dashed var(--glass-border)" }}>
          <AlertCircle className="mb-3 w-8 h-8" style={{ color: "var(--text-lo)" }} />
          <p style={{ color: "var(--text-mid)" }}>{error}</p>
        </div>
      ) : selectedCat && selectedCategory ? (
        <div>
          <div className="flex items-center gap-3 mb-5">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "rgba(0,240,255,0.1)" }}>
              <Layers className="w-4 h-4" style={{ color: "var(--cyan)" }} />
            </div>
            <div>
              <h2 className="text-lg font-bold">{selectedCategory.name}</h2>
              {selectedCategory.description && (
                <p className="text-xs mt-0.5" style={{ color: "var(--text-lo)" }}>{selectedCategory.description}</p>
              )}
            </div>
            {toolTotal > 0 && (
              <span className="ml-auto text-xs px-2.5 py-1 rounded-full" style={{ background: "rgba(0,240,255,0.08)", color: "var(--cyan)", border: "1px solid rgba(0,240,255,0.12)" }}>
                共 {toolTotal} 个
              </span>
            )}
          </div>

          {toolsLoading && tools.length === 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="rounded-2xl p-6 animate-pulse" style={{ background: "var(--glass)", border: "1px solid var(--glass-border)" }}>
                  <div className="space-y-3">
                    <div className="flex gap-2"><div className="h-5 w-16 rounded-md" style={{ background: "var(--glass-border)" }} /><div className="h-5 w-14 rounded-md" style={{ background: "var(--glass-border)" }} /></div>
                    <div className="h-6 w-3/4 rounded" style={{ background: "var(--glass-border)" }} />
                    <div className="h-4 w-full rounded" style={{ background: "var(--glass-border)" }} />
                  </div>
                </div>
              ))}
            </div>
          ) : tools.length > 0 ? (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {tools.map((tool) => (
                  <ToolCard key={tool.id} tool={tool} />
                ))}
              </div>
              {toolTotalPages > 1 && (
                <div className="mt-8 flex items-center justify-center gap-2">
                  <button disabled={toolPage <= 1 || toolsLoading} onClick={() => handlePageChange(toolPage - 1)} className="w-9 h-9 rounded-[10px] flex items-center justify-center text-sm font-semibold cursor-pointer transition-all hover:-translate-y-0.5 disabled:opacity-30" style={{ border: "1px solid var(--glass-border)", background: "var(--glass)", color: "var(--text-mid)" }}><ChevronLeft className="w-4 h-4" /></button>
                  <span className="text-sm px-3" style={{ color: "var(--text-lo)" }}>{toolPage} / {toolTotalPages}</span>
                  <button disabled={toolPage >= toolTotalPages || toolsLoading} onClick={() => handlePageChange(toolPage + 1)} className="w-9 h-9 rounded-[10px] flex items-center justify-center text-sm font-semibold cursor-pointer transition-all hover:-translate-y-0.5 disabled:opacity-30" style={{ border: "1px solid var(--glass-border)", background: "var(--glass)", color: "var(--text-mid)" }}><ChevronRight className="w-4 h-4" /></button>
                </div>
              )}
            </>
          ) : (
            <div className="rounded-2xl p-12 text-center" style={{ border: "1px dashed var(--glass-border)" }}>
              <Zap className="mx-auto mb-3 w-8 h-8" style={{ color: "var(--text-lo)", opacity: 0.4 }} />
              <p style={{ color: "var(--text-lo)" }}>该分类暂无工具</p>
            </div>
          )}
        </div>
      ) : !loading ? (
        <div className="flex flex-col items-center justify-center rounded-2xl py-20" style={{ border: "1px dashed var(--glass-border)" }}>
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl mb-4" style={{ background: "rgba(0,240,255,0.08)" }}>📂</div>
          <p className="mb-1 font-semibold" style={{ color: "var(--text-mid)" }}>选择一个分类开始浏览</p>
          <p className="text-sm" style={{ color: "var(--text-lo)" }}>点击上方的分类标签查看对应工具</p>
        </div>
      ) : null}
    </div>
  );
}

export default function CategoriesPage() {
  return (
    <Suspense fallback={<div className="max-w-[1200px] mx-auto px-8 py-8"><div className="h-8 w-40 animate-pulse rounded" style={{ background: "var(--glass-border)" }} /></div>}>
      <CategoriesContent />
    </Suspense>
  );
}
