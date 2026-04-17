"""全量数据采集脚本

用法:
    python scripts/full_crawl.py                    # 默认 GitHub 全量采集
    python scripts/full_crawl.py --source gitee     # Gitee 全量采集
    python scripts/full_crawl.py --max 50           # 每个关键词最多 50 条
    python scripts/full_crawl.py --delay 5          # 查询间隔 5 秒
"""
import argparse
import asyncio
import logging
import sys
import os

# 将项目根目录添加到 Python 路径
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.config import settings

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)s | %(name)s | %(message)s",
)
logger = logging.getLogger(__name__)


async def main():
    parser = argparse.ArgumentParser(description="AI Skills Hub 全量数据采集")
    parser.add_argument("--source", default="github", choices=["github", "gitee"], help="采集源")
    parser.add_argument("--max", type=int, default=30, help="每个关键词最大采集数")
    parser.add_argument("--delay", type=float, default=3.0, help="查询间隔（秒）")
    parser.add_argument("--clean", action="store_true", help="采集前清理旧数据（清空 skills 表 + 重建 ES 索引）")
    args = parser.parse_args()

    logger.info(f"=== 全量采集开始 ===")
    logger.info(f"采集源: {args.source}")
    logger.info(f"每查询最大数: {args.max}")
    logger.info(f"查询间隔: {args.delay}s")
    logger.info(f"清理旧数据: {'是' if args.clean else '否'}")
    logger.info(f"数据库: {settings.DATABASE_URL.split('@')[-1]}")

    from app.services.crawl_service import full_crawl

    result = await full_crawl(
        source=args.source,
        max_items_per_query=args.max,
        delay_between_queries=args.delay,
        clean_before=args.clean,
    )

    print("\n" + "=" * 60)
    print("全量采集结果")
    print("=" * 60)
    print(f"搜索关键词数: {result['queries']}")
    print(f"总新增: {result['total_created']}")
    print(f"总更新: {result['total_updated']}")
    print(f"总跳过: {result['total_skipped']}")
    print()

    for detail in result.get("details", []):
        status = "OK" if detail.get("error") is None else "FAIL"
        print(f"  [{status}] {detail['query']}: 结果={detail['total']}, "
              f"新增={detail['created']}, 更新={detail['updated']}, 跳过={detail['skipped']}")
        if detail.get("error"):
            print(f"    错误: {detail['error']}")

    print("=" * 60)


if __name__ == "__main__":
    asyncio.run(main())
