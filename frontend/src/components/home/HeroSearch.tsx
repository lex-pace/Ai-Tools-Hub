"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

const THOUGHTS = ["MCP Server", "AI Agent", "RAG Pipeline", "Code Gen", "Embedding"];
const PLACEHOLDER_TEXTS = ["搜索 AI 工具、MCP Server、Agent...", "搜索 LangChain、LlamaIndex...", "搜索 Stable Diffusion、ComfyUI...", "搜索 AutoGen、CrewAI..."];

function CounterAnimation({ target, suffix = "" }: { target: number; suffix?: string }) {
  const [value, setValue] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const hasAnimated = useRef(false);

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !hasAnimated.current) {
        hasAnimated.current = true;
        let current = 0;
        const increment = target / 60;
        const timer = setInterval(() => {
          current += increment;
          if (current >= target) { current = target; clearInterval(timer); }
          setValue(Math.floor(current));
        }, 16);
      }
    }, { threshold: 0.5 });
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [target]);

  return <div ref={ref}>{value.toLocaleString()}{suffix}</div>;
}

export default function HeroSearch() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [placeholderIdx, setPlaceholderIdx] = useState(0);
  const [displayedPlaceholder, setDisplayedPlaceholder] = useState("");
  const [isTyping, setIsTyping] = useState(true);
  const inputRef = useRef<HTMLInputElement>(null);

  // 打字机效果循环切换 placeholder
  useEffect(() => {
    const currentText = PLACEHOLDER_TEXTS[placeholderIdx];
    let charIndex = 0;
    let deleting = false;
    let timeout: NodeJS.Timeout;

    function tick() {
      if (!deleting) {
        charIndex++;
        setDisplayedPlaceholder(currentText.slice(0, charIndex));
        if (charIndex >= currentText.length) {
          deleting = true;
          timeout = setTimeout(tick, 2000); // 停顿 2 秒
          return;
        }
        timeout = setTimeout(tick, 80 + Math.random() * 40);
      } else {
        charIndex--;
        setDisplayedPlaceholder(currentText.slice(0, charIndex));
        if (charIndex <= 0) {
          deleting = false;
          setPlaceholderIdx((prev) => (prev + 1) % PLACEHOLDER_TEXTS.length);
          timeout = setTimeout(tick, 300);
          return;
        }
        timeout = setTimeout(tick, 40);
      }
    }
    tick();
    return () => clearTimeout(timeout);
  }, [placeholderIdx]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) router.push(`/search?q=${encodeURIComponent(query.trim())}`);
  };

  return (
    <section className="relative px-8 pt-20 pb-12 text-center overflow-hidden">
      {/* Aura */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] pointer-events-none" style={{ background: "radial-gradient(circle, rgba(0,240,255,0.06) 0%, rgba(139,92,246,0.03) 40%, transparent 70%)", animation: "nebulaDrift1 20s linear infinite" }} />

      {/* Chip */}
      <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full text-xs mb-6 animate-chip-float" style={{ background: "rgba(0,240,255,0.06)", border: "1px solid rgba(0,240,255,0.12)", color: "var(--cyan)" }}>
        <span className="w-5 h-5 rounded-full flex items-center justify-center text-[10px]" style={{ background: "linear-gradient(135deg, var(--cyan), var(--violet))" }}>⚡</span>
        Powered by AI — 已收录 500+ 工具
      </div>

      {/* Title */}
      <h1 className="text-5xl md:text-6xl font-black tracking-tight leading-tight mb-4">
        <span className="block" style={{ color: "var(--text-hi)" }}>发现你的下一个</span>
        <span className="block" style={{ background: "linear-gradient(135deg, var(--cyan) 0%, var(--violet) 50%, var(--magenta) 100%)", backgroundSize: "200% 200%", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text", animation: "gradient-shift 6s ease infinite" }}>AI 超能力</span>
      </h1>

      <p className="mx-auto max-w-lg text-base mb-10" style={{ color: "var(--text-mid)", lineHeight: "1.7" }}>
        跨生态系统的 AI 工具搜索引擎 — 发现 MCP Server、AI Agent、RAG 工具等最前沿的智能工具
      </p>

      {/* Search Terminal — 跑马灯边框 */}
      <form onSubmit={handleSearch} className="mx-auto max-w-[640px] mb-5">
        <div className="relative rounded-2xl overflow-hidden p-[2px]" style={{ background: "linear-gradient(90deg, var(--cyan), var(--violet), var(--magenta), var(--cyan))", backgroundSize: "200% 100%", animation: "borderMarquee 4s linear infinite" }}>
          <div className="relative rounded-[14px] overflow-hidden" style={{ background: "var(--search-bg, rgba(6,6,15,0.8))", boxShadow: "0 0 0 1px rgba(0,240,255,0.05), 0 4px 40px var(--card-shadow, rgba(0,0,0,0.5)), 0 0 80px rgba(0,240,255,0.04)" }}>
            {/* Top gradient line */}
            <div className="absolute top-0 left-0 right-0 h-[1px]" style={{ background: "linear-gradient(90deg, transparent, var(--cyan), var(--violet), transparent)", opacity: 0.5 }} />
            {/* Holographic shimmer */}
            <div className="absolute inset-0 rounded-[14px] pointer-events-none" style={{ background: "linear-gradient(135deg, transparent 30%, rgba(0,240,255,0.03) 45%, rgba(139,92,246,0.03) 55%, transparent 70%)", backgroundSize: "300% 300%", animation: "holoShimmer 6s ease infinite" }} />
            <div className="relative z-[1] flex items-center">
              <span className="pl-5 font-mono text-sm opacity-60 select-none" style={{ color: "var(--cyan)" }}>❯</span>
              <input
                ref={inputRef}
                type="text"
                placeholder={query ? "" : displayedPlaceholder}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onFocus={() => setIsTyping(false)}
                onBlur={() => setIsTyping(true)}
                className="flex-1 px-4 py-4 bg-transparent text-base outline-none"
                style={{ color: "var(--text-hi)", caretColor: "var(--cyan)" }}
              />
              {/* 打字光标（无输入时显示） */}
              {!query && (
                <span className="absolute pointer-events-none text-base" style={{ color: "var(--cyan)", animation: "cursorBlink 1s step-end infinite", left: "calc(2.5rem + 1rem + var(--placeholder-width, 0px))" }}>│</span>
              )}
              <button type="submit" className="neon-btn mx-2 my-2 px-6 py-2.5 text-sm">搜索</button>
            </div>
          </div>
        </div>
      </form>

      {/* Thought bubbles */}
      <div className="relative h-10 max-w-[640px] mx-auto">
        {THOUGHTS.map((t, i) => (
          <button key={t} onClick={() => router.push(`/search?q=${encodeURIComponent(t)}`)}
            className="absolute px-3 py-1 rounded-full text-xs whitespace-nowrap cursor-pointer transition-all hover:scale-105"
            style={{ left: `${i * 20}%`, background: "var(--glass)", border: "1px solid var(--glass-border)", color: "var(--text-mid)", backdropFilter: "blur(10px)", animation: `thought-float 8s ease-in-out infinite`, animationDelay: `${-i * 1.5}s` }}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Live stats */}
      <div className="flex justify-center gap-12 mt-10 py-6">
        {[
          { target: 527, label: "Tools" },
          { target: 48, label: "Categories" },
          { target: 12, label: "Ecosystems" },
          { target: 8923, label: "Users" },
        ].map((stat, i) => (
          <div key={stat.label} className="text-center relative">
            <div className="text-2xl font-black tabular-nums neon-text"><CounterAnimation target={stat.target} /></div>
            <div className="text-[10px] uppercase tracking-widest mt-0.5" style={{ color: "var(--text-lo)" }}>{stat.label}</div>
            {i < 3 && <div className="absolute right-[-1.5rem] top-1/2 -translate-y-1/2 w-[1px] h-8" style={{ background: "linear-gradient(180deg, transparent, rgba(0,240,255,0.15), transparent)" }} />}
          </div>
        ))}
      </div>
    </section>
  );
}
