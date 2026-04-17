"use client";

import Link from "next/link";
import {
  MessageSquare, Workflow, Bot, Plug, Wrench, Image,
  Sparkles, Wand2, Database, type LucideIcon,
} from "lucide-react";
import type { Category } from "@/lib/types";

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

const ICON_COLORS = [
  { bg: "rgba(0,240,255,0.1)", border: "rgba(0,240,255,0.15)" },
  { bg: "rgba(139,92,246,0.1)", border: "rgba(139,92,246,0.15)" },
  { bg: "rgba(16,185,129,0.1)", border: "rgba(16,185,129,0.15)" },
  { bg: "rgba(245,158,11,0.1)", border: "rgba(245,158,11,0.15)" },
  { bg: "rgba(236,72,153,0.1)", border: "rgba(236,72,153,0.15)" },
  { bg: "rgba(99,102,241,0.1)", border: "rgba(99,102,241,0.15)" },
  { bg: "rgba(239,68,68,0.1)", border: "rgba(239,68,68,0.15)" },
  { bg: "rgba(34,211,238,0.1)", border: "rgba(34,211,238,0.15)" },
];

interface CategoryGridProps { categories?: Category[]; }

export default function CategoryGrid({ categories }: CategoryGridProps) {
  // 只显示一级分类
  const displayCategories: Category[] = categories?.filter(c => !c.parentId) || [
    { id: "1", name: "MCP 工具", slug: "mcp-tools", toolCount: 0, description: "", icon: "plug" },
    { id: "2", name: "AI Agent", slug: "ai-agent", toolCount: 0, description: "", icon: "bot" },
    { id: "3", name: "Prompt 工程", slug: "prompt-engineering", toolCount: 0, description: "", icon: "wand2" },
    { id: "4", name: "LLM 框架", slug: "llm-framework", toolCount: 0, description: "", icon: "workflow" },
    { id: "5", name: "RAG 工具", slug: "rag-tools", toolCount: 0, description: "", icon: "database" },
    { id: "6", name: "AI 编程", slug: "ai-coding", toolCount: 0, description: "", icon: "code" },
    { id: "7", name: "AI 创作", slug: "ai-creation", toolCount: 0, description: "", icon: "sparkles" },
    { id: "8", name: "GPTs & 插件", slug: "gpts-plugins", toolCount: 0, description: "", icon: "messageSquare" },
  ];

  return (
    <section className="max-w-[1200px] mx-auto px-8 py-12">
      <div className="flex items-center justify-between mb-7">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center text-sm" style={{ background: "rgba(0,240,255,0.1)", color: "var(--cyan)" }}>🧠</div>
          <h2 className="text-xl font-extrabold tracking-tight">热门分类</h2>
        </div>
        <Link href="/categories" className="text-sm transition-all hover:gap-2 flex items-center gap-1" style={{ color: "var(--text-lo)" }}>查看全部 →</Link>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {displayCategories.map((cat, i) => {
          const Icon = CATEGORY_ICONS[cat.slug] || CATEGORY_ICONS[cat.icon || ""] || DEFAULT_ICON;
          const color = ICON_COLORS[i % ICON_COLORS.length];
          return (
            <Link key={cat.id} href={`/categories?cat=${cat.id}`} className="group relative p-4 rounded-[14px] overflow-hidden cursor-pointer flex items-center gap-3 transition-all duration-[400ms] hover:-translate-y-1" style={{ background: "var(--glass)", border: "1px solid var(--glass-border)", backdropFilter: "blur(20px)" }}>
              <div className="absolute inset-0 rounded-[14px] opacity-0 group-hover:opacity-100 transition-opacity" style={{ background: "linear-gradient(135deg, rgba(0,240,255,0.08), rgba(139,92,246,0.05))" }} />
              <div className="absolute top-0 left-0 right-0 h-[2px] origin-left scale-x-0 group-hover:scale-x-100 transition-transform duration-[400ms]" style={{ background: "linear-gradient(90deg, var(--cyan), var(--violet))" }} />
              <div className="w-10 h-10 rounded-[10px] flex items-center justify-center text-lg shrink-0 transition-transform duration-[400ms] group-hover:scale-110 group-hover:-rotate-3" style={{ background: color.bg, border: `1px solid ${color.border}` }}>
                <Icon className="w-5 h-5" style={{ color: "var(--text-hi)" }} />
              </div>
              <div className="relative z-[1] min-w-0">
                <div className="font-bold text-sm truncate">{cat.name}</div>
                <div className="text-[11px]" style={{ color: "var(--text-lo)" }}>{cat.toolCount > 0 ? `${cat.toolCount} 个工具` : "暂无"}</div>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
