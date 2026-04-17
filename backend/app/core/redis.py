"""AI Skills Hub — Redis 异步客户端单例"""
import redis.asyncio as aioredis

from app.core.config import settings

# 全局 Redis 客户端单例
_redis_client: aioredis.Redis | None = None


async def get_redis_client() -> aioredis.Redis:
    """获取 Redis 异步客户端单例"""
    global _redis_client
    if _redis_client is None:
        _redis_client = aioredis.from_url(
            settings.REDIS_URL,
            encoding="utf-8",
            decode_responses=True,
            max_connections=20,
        )
    return _redis_client


async def close_redis_client() -> None:
    """关闭 Redis 客户端连接"""
    global _redis_client
    if _redis_client is not None:
        await _redis_client.close()
        _redis_client = None
