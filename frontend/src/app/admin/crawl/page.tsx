"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Loader2,
  AlertCircle,
  Play,
  Plus,
  Search,
  RefreshCw,
  Eye,
  Trash2,
  X,
  Zap,
  Database,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { crawlApi } from "@/lib/api";

// ── 类型定义 ──────────────────────────────────────

interface CrawlTaskItem {
  id: string;
  name: string;
  source_type: string;
  source_config: Record<string, unknown>;
  schedule: string | null;
  status: string;
  last_run_at: string | null;
  last_result: Record<string, unknown> | null;
  created_at: string;
}

interface QuickCrawlResult {
  success: boolean;
  message: string;
  created: number;
  updated: number;
  total: number;
}

interface FullCrawlResult {
  success: boolean;
  message: string;
  queries: number;
  total_created: number;
  total_updated: number;
  total_skipped: number;
  details: Array<{ query: string; created: number; updated: number; skipped: number }>;
}

// ── 常量 ──────────────────────────────────────────

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  active: { label: "活跃", color: "bg-green-100 text-green-700" },
  paused: { label: "暂停", color: "bg-yellow-100 text-yellow-700" },
  disabled: { label: "禁用", color: "bg-gray-100 text-gray-700" },
  running: { label: "运行中", color: "bg-blue-100 text-blue-700" },
};

const SCHEDULE_MAP: Record<string, string> = {
  manual: "手动执行",
  daily: "每天",
  weekly: "每周",
};

const SOURCE_MAP: Record<string, string> = {
  github: "GitHub",
  gitee: "Gitee",
};

// ── Spinner 组件 ──────────────────────────────────

function Spinner({ className = "" }: { className?: string }) {
  return <Loader2 className={`h-4 w-4 animate-spin ${className}`} />;
}

// ── 模态框组件 ────────────────────────────────────

