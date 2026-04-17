# AI-Tools-Hub - 全栈 AI 工具聚合平台

<p align="center">
  <img src="https://img.shields.io/badge/FastAPI-0.115+-green?logo=fastapi" alt="FastAPI">
  <img src="https://img.shields.io/badge/Next.js-14.2+-black?logo=next.js" alt="Next.js">
  <img src="https://img.shields.io/badge/TypeScript-5.4+-blue?logo=typescript" alt="TypeScript">
  <img src="https://img.shields.io/badge/Elasticsearch-8-005571?logo=elasticsearch" alt="Elasticsearch">
  <img src="https://img.shields.io/badge/PostgreSQL-16-4169E1?logo=postgresql" alt="PostgreSQL">
  <img src="https://img.shields.io/badge/Redis-7-DC382D?logo=redis" alt="Redis">
  <img src="https://img.shields.io/badge/Docker-Compose-2496ED?logo=docker" alt="Docker">
  <img src="https://img.shields.io/badge/License-MIT-yellow" alt="License">
</p>

> 🔍 **一站式 AI 工具发现、搜索与推荐平台** — 聚合 MCP Server、AI Agent、Prompt 模板、LLM 框架、RAG 工具等全品类 AI 生态资源，支持智能搜索、LLM 驱动推荐、多源数据采集，赛博朋克风格 UI，Docker 一键部署。

---

## ✨ 项目亮点

- 🎨 **赛博朋克 UI** — Canvas 神经网络粒子动画背景、毛玻璃卡片、全息悬停边框、跑马灯搜索框、深色/浅色主题切换
- 🔍 **Elasticsearch 全文搜索** — IK 中文分词、多字段加权搜索、关键词高亮、Completion Suggester 自动补全
- 🤖 **LLM 智能推荐** — 5 大 LLM Provider 一键切换（SiliconCloud / Gemini / Groq / 百度千帆 / DeepSeek），意图分析 + 语义推荐
- 🕷️ **多源数据采集** — GitHub + Gitee 双平台采集，工厂模式设计，支持快速/全量/定时采集
- 🛡️ **完善容错降级** — ES 不可用降级 PG 搜索、LLM 失败降级关键词搜索、Redis 不可用跳过限流、429 自动重试
- 🐳 **Docker 一键部署** — 6 个服务容器编排（PG / ES / Redis / Backend / Frontend / Nginx），也支持本地开发模式
- 👤 **完整用户系统** — JWT 认证、收藏、评价、个人中心、管理后台
- 📊 **排行榜系统** — 热门 / 最高评分 / 最新 / 趋势 四维排序
- 💰 **商业化预留** — 会员体系、付费工具、开发者账户、收益记录等完整商业化数据模型

## 🏗️ 架构概览

```
┌─────────────────────────────────────────────────────────┐
│                      Nginx 反向代理                       │
│                   (统一入口 :18000)                        │
├──────────────────────┬──────────────────────────────────┤
│   Next.js 前端       │        FastAPI 后端                │
│   :13000             │        :8000                       │
│                      │                                    │
│  • App Router        │  • RESTful API (v1)               │
│  • shadcn/ui         │  • JWT 认证 + 限流                 │
│  • Zustand 状态管理    │  • 多 LLM Provider               │
│  • Tailwind CSS      │  • 工厂模式采集器                   │
│  • 深色/浅色主题       │  • ES + PG 双引擎搜索              │
├──────────────────────┴──────────────────────────────────┤
│                    基础设施层                              │
│  PostgreSQL 16  │  Elasticsearch 8  │  Redis 7           │
│  (主数据存储)     │  (全文搜索+IK分词)   │  (缓存+限流)       │
└─────────────────────────────────────────────────────────┘
```

## 🛠️ 技术栈

| 层级 | 技术 | 说明 |
|------|------|------|
| **前端** | Next.js 14 (App Router) + React 18 + TypeScript 5 | 全栈 React 框架 |
| **UI** | Tailwind CSS 3 + shadcn/ui + Radix UI | 原子化 CSS + 无障碍组件 |
| **状态管理** | Zustand | 轻量级状态管理 |
| **后端** | Python 3.11 + FastAPI 0.115 | 异步高性能 Web 框架 |
| **ORM** | SQLAlchemy 2.0 (Async) + Alembic | 异步 ORM + 数据库迁移 |
| **主数据库** | PostgreSQL 16 | 含 uuid-ossp + pg_trgm 扩展 |
| **搜索引擎** | Elasticsearch 8 + IK 分词 | 全文搜索 + 中文分词 |
| **缓存** | Redis 7 | 缓存 + API 限流 |
| **向量数据库** | ChromaDB | 语义 Embedding 存储 |
| **LLM** | SiliconCloud / Gemini / Groq / 千帆 / DeepSeek | 5 大 Provider 灵活切换 |
| **部署** | Docker Compose | 6 服务一键编排 |

