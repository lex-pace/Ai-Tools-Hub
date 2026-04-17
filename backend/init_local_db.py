"""
本地数据库初始化脚本
在本地运行，连接 VM 的 PostgreSQL，执行 init.sql

用法: cd backend && python init_local_db.py
"""
import asyncio
import sys
from pathlib import Path

# 读取 .env
from dotenv import load_dotenv
load_dotenv()

from app.core.config import settings

async def init_db():
    """连接数据库并执行 init.sql"""
    import asyncpg

    db_url = settings.SYNC_DATABASE_URL
    print(f"连接数据库: {db_url}")

    try:
        conn = await asyncpg.connect(db_url)
        print("✅ 数据库连接成功")
    except Exception as e:
        print(f"❌ 数据库连接失败: {e}")
        sys.exit(1)

    # 读取 init.sql
    sql_path = Path(__file__).parent / "init.sql"
    if not sql_path.exists():
        print(f"❌ 找不到 {sql_path}")
        sys.exit(1)

    sql = sql_path.read_text(encoding="utf-8")
    print(f"读取 init.sql ({len(sql)} 字符)")

    # asyncpg.execute() 不支持多条语句，需要拆分
    # 简单的 split(";") 会错误切割函数体（$$...$$ 内的分号）
    # 这里用状态机正确处理 dollar-quoted 字符串
    def split_sql(text: str) -> list[str]:
        statements = []
        current = []
        i = 0
        in_dollar = False
        dollar_depth = 0
        while i < len(text):
            # 检测 $$ 开始/结束
            if text[i] == '$' and not in_dollar:
                # 可能是 $$ 的开始
                if i + 1 < len(text) and text[i + 1] == '$':
                    in_dollar = True
                    dollar_depth = 1
                    current.append('$$')
                    i += 2
                    continue
            elif text[i] == '$' and in_dollar:
                if i + 1 < len(text) and text[i + 1] == '$':
                    in_dollar = False
                    current.append('$$')
                    i += 2
                    continue

            if not in_dollar and text[i] == ';':
                stmt = ''.join(current).strip()
                if stmt and not all(line.strip().startswith('--') for line in stmt.split('\n') if line.strip()):
                    statements.append(stmt)
                current = []
            else:
                current.append(text[i])
            i += 1

        # 处理最后一条
        stmt = ''.join(current).strip()
        if stmt and not all(line.strip().startswith('--') for line in stmt.split('\n') if line.strip()):
            statements.append(stmt)
        return statements

    statements = split_sql(sql)
    print(f"共 {len(statements)} 条 SQL 语句")

    success = 0
    skip = 0
    for i, stmt in enumerate(statements, 1):
        try:
            await conn.execute(stmt)
            success += 1
        except Exception as e:
            if "already exists" in str(e) or "duplicate" in str(e):
                skip += 1
            else:
                print(f"❌ 第 {i} 条语句执行失败: {e}")
                print(f"   SQL: {stmt[:120]}...")

    print(f"✅ 执行完成: {success} 成功, {skip} 跳过（已存在）")

    await conn.close()

    # 验证数据
    conn = await asyncpg.connect(db_url)
    count = await conn.fetchval("SELECT COUNT(*) FROM categories")
    print(f"✅ 分类数据: {count} 条")

    skills_count = await conn.fetchval("SELECT COUNT(*) FROM skills")
    print(f"✅ 技能数据: {skills_count} 条")

    await conn.close()
    print("\n=== 初始化完成 ===")

if __name__ == "__main__":
    asyncio.run(init_db())