function Modal({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* 遮罩 */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />
      {/* 内容 */}
      <div className="relative z-10 w-full max-w-lg rounded-lg border bg-white p-6 shadow-xl mx-4 max-h-[90vh] overflow-y-auto">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">{title}</h2>
          <button
            onClick={onClose}
            className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

// ── 主页面 ────────────────────────────────────────

export default function CrawlManagePage() {
  // 任务列表状态
  const [tasks, setTasks] = useState<CrawlTaskItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);

  // 对话框状态
  const [quickDialogOpen, setQuickDialogOpen] = useState(false);
  const [fullDialogOpen, setFullDialogOpen] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);

  // 快速采集状态
  const [quickQuery, setQuickQuery] = useState("mcp server");
  const [quickSource, setQuickSource] = useState("github");
  const [quickMaxItems, setQuickMaxItems] = useState(30);
  const [quickLoading, setQuickLoading] = useState(false);
  const [quickResult, setQuickResult] = useState<QuickCrawlResult | null>(null);

  // 全量采集状态
  const [fullSource, setFullSource] = useState("github");
  const [fullMaxItems, setFullMaxItems] = useState(30);
  const [fullLoading, setFullLoading] = useState(false);
  const [fullResult, setFullResult] = useState<FullCrawlResult | null>(null);

  // 创建任务状态
  const [createForm, setCreateForm] = useState({
    name: "",
    source_type: "github",
    query: "mcp server",
    sort: "stars",
    per_page: 30,
    schedule: "manual",
  });
  const [createLoading, setCreateLoading] = useState(false);

  // 任务详情状态
  const [detailTask, setDetailTask] = useState<CrawlTaskItem | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // 执行任务状态
  const [runningTaskId, setRunningTaskId] = useState<string | null>(null);

  // ── 加载任务列表 ──────────────────────────────

  const loadTasks = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await crawlApi.getCrawlTasks({
        status: statusFilter || undefined,
        page,
        size: pageSize,
      });
      // 后端直接返回数组（List[CrawlTaskOut]）
      const data = res.data?.data ?? res.data;
      setTasks(Array.isArray(data) ? data : []);
    } catch (err: unknown) {
      console.error("加载任务列表失败:", err);
      setError(err instanceof Error ? err.message : "加载任务列表失败");
    } finally {
      setLoading(false);
    }
  }, [statusFilter, page, pageSize]);

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  // ── 快速采集 ──────────────────────────────────

  const handleQuickCrawl = async () => {
    setQuickLoading(true);
    setQuickResult(null);
    try {
      const res = await crawlApi.quickCrawl({
        query: quickQuery,
        source: quickSource,
        max_items: quickMaxItems,
      });
      const data = res.data?.data ?? res.data;
      setQuickResult(data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "快速采集失败";
      alert(`错误: ${msg}`);
    } finally {
      setQuickLoading(false);
    }
  };

  // ── 全量采集 ──────────────────────────────────

  const handleFullCrawl = async () => {
    setFullLoading(true);
    setFullResult(null);
    try {
      const res = await crawlApi.fullCrawl(fullSource, fullMaxItems);
      const data = res.data?.data ?? res.data;
      setFullResult(data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "全量采集失败";
      alert(`错误: ${msg}`);
    } finally {
      setFullLoading(false);
    }
  };

  // ── 创建任务 ──────────────────────────────────

  const handleCreateTask = async () => {
    if (!createForm.name.trim()) {
      alert("请输入任务名称");
      return;
    }
    setCreateLoading(true);
    try {
      await crawlApi.createCrawlTask({
        name: createForm.name,
        source_type: createForm.source_type,
        source_config: {
          query: createForm.query,
          sort: createForm.sort,
          per_page: createForm.per_page,
        },
        schedule: createForm.schedule,
      });
      alert("任务创建成功");
      setCreateDialogOpen(false);
      setCreateForm({
        name: "",
        source_type: "github",
        query: "mcp server",
        sort: "stars",
        per_page: 30,
        schedule: "manual",
      });
      loadTasks();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "创建任务失败";
      alert(`错误: ${msg}`);
    } finally {
      setCreateLoading(false);
    }
  };

  // ── 执行任务 ──────────────────────────────────

  const handleRunTask = async (taskId: string) => {
    if (!confirm("确认执行此采集任务？")) return;
    setRunningTaskId(taskId);
    try {
      const res = await crawlApi.runCrawlTask(taskId);
      const data = res.data?.data ?? res.data;
      alert(`执行完成: ${data?.message || "成功"}`);
      loadTasks();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "执行任务失败";
      alert(`错误: ${msg}`);
    } finally {
      setRunningTaskId(null);
    }
  };

  // ── 查看详情 ──────────────────────────────────

  const handleViewDetail = async (taskId: string) => {
    setDetailLoading(true);
    setDetailDialogOpen(true);
    setDetailTask(null);
    try {
      const res = await crawlApi.getCrawlTask(taskId);
      const data = res.data?.data ?? res.data;
      setDetailTask(data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "获取任务详情失败";
      alert(`错误: ${msg}`);
      setDetailDialogOpen(false);
    } finally {
      setDetailLoading(false);
    }
  };

  // ── 删除任务（前端模拟，后端暂无删除接口） ────

  const handleDeleteTask = (taskId: string) => {
    if (!confirm("确认删除此采集任务？此操作不可撤销。")) return;
    // 后端暂无删除接口，前端提示
    alert("暂不支持删除操作，后端接口待实现");
  };

  // ── 格式化时间 ────────────────────────────────

  function formatTime(dateStr: string | null): string {
    if (!dateStr) return "-";
    try {
      const d = new Date(dateStr);
      return d.toLocaleString("zh-CN", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return dateStr;
    }
  }

  // ── 渲染 ──────────────────────────────────────

  return (
    <div className="container py-8">
      {/* 页面标题 */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">采集任务管理</h1>
        <p className="mt-2 text-muted-foreground">
          管理数据采集任务，支持快速采集、全量采集和定时任务
        </p>
      </div>

      {/* 操作按钮区 */}
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <Button onClick={() => setQuickDialogOpen(true)}>
          <Zap className="mr-2 h-4 w-4" />
          快速采集
        </Button>
        <Button variant="outline" onClick={() => setFullDialogOpen(true)}>
          <Database className="mr-2 h-4 w-4" />
          全量采集
        </Button>
        <Button variant="outline" onClick={() => setCreateDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          创建任务
        </Button>
        <div className="ml-auto">
          <Button variant="ghost" size="sm" onClick={loadTasks} disabled={loading}>
            <RefreshCw className={`mr-1.5 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            刷新
          </Button>
        </div>
      </div>

      {/* 状态筛选 */}
      <div className="mb-4 flex items-center gap-2">
        <span className="text-sm text-muted-foreground">状态筛选:</span>
        {["", "active", "paused", "disabled"].map((s) => (
          <button
            key={s}
            onClick={() => {
              setStatusFilter(s);
              setPage(1);
            }}
            className={`rounded-md px-3 py-1 text-sm transition-colors ${
              statusFilter === s
                ? "bg-blue-600 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            {s === "" ? "全部" : STATUS_MAP[s]?.label || s}
          </button>
        ))}
      </div>

      {/* 任务列表 */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <Spinner className="mb-4 h-8 w-8 text-muted-foreground" />
          <p className="text-muted-foreground">加载任务列表...</p>
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16">
          <AlertCircle className="mb-3 h-8 w-8 text-muted-foreground" />
          <p className="text-muted-foreground mb-3">{error}</p>
          <Button variant="outline" size="sm" onClick={loadTasks}>
            重新加载
          </Button>
        </div>
      ) : tasks.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-20">
          <Search className="mb-4 h-12 w-12 text-muted-foreground/30" />
          <h3 className="mb-2 text-lg font-medium">暂无采集任务</h3>
          <p className="mb-6 text-sm text-muted-foreground">
            点击上方按钮创建新的采集任务
          </p>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-gray-50">
                  <th className="px-4 py-3 text-left font-medium text-gray-600">任务名称</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">采集源</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">状态</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">调度</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">上次执行</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">上次结果</th>
                  <th className="px-4 py-3 text-right font-medium text-gray-600">操作</th>
                </tr>
              </thead>
              <tbody>
                {tasks.map((task, idx) => {
                  const statusInfo = STATUS_MAP[task.status] || {
                    label: task.status,
                    color: "bg-gray-100 text-gray-700",
                  };
                  const lastResult = task.last_result as Record<string, unknown> | null;

                  return (
                    <tr
                      key={task.id}
                      className={`border-b transition-colors hover:bg-gray-50 ${
                        idx % 2 === 1 ? "bg-gray-50/50" : ""
                      }`}
                    >
                      {/* 任务名称 */}
                      <td className="px-4 py-3">
                        <div className="font-medium">{task.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {task.source_config?.query
                            ? String(task.source_config.query)
                            : "-"}
                        </div>
                      </td>

                      {/* 采集源 */}
                      <td className="px-4 py-3">
                        <Badge variant="outline">
                          {SOURCE_MAP[task.source_type] || task.source_type}
                        </Badge>
                      </td>

                      {/* 状态 */}
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${statusInfo.color}`}
                        >
                          {statusInfo.label}
                        </span>
                      </td>

                      {/* 调度 */}
                      <td className="px-4 py-3 text-muted-foreground">
                        {SCHEDULE_MAP[task.schedule || ""] || task.schedule || "手动"}
                      </td>

                      {/* 上次执行 */}
                      <td className="px-4 py-3 text-muted-foreground">
                        {formatTime(task.last_run_at)}
                      </td>

                      {/* 上次结果 */}
                      <td className="px-4 py-3">
                        {lastResult ? (
                          <div className="text-xs">
                            {lastResult.success ? (
                              <span className="text-green-600">
                                新增 {Number(lastResult.created ?? 0)} / 更新{" "}
                                {Number(lastResult.updated ?? 0)}
                              </span>
                            ) : (
                              <span className="text-red-600">
                                {String(lastResult.message || "失败")}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">-</span>
                        )}
                      </td>

                      {/* 操作 */}
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRunTask(task.id)}
                            disabled={runningTaskId === task.id}
                            title="执行"
                          >
                            {runningTaskId === task.id ? (
                              <Spinner />
                            ) : (
                              <Play className="h-4 w-4" />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleViewDetail(task.id)}
                            title="详情"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-muted-foreground hover:text-destructive"
                            onClick={() => handleDeleteTask(task.id)}
                            title="删除"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* 分页 */}
          <div className="mt-4 flex items-center justify-between">
            <span className="text-sm text-muted-foreground">
              共 {tasks.length} 条记录
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                <ChevronLeft className="h-4 w-4" />
                上一页
              </Button>
              <span className="text-sm text-muted-foreground">
                第 {page} 页
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={tasks.length < pageSize}
                onClick={() => setPage((p) => p + 1)}
              >
                下一页
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </>
      )}

      {/* ── 快速采集对话框 ────────────────────── */}
      <Modal
        open={quickDialogOpen}
        onClose={() => {
          setQuickDialogOpen(false);
          setQuickResult(null);
        }}
        title="快速采集"
      >
        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium">搜索关键词</label>
            <Input
              value={quickQuery}
              onChange={(e) => setQuickQuery(e.target.value)}
              placeholder="例如: mcp server"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium">采集源</label>
            <div className="flex gap-2">
              {["github", "gitee"].map((s) => (
                <button
                  key={s}
                  onClick={() => setQuickSource(s)}
                  className={`rounded-md px-4 py-2 text-sm transition-colors ${
                    quickSource === s
                      ? "bg-blue-600 text-white"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  {SOURCE_MAP[s]}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium">最大采集数量</label>
            <Input
              type="number"
              value={quickMaxItems}
              onChange={(e) => setQuickMaxItems(Number(e.target.value))}
              min={1}
              max={100}
            />
          </div>

          <Button
            className="w-full"
            onClick={handleQuickCrawl}
            disabled={quickLoading || !quickQuery.trim()}
          >
            {quickLoading ? (
              <>
                <Spinner className="mr-2" />
                采集中...
              </>
            ) : (
              <>
                <Zap className="mr-2 h-4 w-4" />
                开始采集
              </>
            )}
          </Button>

          {quickResult && (
            <div
              className={`rounded-lg border p-4 ${
                quickResult.success
                  ? "border-green-200 bg-green-50"
                  : "border-red-200 bg-red-50"
              }`}
            >
              <p className="mb-2 text-sm font-medium">
                {quickResult.success ? "采集完成" : "采集失败"}
              </p>
              <p className="text-sm text-muted-foreground">
                {quickResult.message}
              </p>
              {quickResult.success && (
                <div className="mt-2 flex gap-4 text-sm">
                  <span className="text-green-700">
                    新增: {quickResult.created}
                  </span>
                  <span className="text-blue-700">
                    更新: {quickResult.updated}
                  </span>
                  <span className="text-gray-600">
                    总计: {quickResult.total}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      </Modal>

      {/* ── 全量采集对话框 ────────────────────── */}
      <Modal
        open={fullDialogOpen}
        onClose={() => {
          setFullDialogOpen(false);
          setFullResult(null);
        }}
        title="全量采集"
      >
        <div className="space-y-4">
          <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-3">
            <p className="text-sm text-yellow-800">
              全量采集将遍历所有预设关键词执行采集，预计耗时 2-5 分钟。请耐心等待。
            </p>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium">采集源</label>
            <div className="flex gap-2">
              {["github", "gitee"].map((s) => (
                <button
                  key={s}
                  onClick={() => setFullSource(s)}
                  className={`rounded-md px-4 py-2 text-sm transition-colors ${
                    fullSource === s
                      ? "bg-blue-600 text-white"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  {SOURCE_MAP[s]}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium">
              每个关键词最大采集数
            </label>
            <Input
              type="number"
              value={fullMaxItems}
              onChange={(e) => setFullMaxItems(Number(e.target.value))}
              min={1}
              max={100}
            />
          </div>

          <Button
            className="w-full"
            onClick={handleFullCrawl}
            disabled={fullLoading}
          >
            {fullLoading ? (
              <>
                <Spinner className="mr-2" />
                采集中，请勿关闭...
              </>
            ) : (
              <>
                <Database className="mr-2 h-4 w-4" />
                开始全量采集
              </>
            )}
          </Button>

          {fullResult && (
            <div
              className={`rounded-lg border p-4 ${
                fullResult.success
                  ? "border-green-200 bg-green-50"
                  : "border-red-200 bg-red-50"
              }`}
            >
              <p className="mb-2 text-sm font-medium">
                {fullResult.success ? "全量采集完成" : "全量采集失败"}
              </p>
              <p className="text-sm text-muted-foreground">
                {fullResult.message}
              </p>
              {fullResult.success && (
                <>
                  <div className="mt-2 flex gap-4 text-sm">
                    <span className="text-green-700">
                      新增: {fullResult.total_created}
                    </span>
                    <span className="text-blue-700">
                      更新: {fullResult.total_updated}
                    </span>
                    <span className="text-gray-600">
                      跳过: {fullResult.total_skipped}
                    </span>
                  </div>
                  {fullResult.details && fullResult.details.length > 0 && (
                    <div className="mt-3">
                      <p className="mb-1.5 text-xs font-medium text-gray-500">
                        各关键词采集统计:
                      </p>
                      <div className="max-h-40 overflow-y-auto rounded border text-xs">
                        <table className="w-full">
                          <thead className="sticky top-0 bg-gray-100">
                            <tr>
                              <th className="px-2 py-1 text-left">关键词</th>
                              <th className="px-2 py-1 text-right">新增</th>
                              <th className="px-2 py-1 text-right">更新</th>
                              <th className="px-2 py-1 text-right">跳过</th>
                            </tr>
                          </thead>
                          <tbody>
                            {fullResult.details.map((d, i) => (
                              <tr key={i} className="border-t">
                                <td className="px-2 py-1">{d.query}</td>
                                <td className="px-2 py-1 text-right text-green-700">
                                  {d.created}
                                </td>
                                <td className="px-2 py-1 text-right text-blue-700">
                                  {d.updated}
                                </td>
                                <td className="px-2 py-1 text-right text-gray-500">
                                  {d.skipped}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </Modal>

      {/* ── 创建任务对话框 ────────────────────── */}
      <Modal
        open={createDialogOpen}
        onClose={() => setCreateDialogOpen(false)}
        title="创建采集任务"
      >
        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium">
              任务名称 <span className="text-red-500">*</span>
            </label>
            <Input
              value={createForm.name}
              onChange={(e) =>
                setCreateForm((f) => ({ ...f, name: e.target.value }))
              }
              placeholder="例如: MCP Server 采集"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium">采集源</label>
            <div className="flex gap-2">
              {["github", "gitee"].map((s) => (
                <button
                  key={s}
                  onClick={() =>
                    setCreateForm((f) => ({ ...f, source_type: s }))
                  }
                  className={`rounded-md px-4 py-2 text-sm transition-colors ${
                    createForm.source_type === s
                      ? "bg-blue-600 text-white"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  {SOURCE_MAP[s]}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium">搜索关键词</label>
            <Input
              value={createForm.query}
              onChange={(e) =>
                setCreateForm((f) => ({ ...f, query: e.target.value }))
              }
              placeholder="例如: mcp server"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium">排序方式</label>
            <div className="flex gap-2">
              {[
                { value: "stars", label: "Stars" },
                { value: "updated", label: "最近更新" },
                { value: "forks", label: "Forks" },
              ].map((opt) => (
                <button
                  key={opt.value}
                  onClick={() =>
                    setCreateForm((f) => ({ ...f, sort: opt.value }))
                  }
                  className={`rounded-md px-4 py-2 text-sm transition-colors ${
                    createForm.sort === opt.value
                      ? "bg-blue-600 text-white"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium">每页数量</label>
            <Input
              type="number"
              value={createForm.per_page}
              onChange={(e) =>
                setCreateForm((f) => ({
                  ...f,
                  per_page: Number(e.target.value),
                }))
              }
              min={1}
              max={100}
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium">调度周期</label>
            <div className="flex gap-2">
              {[
                { value: "manual", label: "手动执行" },
                { value: "daily", label: "每天" },
                { value: "weekly", label: "每周" },
              ].map((opt) => (
                <button
                  key={opt.value}
                  onClick={() =>
                    setCreateForm((f) => ({ ...f, schedule: opt.value }))
                  }
                  className={`rounded-md px-4 py-2 text-sm transition-colors ${
                    createForm.schedule === opt.value
                      ? "bg-blue-600 text-white"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <Button
            className="w-full"
            onClick={handleCreateTask}
            disabled={createLoading || !createForm.name.trim()}
          >
            {createLoading ? (
              <>
                <Spinner className="mr-2" />
                创建中...
              </>
            ) : (
              <>
                <Plus className="mr-2 h-4 w-4" />
                创建任务
              </>
            )}
          </Button>
        </div>
      </Modal>

      {/* ── 任务详情对话框 ────────────────────── */}
      <Modal
        open={detailDialogOpen}
        onClose={() => setDetailDialogOpen(false)}
        title="任务详情"
      >
        {detailLoading ? (
          <div className="flex flex-col items-center justify-center py-8">
            <Spinner className="mb-3 h-6 w-6 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">加载中...</p>
          </div>
        ) : detailTask ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-muted-foreground">任务名称:</span>
                <p className="font-medium">{detailTask.name}</p>
              </div>
              <div>
                <span className="text-muted-foreground">采集源:</span>
                <p className="font-medium">
                  {SOURCE_MAP[detailTask.source_type] || detailTask.source_type}
                </p>
              </div>
              <div>
                <span className="text-muted-foreground">状态:</span>
                <p className="font-medium">
                  {STATUS_MAP[detailTask.status]?.label || detailTask.status}
                </p>
              </div>
              <div>
                <span className="text-muted-foreground">调度周期:</span>
                <p className="font-medium">
                  {SCHEDULE_MAP[detailTask.schedule || ""] ||
                    detailTask.schedule ||
                    "手动"}
                </p>
              </div>
              <div>
                <span className="text-muted-foreground">创建时间:</span>
                <p className="font-medium">{formatTime(detailTask.created_at)}</p>
              </div>
              <div>
                <span className="text-muted-foreground">上次执行:</span>
                <p className="font-medium">
                  {formatTime(detailTask.last_run_at)}
                </p>
              </div>
            </div>

            {/* 采集配置 */}
            <div>
              <h3 className="mb-2 text-sm font-medium">采集配置</h3>
              <div className="rounded-lg border bg-gray-50 p-3">
                <pre className="text-xs text-gray-700 whitespace-pre-wrap">
                  {JSON.stringify(detailTask.source_config, null, 2)}
                </pre>
              </div>
            </div>

            {/* 上次执行结果 */}
            {detailTask.last_result && (
              <div>
                <h3 className="mb-2 text-sm font-medium">上次执行结果</h3>
                <div
                  className={`rounded-lg border p-3 ${
                    detailTask.last_result.success
                      ? "border-green-200 bg-green-50"
                      : "border-red-200 bg-red-50"
                  }`}
                >
                  <pre className="text-xs whitespace-pre-wrap">
                    {JSON.stringify(detailTask.last_result, null, 2)}
                  </pre>
                </div>
              </div>
            )}

            {/* 任务 ID */}
            <div>
              <span className="text-xs text-muted-foreground">任务 ID:</span>
              <p className="text-xs font-mono text-gray-500 break-all">
                {detailTask.id}
              </p>
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">无法加载任务详情</p>
        )}
      </Modal>
    </div>
  );
}
