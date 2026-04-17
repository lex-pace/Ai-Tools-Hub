"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SKILL_TYPE_MAP, PLATFORM_MAP, SKILL_TYPE_COLORS, type SkillType, type SkillPlatform, type Category } from "@/lib/types";
import { getCategories } from "@/lib/api";
import type { SearchFilters } from "@/lib/types";

interface FilterPanelProps {
  filters: SearchFilters;
  onFilterChange: (filters: Partial<SearchFilters>) => void;
}

const SORT_OPTIONS: { value: SearchFilters["sortBy"]; label: string }[] = [
  { value: "relevance", label: "相关度" },
  { value: "rating", label: "质量评分" },
  { value: "newest", label: "最新" },
  { value: "popular", label: "使用量" },
];

// 筛选用的技能类型列表（AI Tools Hub）
const FILTER_SKILL_TYPES: { value: string; label: string }[] = [
  { value: "mcp_server", label: "MCP Server" },
  { value: "custom_gpt", label: "Custom GPT" },
  { value: "agent_skill", label: "Agent 框架" },
  { value: "prompt_template", label: "Prompt 模板" },
  { value: "tool", label: "工具" },
];

export default function FilterPanel({
  filters,
  onFilterChange,
}: FilterPanelProps) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [showAllTypes, setShowAllTypes] = useState(false);

  useEffect(() => {
    async function fetchCategories() {
      try {
        const data = await getCategories();
        setCategories(data);
      } catch (err) {
        console.error("Failed to fetch categories for filter:", err);
      }
    }
    fetchCategories();
  }, []);

  const platforms = Object.entries(PLATFORM_MAP) as [SkillPlatform, typeof PLATFORM_MAP[SkillPlatform]][];

  const displayedTypes = showAllTypes
    ? FILTER_SKILL_TYPES
    : FILTER_SKILL_TYPES.slice(0, 4);

  const hasActiveFilters =
    filters.type ||
    filters.platform ||
    filters.categoryId ||
    filters.sortBy !== "relevance";

  return (
    <div className="space-y-6">
      {/* 分类筛选（分组显示） */}
      {categories.length > 0 && (
        <div>
          <h4 className="mb-2 text-sm font-medium">分类</h4>
          <div className="space-y-2">
            <Badge
              variant={!filters.categoryId ? "default" : "outline"}
              className="cursor-pointer"
              onClick={() => onFilterChange({ categoryId: undefined })}
            >
              全部分类
            </Badge>
            {categories
              .filter((c) => !c.parentId)
              .map((cat) => {
                const hasChildren = cat.children && cat.children.length > 0;
                return (
                  <div key={cat.id}>
                    <Badge
                      variant={filters.categoryId === cat.id ? "default" : "outline"}
                      className="cursor-pointer"
                      onClick={() =>
                        onFilterChange({
                          categoryId: filters.categoryId === cat.id ? undefined : cat.id,
                        })
                      }
                    >
                      {cat.name}
                      {cat.skillCount > 0 && <span className="ml-1 opacity-60">({cat.skillCount})</span>}
                    </Badge>
                    {hasChildren && (
                      <div className="flex flex-wrap gap-1.5 mt-1 ml-2 pl-2 border-l" style={{ borderColor: "var(--glass-border)" }}>
                        {cat.children!.map((child) => (
                          <Badge
                            key={child.id}
                            variant={filters.categoryId === child.id ? "default" : "outline"}
                            className="cursor-pointer text-xs"
                            onClick={() =>
                              onFilterChange({
                                categoryId: filters.categoryId === child.id ? undefined : child.id,
                              })
                            }
                          >
                            {child.name}
                            {child.skillCount > 0 && <span className="ml-1 opacity-60">({child.skillCount})</span>}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* 排序 */}
      <div>
        <h4 className="mb-2 text-sm font-medium">排序方式</h4>
        <div className="flex flex-wrap gap-2">
          {SORT_OPTIONS.map((option) => (
            <Button
              key={option.value}
              variant={filters.sortBy === option.value ? "default" : "outline"}
              size="sm"
              onClick={() => onFilterChange({ sortBy: option.value })}
            >
              {option.label}
            </Button>
          ))}
        </div>
      </div>

      {/* 技能类型 */}
      <div>
        <h4 className="mb-2 text-sm font-medium">技能类型</h4>
        <div className="flex flex-wrap gap-2">
          {displayedTypes.map(({ value, label }) => (
            <Badge
              key={value}
              variant={filters.type === value ? "default" : "outline"}
              className="cursor-pointer"
              onClick={() =>
                onFilterChange({ type: filters.type === value ? undefined : value as SkillType })
              }
            >
              {label}
            </Badge>
          ))}
        </div>
        {FILTER_SKILL_TYPES.length > 4 && (
          <button
            className="mt-2 text-xs text-primary hover:underline"
            onClick={() => setShowAllTypes(!showAllTypes)}
          >
            {showAllTypes ? "收起" : `展开更多 (${FILTER_SKILL_TYPES.length - 4})`}
          </button>
        )}
      </div>

      {/* 平台 */}
      <div>
        <h4 className="mb-2 text-sm font-medium">AI 平台</h4>
        <div className="flex flex-wrap gap-2">
          {platforms.map(([platform, info]) => (
            <Badge
              key={platform}
              variant={filters.platform === platform ? "default" : "outline"}
              className="cursor-pointer"
              onClick={() =>
                onFilterChange({
                  platform:
                    filters.platform === platform ? undefined : platform,
                })
              }
            >
              {info.name}
            </Badge>
          ))}
        </div>
      </div>

      {/* 清除筛选 */}
      {hasActiveFilters && (
        <Button
          variant="ghost"
          size="sm"
          className="text-muted-foreground"
          onClick={() =>
            onFilterChange({
              type: undefined,
              platform: undefined,
              categoryId: undefined,
              sortBy: "relevance",
            })
          }
        >
          清除所有筛选
        </Button>
      )}
    </div>
  );
}
