"""
本地 ES 同步脚本
用法: cd backend && python sync_es.py
"""
import asyncio
import sys
from dotenv import load_dotenv
load_dotenv()

async def sync():
    from app.core.database import async_session_factory
    from app.services.es_service import ensure_tools_index, bulk_index_tools
    from app.models.tool import Tool
    from sqlalchemy import select

    print("=== 同步数据到 Elasticsearch ===")

    # 检查 ES 连接
    from app.core.config import settings
    print(f"ES 地址: {settings.ELASTICSEARCH_URL}")

    # 确保索引存在
    ok = await ensure_tools_index()
    if not ok:
        print("❌ ES 索引创建失败，请检查 ES 是否运行")
        sys.exit(1)
    print("✅ ES 索引就绪")

    # 查询所有活跃工具
    async with async_session_factory() as db:
        result = await db.execute(select(Tool).where(Tool.status == "active"))
        tools = result.scalars().all()
        print(f"找到 {len(tools)} 条活跃工具")

        if tools:
            count = await bulk_index_tools(tools)
            print(f"✅ 已同步 {count} 条到 ES")
        else:
            print("⚠️ 没有数据需要同步")

    print("=== 同步完成 ===")

if __name__ == "__main__":
    asyncio.run(sync())
