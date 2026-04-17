"use client";

import { useEffect, useState, useCallback } from "react";
import { Star, Loader2, MessageSquare } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { reviewApi } from "@/lib/api";
import type { Review } from "@/lib/types";

interface ReviewListProps {
  toolId: string;
}

/** 渲染星星评分 */
function renderStars(score: number) {
  const stars = [];
  const fullStars = Math.floor(score);
  const hasHalf = score - fullStars >= 0.5;
  for (let i = 0; i < 5; i++) {
    if (i < fullStars) {
      stars.push(
        <Star key={i} className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
      );
    } else if (i === fullStars && hasHalf) {
      stars.push(
        <Star key={i} className="h-3.5 w-3.5 fill-amber-400/50 text-amber-400" />
      );
    } else {
      stars.push(
        <Star key={i} className="h-3.5 w-3.5 text-muted-foreground/30" />
      );
    }
  }
  return stars;
}

/** 格式化相对时间 */
function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHour = Math.floor(diffMs / 3600000);
  const diffDay = Math.floor(diffMs / 86400000);

  if (diffMin < 1) return "刚刚";
  if (diffMin < 60) return `${diffMin} 分钟前`;
  if (diffHour < 24) return `${diffHour} 小时前`;
  if (diffDay < 30) return `${diffDay} 天前`;
  if (diffDay < 365) return `${Math.floor(diffDay / 30)} 个月前`;
  return date.toLocaleDateString("zh-CN");
}

export default function ReviewList({ toolId }: ReviewListProps) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const pageSize = 10;

  const fetchReviews = useCallback(async (pageNum: number, append = false) => {
    if (pageNum === 1) {
      setLoading(true);
    } else {
      setLoadingMore(true);
    }
    try {
      const res = await reviewApi.getList(toolId, pageNum, pageSize);
      const data = res.data?.data;
      const items: Review[] = Array.isArray(data) ? data : data?.items || [];
      setReviews((prev) => (append ? [...prev, ...items] : items));
      // 判断是否还有更多数据
      const total = typeof data === "object" && data !== null && !Array.isArray(data) ? (data as any).total : 0;
      setHasMore(total > pageNum * pageSize || items.length === pageSize);
    } catch {
      if (pageNum === 1) setReviews([]);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [toolId, pageSize]);

  useEffect(() => {
    setReviews([]);
    setPage(1);
    fetchReviews(1);
  }, [toolId, fetchReviews]);

  const handleLoadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchReviews(nextPage, true);
  };

  // 计算平均分
  const avgScore =
    reviews.length > 0
      ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
      : 0;

  // 计算评分分布
  const getRatingDistribution = () => {
    const dist: Record<number, number> = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    reviews.forEach((r) => {
      const key = Math.min(5, Math.max(1, Math.round(r.rating)));
      dist[key]++;
    });
    return dist;
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          加载评价中...
        </div>
        {[1, 2, 3].map((i) => (
          <div key={i} className="animate-pulse flex gap-3">
            <div className="h-8 w-8 rounded-full bg-muted shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-32 rounded bg-muted" />
              <div className="h-3 w-full rounded bg-muted" />
              <div className="h-3 w-2/3 rounded bg-muted" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  const ratingDist = getRatingDistribution();
  const totalReviews = reviews.length;

  return (
    <div className="space-y-6">
      {/* 评分概览 */}
      {totalReviews > 0 && (
        <div className="flex flex-col sm:flex-row gap-6">
          {/* 平均分 */}
          <div className="text-center sm:text-left shrink-0">
            <div className="text-4xl font-bold">{avgScore.toFixed(1)}</div>
            <div className="flex items-center justify-center sm:justify-start gap-0.5 mt-1">
              {renderStars(avgScore)}
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              {totalReviews} 条评价
            </p>
          </div>

          {/* 评分分布 */}
          <div className="flex-1 space-y-1.5">
            {[5, 4, 3, 2, 1].map((star) => {
              const count = ratingDist[star];
              const percent = totalReviews > 0 ? (count / totalReviews) * 100 : 0;
              return (
                <div key={star} className="flex items-center gap-2 text-sm">
                  <span className="w-8 text-right text-muted-foreground">
                    {star} 星
                  </span>
                  <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full rounded-full bg-amber-400 transition-all"
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                  <span className="w-8 text-muted-foreground">{count}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 评价列表 */}
      <div className="space-y-4">
        {totalReviews > 0 ? (
          reviews.map((review) => (
            <div
              key={review.id}
              className="flex gap-3 rounded-lg border border-border/50 p-4 transition-colors hover:bg-muted/30"
            >
              <Avatar
                imageUrl={review.user?.avatar_url}
                username={review.user?.username || "匿名"}
                size="sm"
              />
              <div className="flex-1 min-w-0">
                {/* 用户名 + 评分 + 时间 */}
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-medium">
                    {review.user?.username || "匿名用户"}
                  </span>
                  <div className="flex items-center gap-0.5">
                    {renderStars(review.rating)}
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {formatRelativeTime(review.created_at)}
                  </span>
                </div>
                {/* 评论内容 */}
                {review.comment && (
                  <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                    {review.comment}
                  </p>
                )}
              </div>
            </div>
          ))
        ) : (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <MessageSquare className="h-10 w-10 mb-3 opacity-40" />
            <p className="text-sm">暂无评价，快来发表第一条评价吧</p>
          </div>
        )}
      </div>

      {/* 加载更多 */}
      {hasMore && (
        <div className="flex justify-center">
          <Button
            variant="outline"
            size="sm"
            onClick={handleLoadMore}
            disabled={loadingMore}
            className="gap-1.5"
          >
            {loadingMore ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : null}
            {loadingMore ? "加载中..." : "加载更多评价"}
          </Button>
        </div>
      )}
    </div>
  );
}
