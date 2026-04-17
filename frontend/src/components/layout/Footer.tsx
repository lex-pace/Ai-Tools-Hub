import Link from "next/link";

export default function Footer() {
  return (
    <footer className="relative mt-12" style={{ borderTop: "1px solid var(--glass-border)" }}>
      <div className="absolute top-0 left-0 right-0 h-[1px]" style={{ background: "linear-gradient(90deg, transparent 10%, var(--cyan) 30%, var(--violet) 50%, var(--magenta) 70%, transparent 90%)", opacity: 0.2 }} />
      <div className="max-w-[1200px] mx-auto px-8 py-10">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div>
            <div className="text-lg font-extrabold neon-text mb-2">AI Tools Hub</div>
            <p className="text-sm" style={{ color: "var(--text-lo)", lineHeight: "1.6" }}>跨生态系统的 AI 工具搜索聚合平台，发现最适合你的智能工具。</p>
          </div>
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: "var(--text-mid)" }}>产品</div>
            <nav className="flex flex-col gap-1.5">
              {[
                { href: "/search", label: "探索" },
                { href: "/categories", label: "分类" },
                { href: "/ranking", label: "排行榜" },
              ].map((l) => (
                <Link key={l.href} href={l.href} className="text-sm transition-all hover:translate-x-1" style={{ color: "var(--text-lo)" }}>{l.label}</Link>
              ))}
            </nav>
          </div>
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: "var(--text-mid)" }}>资源</div>
            <nav className="flex flex-col gap-1.5">
              <a href="#" className="text-sm transition-all hover:translate-x-1" style={{ color: "var(--text-lo)" }}>API 文档</a>
              <a href="#" className="text-sm transition-all hover:translate-x-1" style={{ color: "var(--text-lo)" }}>GitHub</a>
            </nav>
          </div>
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: "var(--text-mid)" }}>关于</div>
            <nav className="flex flex-col gap-1.5">
              <a href="#" className="text-sm transition-all hover:translate-x-1" style={{ color: "var(--text-lo)" }}>关于我们</a>
              <a href="#" className="text-sm transition-all hover:translate-x-1" style={{ color: "var(--text-lo)" }}>联系方式</a>
            </nav>
          </div>
        </div>
        <div className="mt-8 pt-6 text-center text-xs" style={{ borderTop: "1px solid var(--glass-border)", color: "var(--text-lo)" }}>
          © {new Date().getFullYear()} AI Tools Hub. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
