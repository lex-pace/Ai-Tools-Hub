"use client";

import { useState } from "react";
import Link from "next/link";
import { Star, Send, Loader2, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { reviewApi } from "@/lib/api";
import { useAuthStore } from "@/store/authStore";

interface ReviewFormProps {
  skillId: string;
  onSubmitted?: () => void;
}

const MIN_CONTENT_LENGTH = 10;
const MAX_CONTENT_LENGTH = 500;

export default function ReviewForm({ skillId, onSubmitted }: ReviewFormProps) {
  const { isAuthenticated } = useAuthStore();
  const [rating, setRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [content, setContent] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const displayRating = hoverRating || rating;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess(false);

    if (!isAuthenticated) return;

    if (rating < 1 || rating > 5) {
      setError("请选择 1-5 的评分");
      return;
    }

    const trimmedContent = content.trim();
    if (trimmedContent.length > 0 && trimmedContent.length < MIN_CONTENT_LENGTH) {
      setError(`评论内容至少需要 ${MIN_CONTENT_LENGTH} 个字`);
      return;
    }

    setSubmitting(true);
    try {
      await reviewApi.create(skillId, {
        rating,
        comment: trimmedContent || undefined,
      });
      // 重置表单
      setRating(5);
      setContent("");
      setSuccess(true);
      onSubmitted?.();
      // 3 秒后隐藏成功提示
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      const message = err instanceof Error ? err.message : "发表评价失败，请稍后重试";
      setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  // 未登录状态
  if (!isAuthenticated) {
    return (
      <div className="rounded-lg border border-dashed border-border p-6 text-center">
        <LogIn className="mx-auto h-8 w-8 text-muted-foreground/50 mb-2" />
        <p className="text-sm text-muted-foreground mb-3">
          请先登录后评价
        </p>
        <Link href="/login">
          <Button variant="outline" size="sm" className="gap-1.5">
            <LogIn className="h-4 w-4" />
            去登录
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* 星级评分 */}
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium">评分：</span>
        <div className="flex items-center gap-0.5">
          {[1, 2, 3, 4, 5].map((star) => (
            <Star
              key={star}
              className={`h-6 w-6 transition-all cursor-pointer ${
                star <= displayRating
                  ? "fill-amber-400 text-amber-400 scale-100"
                  : "text-muted-foreground/30 hover:text-amber-400/60"
              } ${star <= displayRating ? "hover:scale-110" : ""}`}
              onClick={() => setRating(star)}
              onMouseEnter={() => setHoverRating(star)}
              onMouseLeave={() => setHoverRating(0)}
            />
          ))}
        </div>
        <span className="text-sm text-muted-foreground ml-1">
          {rating} 分
        </span>
      </div>

      {/* 评论输入框 */}
      <div className="relative">
        <textarea
          className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm leading-relaxed placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 resize-none transition-colors"
          placeholder="写下你的评价（可选，至少 10 字）..."
          value={content}
          onChange={(e) => setContent(e.target.value)}
          maxLength={MAX_CONTENT_LENGTH}
          disabled={submitting}
          rows={3}
        />
        <span
          className={`absolute bottom-2 right-3 text-xs ${
            content.length > MAX_CONTENT_LENGTH
              ? "text-destructive"
              : "text-muted-foreground"
          }`}
        >
          {content.length} / {MAX_CONTENT_LENGTH}
        </span>
      </div>

      {/* 提示信息 */}
      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}
      {success && (
        <p className="text-sm text-emerald-600">评价发表成功！</p>
      )}

      {/* 提交按钮 */}
      <div className="flex justify-end">
        <Button
          type="submit"
          size="default"
          disabled={submitting}
          className="gap-1.5"
        >
          {submitting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
          发表评价
        </Button>
      </div>
    </form>
  );
}
