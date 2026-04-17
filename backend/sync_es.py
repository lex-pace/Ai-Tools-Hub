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
    from app.services.es_service import ensure_skills_index, bulk_index_skills
    from app.models.skill import Skill
    from sqlalchemy import select

    print("=== 同步数据到 Elasticsearch ===")

    # 检查 ES 连接
    from app.core.config import settings
    print(f"ES 地址: {settings.ELASTICSEARCH_URL}")

    # 确保索引存在
    ok = await ensure_skills_index()
    if not ok:
        print("❌ ES 索引创建失败，请检查 ES 是否运行")
        sys.exit(1)
    print("✅ ES 索引就绪")

    # 查询所有活跃技能
    async with async_session_factory() as db:
        result = await db.execute(select(Skill).where(Skill.status == "active"))
        skills = result.scalars().all()
        print(f"找到 {len(skills)} 条活跃技能")

        if skills:
            count = await bulk_index_skills(skills)
            print(f"✅ 已同步 {count} 条到 ES")
        else:
            print("⚠️ 没有数据需要同步")

    print("=== 同步完成 ===")

if __name__ == "__main__":
    asyncio.run(sync())