## 📁 项目结构

```
AI-Tools-Hub/
├── frontend/                    # Next.js 前端
│   ├── src/
│   │   ├── app/                 # App Router 页面
│   │   │   ├── page.tsx         # 首页 (HeroSearch + CategoryGrid + 热门工具)
│   │   │   ├── search/          # 搜索页
│   │   │   ├── tools/[id]/       # 工具详情页
│   │   │   ├── categories/      # 分类浏览页
│   │   │   ├── ranking/         # 排行榜页
│   │   │   ├── favorites/       # 收藏页
│   │   │   ├── login/           # 登录页
│   │   │   ├── register/        # 注册页
│   │   │   ├── profile/         # 个人中心
│   │   │   └── admin/crawl/     # 采集管理后台
│   │   ├── components/
│   │   │   ├── home/            # HeroSearch, ToolCard, CategoryGrid
│   │   │   ├── layout/          # Header, Footer, NeuralBackground
│   │   │   ├── search/          # SearchBar, FilterPanel, ResultList
│   │   │   ├── tool/            # ReviewForm, ReviewList
│   │   │   └── ui/              # shadcn/ui 基础组件
│   │   ├── lib/                 # API 封装、类型定义、工具函数
│   │   └── store/               # Zustand 状态管理
│   └── Dockerfile
│
├── backend/                     # FastAPI 后端
│   ├── app/
│   │   ├── api/v1/              # API 路由 (auth/tools/search/recommend/crawl/...)
│   │   ├── core/                # 配置、数据库、安全、中间件
│   │   ├── crawlers/            # GitHub/Gitee 数据采集器 (工厂模式)
│   │   ├── models/              # SQLAlchemy ORM 模型
│   │   ├── schemas/             # Pydantic 数据模型
│   │   └── services/            # 业务逻辑层 (含 LLM/ES/Embedding 服务)
│   ├── scripts/                 # 采集脚本
│   └── Dockerfile
│
├── elasticsearch/               # ES + IK 中文分词 Dockerfile
├── docker-compose.yml           # 全量服务编排
├── docker-compose.infra.yml     # 仅基础设施 (本地开发)
└── .env.example                 # 环境变量模板
```

## 🚀 快速开始

### 环境要求

- Docker & Docker Compose
- Node.js 18+ (本地开发)
- Python 3.11+ (本地开发)

### Docker 一键部署（推荐）

```bash
# 1. 克隆项目
git clone https://github.com/your-username/AI-Tools-Hub.git
cd AI-Tools-Hub

# 2. 配置环境变量
cp .env.example .env
# 编辑 .env，配置 LLM API Key 等参数

# 3. 一键启动所有服务
docker compose up -d

# 4. 访问应用
# 前端: http://localhost:18000
# 后端 API: http://localhost:18000/api/v1
# API 文档: http://localhost:18000/api/v1/docs
```

### 本地开发模式

```bash
# 1. 启动基础设施 (PG + ES + Redis)
docker compose -f docker-compose.infra.yml up -d

# 2. 启动后端
cd backend
pip install -r requirements.txt
cp .env .env  # 配置环境变量
uvicorn app.main:app --reload --port 8000

# 3. 启动前端
cd frontend
npm install
npm run dev
# 访问 http://localhost:13000
```

## 📋 环境变量配置

```env
# ===== LLM 配置 (5 选 1) =====
LLM_PROVIDER=siliconcloud          # siliconcloud / gemini / groq / qianfan / deepseek
SILICONCLOUD_API_KEY=your_key
SILICONCLOUD_MODEL=Qwen/Qwen2.5-7B-Instruct
# GEMINI_API_KEY=your_key
# GROQ_API_KEY=your_key
# QIANFAN_ACCESS_KEY=your_key
# DEEPSEEK_API_KEY=your_key

# ===== Embedding 配置 =====
EMBEDDING_PROVIDER=siliconcloud    # siliconcloud / local
SILICONCLOUD_EMBEDDING_MODEL=BAAI/bge-m3-v1

# ===== 数据库 =====
DATABASE_URL=postgresql+asyncpg://postgres:postgres@localhost:15432/ai_tools_hub

# ===== Elasticsearch =====
ELASTICSEARCH_URL=http://localhost:19200

# ===== Redis =====
REDIS_URL=redis://localhost:16379

# ===== 采集源 =====
CRAWL_PROVIDER=gitee               # github / gitee
GITEE_ACCESS_TOKEN=your_token
# GITHUB_TOKEN=your_token

# ===== JWT =====
JWT_SECRET=your-secret-key
JWT_EXPIRE_MINUTES=10080           # 7 天
```

## 🎯 核心功能

### 1. 全文搜索
- Elasticsearch 8 + IK 中文分词插件
- 多字段加权搜索（标题 x3、描述 x2、详情、标签）
- 搜索关键词高亮
- Completion Suggester 搜索建议/自动补全
- ES 不可用时自动降级到 PostgreSQL LIKE 模糊匹配

