"use client";

import Link from "next/link";
import { Star, Heart, Eye } from "lucide-react";
import { PLATFORM_MAP, TOOL_TYPE_MAP, TOOL_TYPE_COLORS, type Tool } from "@/lib/types";
import { formatNumber, truncateText } from "@/lib/utils";
import { isFavorite, addFavorite, removeFavorite, favoriteApi } from "@/lib/api";
import { useAuthStore } from "@/store/authStore";
import { useState, useEffect, useCallback, useRef } from "react";

interface ToolCardProps { tool: Tool; }

export default function ToolCard({ tool }: ToolCardProps) {
  const [favorited, setFavorited] = useState(false);
  const [favoriteLoading, setFavoriteLoading] = useState(false);
  const [mx, setMx] = useState("50%");
  const [my, setMy] = useState("50%");
  const cardRef = useRef<HTMLDivElement>(null);
  const { isAuthenticated } = useAuthStore();

  useEffect(() => {
    if (isAuthenticated) {
      favoriteApi.check(tool.id).then((res) => {
        const d = res.data?.data;
        setFavorited(!!d?.is_favorite || !!d?.favorited || d === true);
      }).catch(() => setFavorited(isFavorite(tool.id)));
    } else { setFavorited(isFavorite(tool.id)); }
  }, [tool.id, isAuthenticated]);

  useEffect(() => {
    const h = () => { if (!isAuthenticated) setFavorited(isFavorite(tool.id)); };
    window.addEventListener("storage", h);
    window.addEventListener("favorites-changed", h);
    return () => { window.removeEventListener("storage", h); window.removeEventListener("favorites-changed", h); };
  }, [tool.id, isAuthenticated]);

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    setMx(`${e.clientX - rect.left}px`);
    setMy(`${e.clientY - rect.top}px`);
  };

  const handleToggleFavorite = useCallback(async (e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation();
    if (favoriteLoading) return;
    setFavoriteLoading(true);
    try {
      if (isAuthenticated) { favorited ? await favoriteApi.remove(tool.id) : await favoriteApi.add(tool.id); }
      else { favorited ? removeFavorite(tool.id) : addFavorite(tool.id); }
      setFavorited(!favorited);
      window.dispatchEvent(new Event("favorites-changed"));
    } catch (err) { console.error("Failed to toggle favorite:", err); }
    finally { setFavoriteLoading(false); }
  }, [favorited, tool.id, isAuthenticated, favoriteLoading]);

  const platformInfo = PLATFORM_MAP[tool.platform] || PLATFORM_MAP.general;
  const typeLabel = TOOL_TYPE_MAP[tool.type] || tool.type;

  const renderStars = (score: number) => {
    const stars = [];
    const full = Math.floor(score);
    const half = score - full >= 0.5;
    for (let i = 0; i < 5; i++) {
      if (i < full) stars.push(<Star key={i} className="w-3 h-3 fill-amber-400 text-amber-400" />);
      else if (i === full && half) stars.push(<Star key={i} className="w-3 h-3 fill-amber-400/50 text-amber-400" />);
      else stars.push(<Star key={i} className="w-3 h-3" style={{ color: "var(--text-lo)", opacity: 0.3 }} />);
    }
    return stars;
  };

  return (
    <Link href={`/tools/${tool.id}`} className="block">
      <div ref={cardRef} onMouseMove={handleMouseMove} className="group relative rounded-2xl overflow-hidden cursor-pointer transition-all duration-[500ms] hover:-translate-y-2" style={{ background: "var(--glass)", border: "1px solid var(--glass-border)", backdropFilter: "blur(20px)" }}>
        {/* Holographic border */}
        <div className="absolute inset-[-1px] rounded-[17px] z-[-1] opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" style={{ background: "conic-gradient(from 0deg, transparent 0%, var(--holo-1) 10%, transparent 20%, var(--holo-2) 40%, transparent 50%, var(--holo-3) 70%, transparent 80%)", animation: "holoShimmer 4s linear infinite" }} />
        {/* Mouse tracking light */}
        <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" style={{ background: `radial-gradient(400px circle at ${mx} ${my}, rgba(0,240,255,0.06), transparent 40%)` }} />
        {/* Flow dots */}
        <div className="absolute top-0 right-0 w-[60px] h-[60px] pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="absolute w-[3px] h-[3px] rounded-full" style={{ background: "var(--cyan)", top: `${10 + i * 10}px`, right: `${20 + ((i % 2) * 15)}px`, animation: `flow-dot 2s infinite`, animationDelay: `${i * 0.3}s` }} />
          ))}
        </div>

        <div className="relative z-[1] p-6">
          {/* Top: badges + fav */}
          <div className="flex justify-between items-start mb-3">
            <div className="flex gap-1.5 flex-wrap">
              <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold" style={{ background: "rgba(0,240,255,0.08)", color: "var(--cyan)", border: "1px solid rgba(0,240,255,0.12)" }}>{typeLabel}</span>
              <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold" style={{ background: "rgba(139,92,246,0.08)", color: "var(--violet)", border: "1px solid rgba(139,92,246,0.12)" }}>{platformInfo.name}</span>
            </div>
            <button onClick={handleToggleFavorite} disabled={favoriteLoading} className="w-8 h-8 rounded-lg flex items-center justify-center text-sm cursor-pointer transition-all shrink-0" style={{ border: "1px solid rgba(255,255,255,0.05)", background: "rgba(255,255,255,0.02)", color: favorited ? "var(--magenta)" : "var(--text-lo)" }} aria-label={favorited ? "取消收藏" : "收藏"}>
              {favoriteLoading ? "..." : favorited ? "♥" : "♡"}
            </button>
          </div>

          {/* Name */}
          <h3 className="text-lg font-extrabold tracking-tight mb-2 transition-colors group-hover:text-[var(--cyan)]" style={{ textShadow: "none" }}>{tool.name}</h3>

          {/* Description */}
          <p className="text-sm mb-3 line-clamp-2" style={{ color: "var(--text-mid)", lineHeight: "1.6" }}>{truncateText(tool.description, 100)}</p>

          {/* Tags */}
          {tool.tags.length > 0 && (
            <div className="flex gap-1.5 flex-wrap mb-3">
              {tool.tags.slice(0, 4).map((tag) => (
                <span key={tag} className="px-2 py-0.5 rounded text-[11px] transition-all group-hover:border-[rgba(0,240,255,0.08)]" style={{ background: "rgba(255,255,255,0.02)", color: "var(--text-lo)", border: "1px solid rgba(255,255,255,0.04)" }}>{tag}</span>
              ))}
            </div>
          )}

          {/* Meta */}
          <div className="flex gap-3 items-center text-xs mb-3" style={{ color: "var(--text-lo)" }}>
            <span className="flex items-center gap-1">👤 {tool.author || "unknown"}</span>
            <span>·</span>
            <span>{platformInfo.name}</span>
          </div>

          {/* Divider */}
          <div className="h-[1px] mb-3" style={{ background: "linear-gradient(90deg, transparent, rgba(0,240,255,0.08), transparent)" }} />

          {/* Bottom: rating + stats */}
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-1.5">
              <div className="flex gap-0.5">{renderStars(Number(tool.rating?.score) || 0)}</div>
              <span className="text-sm font-bold" style={{ color: "var(--cyan)" }}>{(Number(tool.rating?.score) || 0).toFixed(1)}</span>
              <span className="text-[11px]" style={{ color: "var(--text-lo)" }}>({formatNumber(tool.rating?.count || 0)})</span>
            </div>
            <div className="flex gap-2.5">
              <span className="text-[11px] flex items-center gap-1" style={{ color: "var(--text-lo)" }}>⭐ {formatNumber(tool.usageCount)}</span>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}
