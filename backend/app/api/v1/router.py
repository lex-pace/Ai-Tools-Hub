"""AI Skills Hub — API v1 路由汇总"""
from fastapi import APIRouter

from app.api.v1.categories import router as categories_router
from app.api.v1.skills import router as skills_router
from app.api.v1.search import router as search_router
from app.api.v1.admin import router as admin_router
from app.api.v1.crawl import router as crawl_router
from app.api.v1.auth import router as auth_router
from app.api.v1.user_favorites import router as favorites_router
from app.api.v1.user_reviews import router as reviews_router
from app.api.v1.recommend import router as recommend_router
from app.api.v1.ranking import router as ranking_router

# 创建 v1 总路由
router = APIRouter(prefix="/api/v1")

# 注册各模块路由
router.include_router(categories_router, prefix="/categories", tags=["分类管理"])
router.include_router(skills_router, prefix="/skills", tags=["技能管理"])
router.include_router(search_router, prefix="/search", tags=["智能搜索"])
router.include_router(admin_router, prefix="/admin", tags=["系统管理"])
router.include_router(crawl_router, prefix="/crawl", tags=["数据采集"])
router.include_router(recommend_router, prefix="/recommend", tags=["智能推荐"])
router.include_router(auth_router, prefix="/auth", tags=["用户认证"])
router.include_router(favorites_router, prefix="/favorites", tags=["我的收藏"])
router.include_router(reviews_router, tags=["用户评价"])
router.include_router(ranking_router, prefix="/ranking", tags=["排行"])