### 2. LLM 智能推荐
- 用户自然语言查询 → LLM 意图分析（提取关键词/工具类型/分类）→ 智能搜索 → 推荐 + 推荐理由
- 5 大 LLM Provider 一键切换，统一接口适配
- LLM 失败自动降级为关键词搜索

### 3. 多源数据采集
- GitHub + Gitee 双平台支持
- 工厂模式设计，通过配置切换采集源
- 快速采集（单关键词）/ 全量采集（遍历预设关键词）
- 采集任务管理面板（创建/执行/状态监控）

### 4. 分类体系
- 8 个一级分类 + 24 个二级分类
- 覆盖：MCP 工具、AI Agent、Prompt 工程、LLM 框架、RAG 工具、AI 编程、AI 创作、GPTs & 插件

### 5. 用户系统
- JWT 认证 + bcrypt 密码加密
- 收藏（登录用户服务端 + 未登录用户 localStorage）
- 1-5 星评价 + 文字评论
- 个人中心

### 6. 排行榜
- 热门 / 最高评分 / 最新 / 趋势 四维排序
- Top 3 金银铜高亮 + 统计面板

## 🎨 UI 特色

| 特效 | 说明 |
|------|------|
| NeuralBackground | Canvas 神经网络粒子动画，40 节点随机运动连线，响应鼠标交互 |
| Glass Morphism | 全局毛玻璃效果卡片和导航 |
| Holographic Shimmer | 卡片悬停全息渐变边框动画 |
| 跑马灯搜索框 | 首页搜索框流动渐变边框 |
| 打字机效果 | 搜索框 placeholder 循环切换 |
| 数字滚动 | 首页统计数据 IntersectionObserver 计数器动画 |
| 深色/浅色主题 | CSS 变量实现无缝切换 |
| 鼠标追踪光效 | 卡片跟随鼠标的光晕效果 |

## 🔌 API 文档

启动服务后访问：
- **Swagger UI**: `http://localhost:18000/api/v1/docs`
- **ReDoc**: `http://localhost:18000/api/v1/redoc`

### 主要 API 端点

| 端点 | 说明 |
|------|------|
| `POST /api/v1/auth/register` | 用户注册 |
| `POST /api/v1/auth/login` | 用户登录 |
| `GET /api/v1/tools` | 工具列表 |
| `GET /api/v1/tools/{id}` | 工具详情 |
| `GET /api/v1/search` | 全文搜索 |
| `GET /api/v1/search/suggestions` | 搜索建议 |
| `POST /api/v1/recommend` | LLM 智能推荐 |
| `GET /api/v1/categories` | 分类列表 |
| `GET /api/v1/ranking` | 排行榜 |
| `GET/POST/DELETE /api/v1/favorites` | 收藏管理 |
| `POST /api/v1/crawl/quick` | 快速采集 |
| `POST /api/v1/crawl/full` | 全量采集 |

## 🔄 通用聚合应用框架

> ⚠️ **AI-Tools-Hub 不仅是一个 AI 工具导航站，更是一个通用的资源聚合应用框架。**

基于本项目的技术架构，你可以轻松扩展为：

| 应用场景 | 说明 |
|----------|------|
| 📚 开源项目导航 | 聚合 GitHub/Gitee 优质开源项目 |
| 📰 技术资讯聚合 | 采集多平台技术文章，智能推荐 |
| 🛒 数字产品商城 | 技能/模板/插件交易，已预留商业化模型 |
| 🎓 学习资源平台 | 课程/教程/文档聚合与推荐 |
| 🔧 开发者工具箱 | API 市场、SDK 仓库、CLI 工具集合 |
| 🏢 企业内部知识库 | 内部工具/文档/最佳实践聚合 |
| 🎮 游戏资源聚合 | 游戏模组/地图/插件导航 |
| 📖 设计资源平台 | UI 模板/图标/字体聚合 |

**核心可复用能力：**
- ✅ 多源数据采集框架（工厂模式，可扩展任意平台）
- ✅ Elasticsearch 全文搜索 + IK 中文分词
- ✅ LLM 智能推荐引擎（5 大 Provider 切换）
- ✅ 分类/标签/收藏/评价体系
- ✅ 排行榜系统
- ✅ 用户认证与权限管理
- ✅ Docker 一键部署
- ✅ 精美赛博朋克 UI（可定制主题色）

## 📄 License

MIT License

## 🙏 致谢

- [Next.js](https://nextjs.org/) - React 全栈框架
- [FastAPI](https://fastapi.tiangolo.com/) - Python Web 框架
- [Elasticsearch](https://www.elastic.co/) - 分布式搜索引擎
- [shadcn/ui](https://ui.shadcn.com/) - React 组件库
- [SiliconCloud](https://siliconflow.cn/) - LLM & Embedding 服务
