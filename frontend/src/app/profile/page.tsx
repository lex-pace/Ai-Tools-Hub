"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  User, Mail, Calendar, LogOut, Heart, Star, Settings,
  Shield, Loader2, ArrowLeft, Sparkles, Clock,
} from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import ToolCard from "@/components/home/ToolCard";
import { favoriteApi } from "@/lib/api";
import type { Tool } from "@/lib/types";

function mapToolFromApi(item: any): Tool {
  return {
    id: item.id,
    name: item.name,
    description: item.description || "",
    detail: item.detail || "",
    type: item.tool_type || item.type || "tool",
    platform: item.platforms?.[0] || "general",
    category: item.category || { id: "", name: "", slug: "" },
    tags: item.tags || [],
    author: item.author || "",
    rating: { score: Number(item.quality_score) || 0, count: 0 },
    usageCount: item.usage_count || 0,
    favoriteCount: item.favorite_count || 0,
    isFeatured: item.is_featured || false,
    content: item.content || "",
    createdAt: item.created_at || "",
    updatedAt: item.updated_at || "",
  };
}

export default function ProfilePage() {
  const router = useRouter();
  const { user, isAuthenticated, loading: authLoading, checkAuth, logout } = useAuthStore();
  const [favorites, setFavorites] = useState<Tool[]>([]);
  const [favLoading, setFavLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"info" | "favorites">("info");

  useEffect(() => { checkAuth(); }, [checkAuth]);

  const loadFavorites = useCallback(async () => {
    setFavLoading(true);
    try {
      const res = await favoriteApi.getList(1, 6);
      const body = res.data;
      const items = Array.isArray(body?.data) ? body.data : [];
      setFavorites(items.map(mapToolFromApi));
    } catch (err) {
      console.error("Failed to load favorites:", err);
    } finally {
      setFavLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated && activeTab === "favorites") loadFavorites();
  }, [isAuthenticated, activeTab, loadFavorites]);

  const handleLogout = () => {
    logout();
    router.push("/");
  };

  if (authLoading) {
    return (
      <div className="max-w-[900px] mx-auto px-4 sm:px-8 py-8">
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin" style={{ color: "var(--cyan)" }} />
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return (
      <div className="max-w-[900px] mx-auto px-4 sm:px-8 py-8">
        <div className="flex flex-col items-center justify-center rounded-2xl py-20" style={{ border: "1px dashed var(--glass-border)" }}>
          <Shield className="mb-4 w-12 h-12" style={{ color: "var(--text-lo)", opacity: 0.3 }} />
          <h3 className="mb-2 text-lg font-medium">请先登录</h3>
          <p className="mb-6 text-sm" style={{ color: "var(--text-lo)" }}>登录后查看个人中心</p>
          <Link href="/login">
            <button className="neon-btn px-5 py-2.5 text-sm"><Sparkles className="w-4 h-4 inline mr-2" />去登录</button>
          </Link>
        </div>
      </div>
    );
  }

  const memberSince = user.created_at
    ? new Date(user.created_at).toLocaleDateString("zh-CN", { year: "numeric", month: "long", day: "numeric" })
    : "未知";

  return (
    <div className="max-w-[900px] mx-auto px-4 sm:px-8 py-8">
      {/* 返回 */}
      <Link href="/" className="inline-flex items-center gap-1.5 text-sm mb-6 transition-colors" style={{ color: "var(--text-lo)" }}>
        <ArrowLeft className="w-4 h-4" /> 返回首页
      </Link>

      {/* 用户卡片 */}
      <div className="rounded-2xl p-6 mb-6 relative overflow-hidden" style={{ background: "var(--glass)", border: "1px solid var(--glass-border)", backdropFilter: "blur(20px)" }}>
        <div className="absolute top-0 left-0 right-0 h-[2px]" style={{ background: "linear-gradient(90deg, var(--cyan), var(--violet), var(--cyan))" }} />
        <div className="flex items-start gap-5">
          {/* 头像 */}
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-black shrink-0" style={{ background: "linear-gradient(135deg, rgba(0,240,255,0.15), rgba(139,92,246,0.15))", border: "1px solid rgba(0,240,255,0.15)", color: "var(--cyan)" }}>
            {user.username?.charAt(0)?.toUpperCase() || "U"}
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-black tracking-tight" style={{ color: "var(--text-hi)" }}>{user.username}</h1>
            <div className="flex items-center gap-2 mt-1">
              <Mail className="w-3.5 h-3.5" style={{ color: "var(--text-lo)" }} />
              <span className="text-sm" style={{ color: "var(--text-mid)" }}>{user.email}</span>
            </div>
            <div className="flex items-center gap-4 mt-3">
              <div className="flex items-center gap-1.5 text-xs" style={{ color: "var(--text-lo)" }}>
                <Calendar className="w-3.5 h-3.5" />
                <span>注册于 {memberSince}</span>
              </div>
              {user.role && (
                <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold" style={{ background: "rgba(0,240,255,0.08)", color: "var(--cyan)", border: "1px solid rgba(0,240,255,0.12)" }}>
                  {user.role === "admin" ? "管理员" : "用户"}
                </span>
              )}
            </div>
          </div>
          <button onClick={handleLogout} className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium cursor-pointer transition-all" style={{ border: "1px solid var(--glass-border)", color: "var(--text-mid)", background: "transparent" }}>
            <LogOut className="w-3.5 h-3.5" /> 退出登录
          </button>
        </div>
      </div>

      {/* Tab 切换 */}
      <div className="flex gap-1 mb-6 p-1 rounded-xl" style={{ background: "var(--glass)", border: "1px solid var(--glass-border)" }}>
        {[
          { key: "info" as const, label: "个人信息", icon: User },
          { key: "favorites" as const, label: "我的收藏", icon: Heart },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium cursor-pointer transition-all"
            style={{
              background: activeTab === tab.key ? "rgba(0,240,255,0.1)" : "transparent",
              color: activeTab === tab.key ? "var(--cyan)" : "var(--text-mid)",
              border: activeTab === tab.key ? "1px solid rgba(0,240,255,0.15)" : "1px solid transparent",
            }}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab 内容 */}
      {activeTab === "info" ? (
        <div className="rounded-2xl p-6" style={{ background: "var(--glass)", border: "1px solid var(--glass-border)" }}>
          <h3 className="text-sm font-bold mb-4 flex items-center gap-2"><Settings className="w-4 h-4" style={{ color: "var(--cyan)" }} /> 账户信息</h3>
          <div className="space-y-4">
            {[
              { label: "用户名", value: user.username, icon: User },
              { label: "邮箱", value: user.email, icon: Mail },
              { label: "角色", value: user.role === "admin" ? "管理员" : "普通用户", icon: Shield },
              { label: "注册时间", value: memberSince, icon: Clock },
            ].map((item) => (
              <div key={item.label} className="flex items-center gap-3 py-3" style={{ borderBottom: "1px solid var(--glass-border)" }}>
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "rgba(0,240,255,0.06)" }}>
                  <item.icon className="w-4 h-4" style={{ color: "var(--cyan)" }} />
                </div>
                <div>
                  <div className="text-xs" style={{ color: "var(--text-lo)" }}>{item.label}</div>
                  <div className="text-sm font-medium" style={{ color: "var(--text-hi)" }}>{item.value}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div>
          {favLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="rounded-2xl p-6 animate-pulse" style={{ background: "var(--glass)", border: "1px solid var(--glass-border)" }}>
                  <div className="space-y-3">
                    <div className="h-5 w-20 rounded-md" style={{ background: "var(--glass-border)" }} />
                    <div className="h-4 w-full rounded" style={{ background: "var(--glass-border)" }} />
                  </div>
                </div>
              ))}
            </div>
          ) : favorites.length > 0 ? (
            <>
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm" style={{ color: "var(--text-lo)" }}>最近收藏的 {favorites.length} 个工具</span>
                <Link href="/favorites" className="text-xs font-medium" style={{ color: "var(--cyan)" }}>查看全部 →</Link>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {favorites.map((tool) => (
                  <ToolCard key={tool.id} tool={tool} />
                ))}
              </div>
            </>
          ) : (
            <div className="rounded-2xl p-12 text-center" style={{ border: "1px dashed var(--glass-border)" }}>
              <Heart className="mx-auto mb-3 w-8 h-8" style={{ color: "var(--text-lo)", opacity: 0.3 }} />
              <p className="mb-1 font-medium" style={{ color: "var(--text-mid)" }}>暂无收藏</p>
              <p className="text-sm" style={{ color: "var(--text-lo)" }}>浏览工具时点击 ❤️ 即可收藏</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
