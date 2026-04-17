"""中间件：请求日志 + API 限流"""
import time
import logging

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import JSONResponse

from app.core.config import settings
from app.core.redis import get_redis_client

logger = logging.getLogger("api.access")


# ── 请求日志中间件 ────────────────────────────────────


class RequestLoggingMiddleware(BaseHTTPMiddleware):
    """记录每个 API 请求的方法、路径、状态码和耗时"""

    # 跳过日志的路径
    SKIP_PATHS = {"/docs", "/redoc", "/openapi.json", "/api/v1/health"}

    async def dispatch(self, request: Request, call_next):
        start = time.time()
        method = request.method
        path = request.url.path

        # 不记录文档和健康检查路径
        if path in self.SKIP_PATHS:
            return await call_next(request)

        response = await call_next(request)
        duration = time.time() - start
        status = response.status_code
        # 格式: [METHOD] /path -> 200 (123ms)
        logger.info(f"[{method}] {path} -> {status} ({duration * 1000:.0f}ms)")
        return response


# ── API 限流中间件（基于 Redis 滑动窗口）───────────────


class RateLimitMiddleware(BaseHTTPMiddleware):
    """基于 Redis 的 API 限流中间件

    使用固定窗口计数算法，按客户端 IP + 路径前缀进行限流。
    Redis 不可用时自动跳过限流，不影响主流程。
    """

    def __init__(self, app):
        super().__init__(app)
        self.enabled = settings.RATE_LIMIT_ENABLED
        self.rate_limits = {
            "/api/v1/search": settings.RATE_LIMIT_SEARCH_PER_MINUTE,
            "/api/v1/crawl": settings.RATE_LIMIT_CRAWL_PER_MINUTE,
            "/api/v1/": settings.RATE_LIMIT_DEFAULT_PER_MINUTE,
        }

    async def dispatch(self, request, call_next):
        # 限流开关关闭时直接放行
        if not self.enabled:
            return await call_next(request)

        path = request.url.path

        # 获取客户端 IP
        client_ip = request.client.host if request.client else "unknown"

        # 匹配限流规则
        for prefix, max_requests in self.rate_limits.items():
            if path.startswith(prefix):
                key = f"rate_limit:{client_ip}:{prefix}"
                try:
                    redis = await get_redis_client()
                    current = await redis.incr(key)
                    if current == 1:
                        await redis.expire(key, 60)
                    if current > max_requests:
                        return JSONResponse(
                            status_code=429,
                            content={
                                "code": 429,
                                "message": "请求过于频繁，请稍后再试",
                                "data": None,
                            },
                        )
                except Exception:
                    # Redis 不可用时跳过限流
                    pass
                break

        return await call_next(request)
