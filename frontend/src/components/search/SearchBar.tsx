"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Search, X, Clock, TrendingUp } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { searchSuggest } from "@/lib/api";

interface SuggestItem {
  text: string;
  type?: "history" | "suggest";
}

interface SearchBarProps {
  defaultValue?: string;
  onSearch?: (query: string) => void;
  placeholder?: string;
  className?: string;
}

const SEARCH_HISTORY_KEY = "search_history";
const MAX_HISTORY = 10;
const MAX_SUGGESTIONS = 8;
const DEBOUNCE_MS = 300;

function getSearchHistory(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(SEARCH_HISTORY_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveSearchHistory(query: string) {
  if (typeof window === "undefined") return;
  const trimmed = query.trim();
  if (!trimmed) return;
  const history = getSearchHistory();
  // 去重并放到最前面
  const filtered = history.filter((item) => item !== trimmed);
  filtered.unshift(trimmed);
  localStorage.setItem(
    SEARCH_HISTORY_KEY,
    JSON.stringify(filtered.slice(0, MAX_HISTORY))
  );
}

function clearSearchHistory() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(SEARCH_HISTORY_KEY);
}

export default function SearchBar({
  defaultValue = "",
  onSearch,
  placeholder = "搜索 AI 工具...",
  className = "",
}: SearchBarProps) {
  const router = useRouter();
  const [query, setQuery] = useState(defaultValue);
  const [showDropdown, setShowDropdown] = useState(false);
  const [items, setItems] = useState<SuggestItem[]>([]);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [loading, setLoading] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  // 清理 debounce 和 abort
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (abortRef.current) abortRef.current.abort();
    };
  }, []);

  // 点击外部关闭下拉
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(e.target as Node)
      ) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // 获取搜索建议
  const fetchSuggestions = useCallback(async (q: string) => {
    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    try {
      const res = await searchSuggest(q, MAX_SUGGESTIONS);
      const data = res.data?.data;
      const suggestions: SuggestItem[] = Array.isArray(data)
        ? data.map((item: any) => ({
            text: typeof item === "string" ? item : item.text || item.name || item.query || "",
            type: "suggest" as const,
          }))
        : [];
      setItems(suggestions);
      setActiveIndex(-1);
    } catch (err: any) {
      if (err?.name !== "AbortError" && err?.name !== "CanceledError") {
        // 静默处理错误，不阻塞用户输入
        setItems([]);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  // 输入变化时 debounce 获取建议
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);

    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (!value.trim()) {
      setItems([]);
      setActiveIndex(-1);
      return;
    }

    debounceRef.current = setTimeout(() => {
      fetchSuggestions(value.trim());
    }, DEBOUNCE_MS);
  };

  // 聚焦时显示搜索历史
  const handleFocus = () => {
    if (query.trim()) {
      // 有输入内容时，重新触发建议
      fetchSuggestions(query.trim());
    } else {
      // 无输入内容时，显示搜索历史
      const history = getSearchHistory();
      setItems(
        history.map((text) => ({ text, type: "history" as const }))
      );
    }
    setShowDropdown(true);
    setActiveIndex(-1);
  };

  // 执行搜索
  const executeSearch = useCallback(
    (searchQuery: string) => {
      const trimmed = searchQuery.trim();
      if (!trimmed) return;

      saveSearchHistory(trimmed);
      setShowDropdown(false);
      setQuery(trimmed);

      if (onSearch) {
        onSearch(trimmed);
      } else {
        router.push(`/search?q=${encodeURIComponent(trimmed)}`);
      }
    },
    [onSearch, router]
  );

  // 提交搜索
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (activeIndex >= 0 && activeIndex < items.length) {
      executeSearch(items[activeIndex].text);
    } else {
      executeSearch(query);
    }
  };

  // 清空输入
  const handleClear = () => {
    setQuery("");
    setItems([]);
    setActiveIndex(-1);
    inputRef.current?.focus();
  };

  // 键盘导航
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showDropdown || items.length === 0) return;

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setActiveIndex((prev) =>
          prev < items.length - 1 ? prev + 1 : 0
        );
        break;
      case "ArrowUp":
        e.preventDefault();
        setActiveIndex((prev) =>
          prev > 0 ? prev - 1 : items.length - 1
        );
        break;
      case "Enter":
        if (activeIndex >= 0 && activeIndex < items.length) {
          e.preventDefault();
          executeSearch(items[activeIndex].text);
        }
        break;
      case "Escape":
        e.preventDefault();
        setShowDropdown(false);
        setActiveIndex(-1);
        break;
    }
  };

  // 点击建议项
  const handleItemClick = (item: SuggestItem) => {
    executeSearch(item.text);
  };

  // 清空搜索历史
  const handleClearHistory = (e: React.MouseEvent) => {
    e.stopPropagation();
    clearSearchHistory();
    setItems([]);
  };

  return (
    <div className={`relative ${className}`}>
      <form onSubmit={handleSearch}>
        <div className="relative flex items-center">
          <Search className="absolute left-3 h-4 w-4 text-muted-foreground" />
          <Input
            ref={inputRef}
            type="text"
            placeholder={placeholder}
            value={query}
            onChange={handleInputChange}
            onFocus={handleFocus}
            onKeyDown={handleKeyDown}
            className="pr-10 pl-9"
            autoComplete="off"
            role="combobox"
            aria-expanded={showDropdown && items.length > 0}
            aria-haspopup="listbox"
          />
          {query && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="absolute right-1 h-7 w-7"
              onClick={handleClear}
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </form>

      {/* 搜索建议下拉列表 */}
      {showDropdown && items.length > 0 && (
        <div
          ref={dropdownRef}
          className="absolute left-0 right-0 top-full z-50 mt-1 rounded-lg border bg-popover shadow-lg"
          role="listbox"
        >
          {/* 标题栏 */}
          {!query.trim() && items[0]?.type === "history" && (
            <div className="flex items-center justify-between border-b px-3 py-2">
              <span className="text-xs font-medium text-muted-foreground">
                搜索历史
              </span>
              <Button
                variant="ghost"
                size="sm"
                className="h-auto px-2 py-0.5 text-xs text-muted-foreground hover:text-destructive"
                onClick={handleClearHistory}
              >
                清空
              </Button>
            </div>
          )}

          {/* 建议列表 */}
          <ul className="max-h-80 overflow-y-auto py-1">
            {items.map((item, index) => (
              <li
                key={`${item.type}-${item.text}-${index}`}
                className={`flex cursor-pointer items-center gap-3 px-3 py-2 text-sm transition-colors ${
                  index === activeIndex
                    ? "bg-accent text-accent-foreground"
                    : "hover:bg-accent/50"
                }`}
                onClick={() => handleItemClick(item)}
                onMouseEnter={() => setActiveIndex(index)}
                role="option"
                aria-selected={index === activeIndex}
              >
                {item.type === "history" ? (
                  <Clock className="h-4 w-4 shrink-0 text-muted-foreground" />
                ) : (
                  <TrendingUp className="h-4 w-4 shrink-0 text-muted-foreground" />
                )}
                <span className="flex-1 truncate">{item.text}</span>
                {index === activeIndex && (
                  <kbd className="hidden shrink-0 rounded border bg-muted px-1.5 py-0.5 text-xs text-muted-foreground sm:inline-block">
                    Enter
                  </kbd>
                )}
              </li>
            ))}
          </ul>

          {/* 加载指示器 */}
          {loading && (
            <div className="border-t px-3 py-2 text-center text-xs text-muted-foreground">
              正在搜索...
            </div>
          )}
        </div>
      )}
    </div>
  );
}
