"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRouter } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import { Search, Menu, X, LogOut, User, Heart, ChevronDown } from "lucide-react";
import { useAuthStore } from "@/store/authStore";

export default function Header() {
  const router = useRouter();
  const pathname = usePathname();
  const [searchQuery, setSearchQuery] = useState("");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const userMenuRef = useRef<HTMLDivElement>(null);

  const { isAuthenticated, user, logout, checkAuth } = useAuthStore();

  useEffect(() => {
    const saved = localStorage.getItem("theme") as "dark" | "light" | null;
    if (saved) { setTheme(saved); document.documentElement.setAttribute("data-theme", saved); }
    checkAuth().catch(() => {});
  }, []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setUserMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const toggleTheme = () => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    localStorage.setItem("theme", next);
    if (next === "light") document.documentElement.setAttribute("data-theme", "light");
    else document.documentElement.removeAttribute("data-theme");
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
      setSearchQuery("");
      setMobileMenuOpen(false);
    }
  };

  const handleLogout = () => { logout(); setUserMenuOpen(false); router.push("/"); };

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  };

  const navLinks = [
    { href: "/", label: "首页" },
    { href: "/categories", label: "分类" },
    { href: "/ranking", label: "排行榜" },
    { href: "/favorites", label: "收藏" },
  ];

  return (
    <header className="sticky top-0 z-50 h-16 flex items-center justify-between px-8" style={{ background: "var(--glass)", backdropFilter: "blur(40px) saturate(1.8)", borderBottom: "1px solid var(--glass-border)" }}>
      {/* Bottom glow line */}
      <div className="absolute bottom-0 left-0 right-0 h-[1px] animate-nav-pulse" style={{ background: "linear-gradient(90deg, transparent 5%, var(--cyan) 30%, var(--violet) 50%, var(--magenta) 70%, transparent 95%)" }} />

      {/* Logo */}
      <Link href="/" className="flex items-center gap-2.5 shrink-0">
        <div className="w-8 h-8">
          <svg viewBox="0 0 32 32" fill="none" className="w-full h-full">
            <circle cx="16" cy="16" r="14" stroke="url(#navLg)" strokeWidth="1.5" opacity="0.6" />
            <circle cx="16" cy="16" r="8" stroke="url(#navLg)" strokeWidth="1" opacity="0.4" />
            <circle cx="16" cy="16" r="3" fill="url(#navLg)" />
            <line x1="16" y1="2" x2="16" y2="8" stroke="url(#navLg)" strokeWidth="1" opacity="0.3" />
            <line x1="16" y1="24" x2="16" y2="30" stroke="url(#navLg)" strokeWidth="1" opacity="0.3" />
            <line x1="2" y1="16" x2="8" y2="16" stroke="url(#navLg)" strokeWidth="1" opacity="0.3" />
            <line x1="24" y1="16" x2="30" y2="16" stroke="url(#navLg)" strokeWidth="1" opacity="0.3" />
            <defs><linearGradient id="navLg" x1="0" y1="0" x2="32" y2="32"><stop stopColor="var(--cyan)" /><stop offset="1" stopColor="var(--violet)" /></linearGradient></defs>
          </svg>
        </div>
        <span className="text-lg font-extrabold tracking-tight neon-text">Tools Hub</span>
      </Link>

      {/* Desktop Nav */}
      <nav className="hidden md:flex items-center gap-1">
        {navLinks.map((link) => {
          const active = isActive(link.href);
          return (
            <Link key={link.href} href={link.href}
              className="relative px-4 py-2 text-sm font-medium transition-all duration-300"
              style={{ color: active ? "var(--cyan)" : "var(--text-mid)" }}
            >
              {link.label}
              {/* 激活态下划线 */}
              {active && (
                <span className="absolute bottom-0 left-3 right-3 h-[2px] rounded-full" style={{ background: "linear-gradient(90deg, var(--cyan), var(--violet))", animation: "navUnderline 0.3s ease-out" }} />
              )}
              {/* hover 发光效果 */}
              <span className="absolute inset-0 rounded-lg opacity-0 hover:opacity-100 transition-opacity duration-300 pointer-events-none" style={{ background: active ? "rgba(0,240,255,0.06)" : "transparent" }} />
            </Link>
          );
        })}
      </nav>

      {/* Right side */}
      <div className="flex items-center gap-3">
        {/* Theme toggle */}
        <button onClick={toggleTheme} className="w-8 h-8 rounded-lg flex items-center justify-center text-sm cursor-pointer transition-all hover:rotate-15 hover:scale-105" style={{ border: "1px solid var(--glass-border)", background: "var(--glass)", backdropFilter: "blur(10px)" }} title="切换主题">
          {theme === "dark" ? "🌙" : "☀️"}
        </button>

        {/* Status */}
        <div className="hidden sm:flex items-center gap-1.5 text-xs" style={{ color: "var(--emerald)" }}>
          <span className="w-1.5 h-1.5 rounded-full" style={{ background: "var(--emerald)", animation: "statusPulse 2s infinite" }} />
          Online
        </div>

        {/* Desktop: Search + User */}
        <div className="hidden md:flex items-center gap-3">
          <form onSubmit={handleSearch} className="flex items-center">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: "var(--text-lo)" }} />
              <input
                type="text" placeholder="搜索 AI 工具..." value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-4 py-2 rounded-lg text-sm outline-none w-48 focus:w-64 transition-all"
                style={{ background: "var(--glass)", border: "1px solid var(--glass-border)", color: "var(--text-hi)", backdropFilter: "blur(10px)" }}
              />
            </div>
          </form>

          {isAuthenticated && user ? (
            <div className="relative" ref={userMenuRef}>
              <button onClick={() => setUserMenuOpen(!userMenuOpen)} className="flex items-center gap-2 px-2 py-1.5 rounded-lg transition-colors hover:bg-white/5">
                <div className="w-8 h-8 rounded-full neon-text" style={{ border: "2px solid transparent" }} />
                <span className="text-sm font-medium max-w-[80px] truncate" style={{ color: "var(--text-hi)" }}>{user.username}</span>
                <ChevronDown className={`h-4 w-4 transition-transform ${userMenuOpen ? "rotate-180" : ""}`} style={{ color: "var(--text-lo)" }} />
              </button>
              {userMenuOpen && (
                <div className="absolute right-0 top-full mt-1 w-48 rounded-xl p-1 shadow-xl" style={{ background: "var(--glass)", border: "1px solid var(--glass-border)", backdropFilter: "blur(20px)" }}>
                  <div className="px-3 py-2 mb-1" style={{ borderBottom: "1px solid var(--glass-border)" }}>
                    <p className="text-sm font-medium truncate" style={{ color: "var(--text-hi)" }}>{user.username}</p>
                    <p className="text-xs truncate" style={{ color: "var(--text-lo)" }}>{user.email}</p>
                  </div>
                  <Link href="/profile" onClick={() => setUserMenuOpen(false)}>
                    <button className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors hover:bg-white/5" style={{ color: "var(--text-mid)" }}><User className="h-4 w-4" />个人信息</button>
                  </Link>
                  <Link href="/favorites" onClick={() => setUserMenuOpen(false)}>
                    <button className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors hover:bg-white/5" style={{ color: "var(--text-mid)" }}><Heart className="h-4 w-4" />我的收藏</button>
                  </Link>
                  <div className="mt-1 pt-1" style={{ borderTop: "1px solid var(--glass-border)" }}>
                    <button onClick={handleLogout} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors hover:bg-red-500/10" style={{ color: "var(--magenta)" }}><LogOut className="h-4 w-4" />退出登录</button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link href="/login"><button className="px-3 py-1.5 rounded-lg text-sm font-medium transition-colors hover:bg-white/5" style={{ color: "var(--text-mid)" }}>登录</button></Link>
              <Link href="/register"><button className="neon-btn px-4 py-1.5 text-sm">注册</button></Link>
            </div>
          )}
        </div>

        {/* Mobile menu button */}
        <button className="md:hidden p-2" onClick={() => setMobileMenuOpen(!mobileMenuOpen)} style={{ color: "var(--text-mid)" }}>
          {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div className="absolute top-16 left-0 right-0 md:hidden border-t" style={{ background: "var(--bg-void)", borderBottom: "1px solid var(--glass-border)", zIndex: 60 }}>
          <div className="p-4 space-y-3">
            <form onSubmit={handleSearch}>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: "var(--text-lo)" }} />
                <input type="text" placeholder="搜索 AI 工具..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-9 pr-4 py-2.5 rounded-lg text-sm outline-none" style={{ background: "var(--glass)", border: "1px solid var(--glass-border)", color: "var(--text-hi)" }} />
              </div>
            </form>
            <nav className="flex flex-col gap-1">
              {navLinks.map((link) => (
                <Link key={link.href} href={link.href} onClick={() => setMobileMenuOpen(false)}>
                  <button className="w-full text-left px-3 py-2 rounded-lg text-sm transition-colors hover:bg-white/5" style={{ color: "var(--text-mid)" }}>{link.label}</button>
                </Link>
              ))}
            </nav>
            <div className="pt-3" style={{ borderTop: "1px solid var(--glass-border)" }}>
              {isAuthenticated && user ? (
                <div className="space-y-1">
                  <div className="flex items-center gap-3 px-3 py-2">
                    <div className="w-8 h-8 rounded-full neon-text" />
                    <div className="min-w-0"><p className="text-sm font-medium truncate" style={{ color: "var(--text-hi)" }}>{user.username}</p></div>
                  </div>
                  <button onClick={() => { handleLogout(); setMobileMenuOpen(false); }} className="w-full text-left px-3 py-2 rounded-lg text-sm transition-colors hover:bg-red-500/10" style={{ color: "var(--magenta)" }}><LogOut className="h-4 w-4 inline mr-2" />退出登录</button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <Link href="/login" className="flex-1" onClick={() => setMobileMenuOpen(false)}><button className="w-full py-2 rounded-lg text-sm" style={{ border: "1px solid var(--glass-border)", color: "var(--text-mid)" }}>登录</button></Link>
                  <Link href="/register" className="flex-1" onClick={() => setMobileMenuOpen(false)}><button className="neon-btn w-full py-2 text-sm">注册</button></Link>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
