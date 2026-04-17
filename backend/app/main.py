"""AI Skills Hub — FastAPI 应用入口"""
import logging
import traceback

from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.core.config import settings
from app.core.elasticsearch import close_es_client
from app.core.redis import close_redis_client
from app.services.llm_service import close_llm_service
from app.core.exceptions import (
    NotFoundError,
    BadRequestError,
    UnauthorizedError,
    ForbiddenError,
    RateLimitError,
    ExternalServiceError,
)
from app.core.logging_config import setup_logging
from app.core.middleware import RequestLoggingMiddleware, RateLimitMiddleware
from app.api.v1.router import router as v1_router

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """应用生命周期管理：启动与关闭"""
    # ── 启动 ─────────────────────────────────────────
    # 配置日志
    setup_logging()

    print(f"""
    ╔══════════════════════════════════════════════╗
    ║       AI Skills Hub API 已启动                ║
    ╠══════════════════════════════════════════════╣
    ║  模式:   {settings.APP_MODE:<37s}║
    ║  数据库: {settings.DATABASE_URL:<37s}║
    ║  Redis:  {settings.REDIS_URL:<37s}║
    ║  ES:     {settings.ELASTICSEARCH_URL:<37s}║
    ║  LLM:    {settings.LLM_PROVIDER:<37s}║
    ║  Embed:  {settings.EMBEDDING_PROVIDER:<37s}║
    ╠══════════════════════════════════════════════╣
    ║  API 文档: http://localhost:8000/docs         ║
    ╚══════════════════════════════════════════════╝
    """)
    yield
    # ── 关闭 ─────────────────────────────────────────
    await close_es_client()
    await close_redis_client()
    await close_llm_service()
    print("AI Skills Hub API 已关闭")


app = FastAPI(
    title="AI Skills Hub API",
    description="AI Skills 搜索聚合平台 API",
    version="0.1.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)


# ── 全局异常处理器 ────────────────────────────────────


@app.exception_handler(NotFoundError)
async def not_found_handler(request: Request, exc: NotFoundError):
    """资源未找到 -> 404"""
    return JSONResponse(
        status_code=404,
        content={"code": 404, "message": str(exc), "data": None},
    )


@app.exception_handler(BadRequestError)
async def bad_request_handler(request: Request, exc: BadRequestError):
    """请求参数错误 -> 400"""
    return JSONResponse(
        status_code=400,
        content={"code": 400, "message": exc.message, "data": None},
    )


@app.exception_handler(UnauthorizedError)
async def unauthorized_handler(request: Request, exc: UnauthorizedError):
    """未授权 -> 401"""
    return JSONResponse(
        status_code=401,
        content={"code": 401, "message": exc.message, "data": None},
    )


@app.exception_handler(ForbiddenError)
async def forbidden_handler(request: Request, exc: ForbiddenError):
    """无权限 -> 403"""
    return JSONResponse(
        status_code=403,
        content={"code": 403, "message": exc.message, "data": None},
    )


@app.exception_handler(RateLimitError)
async def rate_limit_handler(request: Request, exc: RateLimitError):
    """请求过于频繁 -> 429"""
    return JSONResponse(
        status_code=429,
        content={"code": 429, "message": exc.message, "data": None},
    )


@app.exception_handler(ExternalServiceError)
async def external_service_handler(request: Request, exc: ExternalServiceError):
    """外部服务调用失败 -> 502"""
    return JSONResponse(
        status_code=502,
        content={"code": 502, "message": str(exc), "data": None},
    )


@app.exception_handler(ValueError)
async def value_error_handler(request: Request, exc: ValueError):
    """参数校验错误 -> 400"""
    return JSONResponse(
        status_code=400,
        content={"code": 400, "message": str(exc), "data": None},
    )


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """兜底异常处理器 -> 500（不暴露内部信息）"""
    # 记录完整错误日志
    logger.error(
        "未处理的异常 [%s] %s\n%s",
        request.method,
        request.url.path,
        traceback.format_exc(),
    )
    return JSONResponse(
        status_code=500,
        content={"code": 500, "message": "服务器内部错误，请稍后再试", "data": None},
    )


# ── 中间件（注意顺序：最后添加的最先执行）───────────────
# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 请求日志中间件
app.add_middleware(RequestLoggingMiddleware)

# API 限流中间件
app.add_middleware(RateLimitMiddleware)

# ── 注册 v1 路由 ────────────────────────────────────
app.include_router(v1_router)


# ── 系统端点 ────────────────────────────────────────
@app.get("/api/v1/health")
async def health_check():
    return {"status": "ok", "version": "0.1.0", "mode": settings.APP_MODE}


@app.get("/api/v1/info")
async def info():
    return {
        "app": "AI Skills Hub",
        "version": "0.1.0",
        "mode": settings.APP_MODE,
        "llm_provider": settings.LLM_PROVIDER,
        "embedding_provider": settings.EMBEDDING_PROVIDER,
        "crawl_provider": settings.CRAWL_PROVIDER,
        "database_url": settings.DATABASE_URL,
        "redis_url": settings.REDIS_URL,
        "elasticsearch_url": settings.ELASTICSEARCH_URL,
    }
