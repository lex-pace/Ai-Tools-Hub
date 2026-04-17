"""AI Tools Hub — SQLAlchemy 2.0 异步数据库引擎与会话管理"""
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase

from app.core.config import settings

# 创建异步引擎
# 针对跨网络（Mac → VM Docker）场景优化：
# - pool_size=3: 减少空闲连接数，降低被回收概率
# - max_overflow=5: 允许少量突发
# - pool_pre_ping=True: 每次使用前检查连接是否存活
# - pool_recycle=180: 3 分钟回收，避免 PG 端断开空闲连接
# - pool_timeout=10: 获取池连接最多等 10 秒
# - connect_args timeout=15: asyncpg 建立新连接最多 15 秒
engine = create_async_engine(
    settings.DATABASE_URL,
    echo=settings.APP_DEBUG,
    pool_size=3,
    max_overflow=5,
    pool_pre_ping=True,
    pool_recycle=180,
    pool_timeout=10,
    connect_args={"timeout": 15},
)

# 异步会话工厂
async_session_factory = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


# 声明式基类
class Base(DeclarativeBase):
    pass


# 依赖注入用：获取异步数据库会话
async def get_db() -> AsyncSession:
    """FastAPI 依赖注入：生成异步数据库会话"""
    async with async_session_factory() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()
