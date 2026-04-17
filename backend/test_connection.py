"""
连接测试脚本 — 验证本机能否连接 VM 的 Docker 服务
用法: cd backend && python test_connection.py
"""
import asyncio
import sys
from dotenv import load_dotenv
load_dotenv()

from app.core.config import settings

async def test_all():
    print("=" * 50)
    print("  AI Skills Hub — 连接测试")
    print("=" * 50)
    print(f"  模式: {settings.APP_MODE}")
    print(f"  DB:   {settings.DATABASE_URL}")
    print(f"  Redis:{settings.REDIS_URL}")
    print(f"  ES:   {settings.ELASTICSEARCH_URL}")
    print("=" * 50)

    # 1. 测试 PostgreSQL
    print("\n[1/3] 测试 PostgreSQL...")
    try:
        import asyncpg
        conn = await asyncio.wait_for(
            asyncpg.connect(settings.SYNC_DATABASE_URL),
            timeout=5
        )
        version = await conn.fetchval("SELECT version()")
        print(f"  ✅ PostgreSQL 连接成功")
        print(f"  版本: {version[:50]}...")
        await conn.close()
    except Exception as e:
        print(f"  ❌ PostgreSQL 连接失败: {e}")

    # 2. 测试 Redis
    print("\n[2/3] 测试 Redis...")
    try:
        import redis.asyncio as aioredis
        r = aioredis.from_url(settings.REDIS_URL, decode_responses=True)
        await asyncio.wait_for(r.ping(), timeout=5)
        info = await r.info("server")
        print(f"  ✅ Redis 连接成功")
        print(f"  版本: {info.get('redis_version', 'unknown')}")
        await r.close()
    except Exception as e:
        print(f"  ❌ Redis 连接失败: {e}")

    # 3. 测试 Elasticsearch
    print("\n[3/3] 测试 Elasticsearch...")
    try:
        from elasticsearch import AsyncElasticsearch
        es = AsyncElasticsearch(hosts=[settings.ELASTICSEARCH_URL], request_timeout=5)
        info = await es.info()
        print(f"  ✅ Elasticsearch 连接成功")
        print(f"  版本: {info['version']['number']}")
        await es.close()
    except Exception as e:
        print(f"  ❌ Elasticsearch 连接失败: {e}")

    print("\n" + "=" * 50)
    print("  测试完成")
    print("=" * 50)

if __name__ == "__main__":
    asyncio.run(test_all())
