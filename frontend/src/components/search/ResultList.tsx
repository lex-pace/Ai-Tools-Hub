"use client";

import { Loader2, SearchX } from "lucide-react";
import ToolCard from "@/components/home/ToolCard";
import type { Tool } from "@/lib/types";

interface ResultListProps {
  tools: Tool[];
  loading?: boolean;
  error?: string | null;
  total?: number;
  query?: string;
  emptyMessage?: string;
}

export default function ResultList({
  tools,
  loading = false,
  error = null,
  total,
  query,
  emptyMessage,
}: ResultListProps) {
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Loader2 className="mb-4 h-8 w-8 animate-spin text-muted-foreground" />
        <p className="text-muted-foreground">正在搜索...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <p className="text-destructive mb-2">{error}</p>
        <p className="text-sm text-muted-foreground">请检查网络后重试</p>
      </div>
    );
  }

  if (tools.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <SearchX className="mb-4 h-12 w-12 text-muted-foreground/30" />
        <p className="text-muted-foreground mb-1">
          {emptyMessage || "没有找到相关工具，试试其他关键词？"}
        </p>
        {query && (
          <p className="text-sm text-muted-foreground">
            搜索关键词: &quot;{query}&quot;
          </p>
        )}
      </div>
    );
  }

  return (
    <div>
      {total !== undefined && (
        <p className="mb-4 text-sm text-muted-foreground">
          共找到 <span className="font-medium text-foreground">{total}</span> 个结果
          {query && (
            <span>
              ，关键词: &quot;{query}&quot;
            </span>
          )}
        </p>
      )}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {tools.map((tool) => (
          <ToolCard key={tool.id} tool={tool} />
        ))}
      </div>
    </div>
  );
}
