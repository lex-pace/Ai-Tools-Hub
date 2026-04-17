"""AI Skills Hub — 依赖注入：数据库会话、ES 客户端、Redis 客户端"""
from typing import AsyncGenerator

from elasticsearch import AsyncElasticsearch
import redis.asyncio as aioredis
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db as _get_db
from app.core.elasticsearch import get_es_client
from app.core.redis import get_redis_client


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """获取数据库异步会话（FastAPI Depends 使用）"""
    async for session in _get_db():
        yield session


async def get_es() -> AsyncGenerator[AsyncElasticsearch, None]:
    """获取 Elasticsearch 异步客户端（FastAPI Depends 使用）"""
    client = await get_es_client()
    yield client


async def get_redis() -> AsyncGenerator[aioredis.Redis, None]:
    """获取 Redis 异步客户端（FastAPI Depends 使用）"""
    client = await get_redis_client()
    yield client
