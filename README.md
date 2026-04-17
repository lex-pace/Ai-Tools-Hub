# AI Skills Hub -- AI Skills 搜索聚合平台

AI Skills Hub 是一个面向 AI 领域的技能/工具搜索聚合平台，支持从 GitHub、Gitee 等代码托管平台自动采集 AI 相关项目数据，提供全文搜索、智能推荐、分类浏览、用户系统等核心功能。

## 核心功能

- **全文搜索** -- 基于 Elasticsearch + IK 中文分词，支持关键词高亮、多维度筛选
- **智能推荐** -- 集成多个 LLM Provider，根据用户偏好和上下文生成个性化推荐
- **分类浏览** -- 多级分类体系，支持按标签、类别、热度筛选
- **用户系统** -- 注册/登录、收藏、评价、个人中心
- **数据采集** -- 支持从 GitHub 和 Gitee 自动采集 AI 相关项目，任务管理面板实时监控

## 技术架构概览

```
                    Nginx (反向代理)
                   /              \
          Next.js (前端)      FastAPI (后端)
                               |       |        \
                         PostgreSQL  Redis   Elasticsearch
```

前端通过 Nginx 反向代理统一入口，后端 API 与 PostgreSQL、Redis、Elasticsearch 协同工作，实现数据持久化、缓存加速和全文检索。

---

## 功能特性

### 多源数据采集

- 支持 GitHub 和 Gitee 两大代码托管平台
- 工厂模式设计，可通过配置切换采集源
- 异步任务执行，支持采集任务状态追踪和日志查看

### 全文搜索

- Elasticsearch 8 + IK 中文分词插件
- 支持标题、描述、标签等多字段搜索
- 搜索结果关键词高亮
- 按分类、标签、排序方式等多维度筛选

### LLM 智能推荐

内置 5 个 LLM Provider，可灵活切换：

| Provider | 说明 | 网络要求 |
|----------|------|----------|
| SiliconCloud | 默认方案，Qwen2.5 + BGE-M3 | 国内直连 |
| Google Gemini | gemini-2.5-flash | 需 VPN |
| Groq | llama-3.3-70b-versatile | 需 VPN |
| 百度千帆 | ernie-speed-128k | 国内直连 |
| DeepSeek | deepseek-chat | 国内直连 |

同时支持本地 Embedding 模型（BAAI/bge-small-zh-v1.5），可完全离线运行。

### 用户认证

- JWT Token 认证机制
- 密码 bcrypt 加密存储
- 支持 Token 自动续期
- 基于角色的访问控制（RBAC）

### 采集任务管理

- 任务创建、启动、停止、删除
- 实时状态监控（运行中/已完成/失败）
- 采集进度和结果统计

---

## 技术栈

### 前端

| 技术 | 版本 | 说明 |
|------|------|------|
| Next.js | 14 (App Router) | React 全栈框架 |
| TypeScript | 5.4+ | 类型安全 |
| Tailwind CSS | 3.4+ | 原子化 CSS |
| shadcn/ui | -- | 组件库 |
| Zustand | 4.5+ | 状态管理 |
| Axios | 1.7+ | HTTP 客户端 |
| Lucide React | -- | 图标库 |

### 后端

| 技术 | 版本 | 说明 |
|------|------|------|
| Python | 3.11+ | 运行时 |
| FastAPI | 0.115+ | Web 框架 |
| SQLAlchemy | 2.0 (Async) | ORM |
| Alembic | 1.13+ | 数据库迁移 |
| Pydantic | 2.9+ | 数据校验 |
| Uvicorn | 0.30+ | ASGI 服务器 |

### 数据库与中间件

| 技术 | 版本 | 说明 |
|------|------|------|
| PostgreSQL | 16 | 主数据库 |
| Elasticsearch | 8 (IK 分词) | 全文搜索引擎 |
| Redis | 7 | 缓存与限流 |
| ChromaDB | 0.5+ | 向量数据库（嵌入式） |

### 部署

| 技术 | 说明 |
|------|------|
| Docker Compose | 容器编排 |
| Nginx | 反向代理与静态资源服务 |

---

## 快速开始

### 4.1 环境要求

| 工具 | 版本要求 | 说明 |
|------|----------|------|
| Docker | 20.10+ | 容器运行时 |
| Docker Compose | v2.0+ | 容器编排 |
| Node.js | 18+ | 本地开发前端（可选） |
| Python | 3.11+ | 本地开发后端（可选） |

> 推荐使用 Docker 一键部署，无需单独安装 Node.js 和 Python。

### 4.2 Docker 一键部署（推荐）

```bash
# 1. 克隆项目
git clone <repo-url> && cd ai-skills-hub

# 2. 配置环境变量
cp .env.example .env
# 编辑 .env，至少填写以下配置:
#   - SILICONFLOW_API_KEY (或其他 LLM Provider 的 API Key)
#   - GITHUB_TOKEN / GITEE_TOKEN (数据采集需要)
#   - APP_SECRET (生产环境务必修改)

# 3. 启动所有服务（首次启动会自动构建镜像）
docker compose up -d

# 4. 查看服务状态
docker compose ps

# 5. 查看后端日志（确认启动成功）
docker compose logs -f backend
```

后端容器启动时会自动执行数据库迁移和 ES 索引同步，无需手动初始化。

如需手动初始化：

```bash
# 初始化数据库（创建表结构）
docker compose exec backend python -m app.init_db

# 同步 ES 索引
docker compose exec backend python scripts/sync_es.py
```

### 4.3 仅部署基础设施

适用于本地 IDE 开发模式，仅启动 PostgreSQL、Elasticsearch、Redis 和 Nginx：

```bash
docker compose -f docker-compose.infra.yml up -d
```

### 4.4 本地开发模式

适用于需要频繁调试前后端代码的场景：

```bash
# 1. 启动基础设施（PG/ES/Redis/Nginx）
docker compose -f docker-compose.infra.yml up -d

# 2. 配置环境变量
cp .env.example .env
# 编辑 .env，修改以下配置:
#   APP_MODE=local
#   DOCKER_HOST=<你的虚拟机或 Docker 宿主机 IP>
#   DB_HOST_LOCAL=<DOCKER_HOST>
#   DB_PORT_LOCAL=15432
#   REDIS_HOST_LOCAL=<DOCKER_HOST>
#   REDIS_PORT_LOCAL=16379
#   ES_HOST_LOCAL=<DOCKER_HOST>
#   ES_PORT_LOCAL=19200

# 3. 启动后端
cd backend
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
bash run.sh
# 后端启动在 http://localhost:8000

# 4. 启动前端（新终端）
cd frontend
npm install
npm run dev
# 前端启动在 http://localhost:3000
```

---

## 端口规划

| 服务 | Docker 内部端口 | 宿主机映射端口 | 说明 |
|------|----------------|---------------|------|
| PostgreSQL | 5432 | 15432 | 主数据库 |
| Elasticsearch | 9200 | 19200 | 全文搜索引擎 |
| Redis | 6379 | 16379 | 缓存与限流 |
| Backend (FastAPI) | 8000 | 8000 | 后端 API |
| Frontend (Next.js) | 3000 | 3000 | 前端页面 |
| Nginx | 80 | 3080 | 反向代理统一入口 |

宿主机端口使用 1xxxx 段，避免与本地已有服务冲突。容器间通信使用容器名 + 内部端口，不受宿主机映射影响。

---

## 环境变量说明

环境变量配置文件为项目根目录下的 `.env`，可从 `.env.example` 复制并修改。

### 开发模式

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `APP_MODE` | `docker` | 运行模式：`docker`（全容器）/ `local`（本地开发） |

### LLM Provider 配置

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `LLM_PROVIDER` | `siliconcloud` | LLM 服务提供商 |
| `EMBEDDING_PROVIDER` | `siliconcloud` | Embedding 服务提供商 |
| `CRAWL_PROVIDER` | `gitee` | 数据采集源 |

### SiliconCloud（默认）

| 变量 | 说明 |
|------|------|
| `SILICONFLOW_API_KEY` | SiliconCloud API Key |
| `SILICONFLOW_BASE_URL` | API 地址，默认 `https://api.siliconflow.cn/v1` |
| `SILICONFLOW_LLM_MODEL` | LLM 模型，默认 `Qwen/Qwen2.5-7B-Instruct` |
| `SILICONFLOW_EMBEDDING_MODEL` | Embedding 模型，默认 `BAAI/bge-m3` |

### Google Gemini（可选）

| 变量 | 说明 |
|------|------|
| `GOOGLE_GEMINI_API_KEY` | Google Gemini API Key |
| `GEMINI_MODEL` | 模型名称，默认 `gemini-2.5-flash` |

### Groq（可选）

| 变量 | 说明 |
|------|------|
| `GROQ_API_KEY` | Groq API Key |
| `GROQ_BASE_URL` | API 地址，默认 `https://api.groq.com/openai/v1` |
| `GROQ_MODEL` | 模型名称，默认 `llama-3.3-70b-versatile` |

### 百度千帆（可选）

| 变量 | 说明 |
|------|------|
| `BAIDU_API_KEY` | 百度千帆 API Key |
| `BAIDU_SECRET_KEY` | 百度千帆 Secret Key |
| `BAIDU_MODEL` | 模型名称，默认 `ernie-speed-128k` |

### DeepSeek（可选）

| 变量 | 说明 |
|------|------|
| `DEEPSEEK_API_KEY` | DeepSeek API Key |
| `DEEPSEEK_BASE_URL` | API 地址，默认 `https://api.deepseek.com/v1` |
| `DEEPSEEK_MODEL` | 模型名称，默认 `deepseek-chat` |

### 本地 Embedding（可选，完全离线）

| 变量 | 说明 |
|------|------|
| `LOCAL_EMBEDDING_MODEL` | 模型名称，默认 `BAAI/bge-small-zh-v1.5` |
| `LOCAL_EMBEDDING_DEVICE` | 推理设备，默认 `cpu` |

### 数据采集

| 变量 | 说明 |
|------|------|
| `GITHUB_TOKEN` | GitHub Personal Access Token（采集 GitHub 项目需要） |
| `GITEE_TOKEN` | Gitee 个人访问令牌（采集 Gitee 项目需要） |

### 应用配置

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `APP_ENV` | `development` | 运行环境：`development` / `production` |
| `APP_DEBUG` | `true` | 调试模式开关 |
| `APP_SECRET` | -- | JWT 签名密钥，生产环境务必修改 |

### JWT 认证

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `ACCESS_TOKEN_EXPIRE_MINUTES` | `10080` | Access Token 过期时间（分钟），默认 7 天 |

### 限流配置

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `RATE_LIMIT_ENABLED` | `true` | 是否启用限流 |
| `RATE_LIMIT_SEARCH_PER_MINUTE` | `30` | 搜索接口每分钟请求上限 |
| `RATE_LIMIT_CRAWL_PER_MINUTE` | `10` | 采集接口每分钟请求上限 |
| `RATE_LIMIT_DEFAULT_PER_MINUTE` | `120` | 默认接口每分钟请求上限 |

### 连接配置（本地开发模式）

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `DOCKER_HOST` | `192.168.1.100` | Docker 宿主机 IP（本地开发时填写） |
| `DB_HOST_LOCAL` | `${DOCKER_HOST}` | 本地模式 PostgreSQL 地址 |
| `DB_PORT_LOCAL` | `15432` | 本地模式 PostgreSQL 端口 |
| `REDIS_HOST_LOCAL` | `${DOCKER_HOST}` | 本地模式 Redis 地址 |
| `REDIS_PORT_LOCAL` | `16379` | 本地模式 Redis 端口 |
| `ES_HOST_LOCAL` | `${DOCKER_HOST}` | 本地模式 Elasticsearch 地址 |
| `ES_PORT_LOCAL` | `19200` | 本地模式 Elasticsearch 端口 |

> Docker 模式下连接配置自动使用容器名，无需手动修改。

---

## 项目结构

```
ai-skills-hub/
├── backend/                    # FastAPI 后端
│   ├── app/
│   │   ├── api/                # API 路由
│   │   │   └── v1/             # v1 版本接口
│   │   │       ├── auth.py     # 认证接口（登录/注册）
│   │   │       ├── skills.py   # 技能 CRUD
│   │   │       ├── search.py   # 全文搜索
│   │   │       ├── recommend.py # 智能推荐
│   │   │       ├── categories.py # 分类管理
│   │   │       ├── crawl.py    # 数据采集
│   │   │       ├── admin.py    # 管理后台
│   │   │       ├── user_favorites.py  # 用户收藏
│   │   │       ├── user_reviews.py    # 用户评价
│   │   │       └── router.py   # 路由汇总
│   │   ├── core/               # 核心模块
│   │   │   ├── config.py       # 配置管理
│   │   │   ├── database.py     # 数据库连接
│   │   │   ├── elasticsearch.py # ES 客户端
│   │   │   ├── redis.py        # Redis 客户端
│   │   │   ├── security.py     # 安全工具
│   │   │   ├── auth.py         # 认证逻辑
│   │   │   ├── middleware.py   # 中间件（日志/限流）
│   │   │   ├── deps.py         # 依赖注入
│   │   │   └── exceptions.py   # 自定义异常
│   │   ├── crawlers/           # 数据采集器
│   │   │   ├── base.py         # 采集器基类
│   │   │   ├── factory.py      # 采集器工厂
│   │   │   ├── github_crawler.py  # GitHub 采集器
│   │   │   └── gitee_crawler.py   # Gitee 采集器
│   │   ├── models/             # SQLAlchemy ORM 模型
│   │   │   ├── skill.py        # 技能模型
│   │   │   ├── user.py         # 用户模型
│   │   │   ├── category.py     # 分类模型
│   │   │   ├── crawl_task.py   # 采集任务模型
│   │   │   ├── favorite.py     # 收藏模型
│   │   │   ├── review.py       # 评价模型
│   │   │   └── search_log.py   # 搜索日志模型
│   │   ├── schemas/            # Pydantic 数据模型
│   │   │   ├── skill.py        # 技能 Schema
│   │   │   ├── user.py         # 用户 Schema
│   │   │   ├── category.py     # 分类 Schema
│   │   │   ├── crawl.py        # 采集任务 Schema
│   │   │   ├── recommend.py    # 推荐 Schema
│   │   │   └── common.py       # 通用 Schema
│   │   ├── services/           # 业务逻辑层
│   │   │   ├── skill_service.py     # 技能服务
│   │   │   ├── search_service.py    # 搜索服务
│   │   │   ├── recommend_service.py # 推荐服务
│   │   │   ├── es_service.py        # ES 操作服务
│   │   │   ├── llm_service.py       # LLM 调用服务
│   │   │   ├── crawl_service.py     # 采集服务
│   │   │   ├── auth_service.py      # 认证服务
│   │   │   └── category_service.py  # 分类服务
│   │   └── main.py             # 应用入口
│   ├── scripts/                # 工具脚本
│   ├── Dockerfile              # 后端镜像构建
│   ├── requirements.txt        # Python 依赖
│   ├── run.sh                  # 本地启动脚本
│   └── init.sql                # 数据库初始化 SQL
├── frontend/                   # Next.js 前端
│   ├── src/
│   │   ├── app/                # App Router 页面
│   │   │   ├── page.tsx        # 首页
│   │   │   ├── layout.tsx      # 根布局
│   │   │   ├── search/         # 搜索页
│   │   │   ├── skills/         # 技能详情页
│   │   │   ├── categories/     # 分类页
│   │   │   ├── favorites/      # 收藏页
│   │   │   ├── login/          # 登录页
│   │   │   └── register/       # 注册页
│   │   ├── components/         # React 组件
│   │   │   ├── home/           # 首页组件（HeroSearch/SkillCard/CategoryGrid）
│   │   │   ├── layout/         # 布局组件（Header/Footer）
│   │   │   ├── search/         # 搜索组件（SearchBar/FilterPanel/ResultList）
│   │   │   └── ui/             # shadcn/ui 基础组件
│   │   ├── lib/                # 工具函数和 API 客户端
│   │   │   ├── api.ts          # API 请求封装
│   │   │   ├── types.ts        # TypeScript 类型定义
│   │   │   └── utils.ts        # 通用工具函数
│   │   └── store/              # Zustand 状态管理
│   │       ├── authStore.ts    # 认证状态
│   │       └── searchStore.ts  # 搜索状态
│   ├── Dockerfile              # 前端镜像构建
│   ├── package.json            # Node.js 依赖
│   └── components.json         # shadcn/ui 配置
├── nginx/                      # Nginx 配置
│   └── nginx.conf              # 反向代理配置
├── elasticsearch/              # Elasticsearch 自定义镜像
│   └── Dockerfile              # 含 IK 中文分词插件
├── data/                       # 持久化数据目录（Docker Volume）
│   ├── postgres/               # PostgreSQL 数据
│   ├── elasticsearch/          # Elasticsearch 数据
│   ├── redis/                  # Redis 数据
│   ├── chroma/                 # ChromaDB 数据
│   └── uploads/                # 上传文件
├── docker-compose.yml          # 全量服务编排
├── docker-compose.infra.yml    # 仅基础设施编排
├── .env.example                # 环境变量模板
└── .gitignore                  # Git 忽略配置
```

---

## API 文档

后端启动后，可通过以下地址访问 API 文档：

| 文档 | 地址 |
|------|------|
| Swagger UI | `http://localhost:8000/docs` |
| ReDoc | `http://localhost:8000/redoc` |
| 健康检查 | `http://localhost:8000/api/v1/health` |
| 服务信息 | `http://localhost:8000/api/v1/info` |

通过 Nginx 代理访问（Docker 一键部署后）：

| 文档 | 地址 |
|------|------|
| Swagger UI | `http://localhost:3080/api/docs` |
| ReDoc | `http://localhost:3080/api/redoc` |

### 主要 API 端点

| 模块 | 端点 | 说明 |
|------|------|------|
| 认证 | `POST /api/v1/auth/register` | 用户注册 |
| 认证 | `POST /api/v1/auth/login` | 用户登录 |
| 技能 | `GET /api/v1/skills` | 获取技能列表 |
| 技能 | `GET /api/v1/skills/{id}` | 获取技能详情 |
| 搜索 | `GET /api/v1/search` | 全文搜索 |
| 推荐 | `GET /api/v1/recommend` | 智能推荐 |
| 分类 | `GET /api/v1/categories` | 获取分类列表 |
| 采集 | `POST /api/v1/crawl/tasks` | 创建采集任务 |
| 采集 | `GET /api/v1/crawl/tasks` | 获取采集任务列表 |
| 收藏 | `POST /api/v1/favorites` | 添加收藏 |
| 评价 | `POST /api/v1/reviews` | 提交评价 |

---

## 开发指南

### 代码规范

**后端 (Python)**

- 遵循 PEP 8 编码规范
- 使用类型注解（Type Hints）
- API 路由使用 RESTful 风格命名
- 数据模型使用 Pydantic Schema 进行校验
- 业务逻辑封装在 `services/` 层，路由层仅做参数校验和响应封装

**前端 (TypeScript/React)**

- 遵循 ESLint + Next.js 默认规则
- 组件使用函数式组件 + Hooks
- 状态管理统一使用 Zustand
- UI 组件基于 shadcn/ui，保持风格一致
- CSS 使用 Tailwind CSS 原子化类名

### 分支策略

| 分支 | 用途 |
|------|------|
| `main` | 生产环境代码，仅通过 PR 合入 |
| `develop` | 开发分支，日常开发在此分支进行 |
| `feature/*` | 功能分支，从 `develop` 创建，完成后合回 |
| `fix/*` | 修复分支，从 `develop` 创建，完成后合回 |
| `release/*` | 发布分支，从 `develop` 创建，测试通过后合入 `main` |

### 提交规范

提交信息遵循 [Conventional Commits](https://www.conventionalcommits.org/) 规范：

```
<type>(<scope>): <subject>

<body>
```

**type 类型：**

| 类型 | 说明 |
|------|------|
| `feat` | 新功能 |
| `fix` | 修复 Bug |
| `docs` | 文档变更 |
| `style` | 代码格式调整（不影响逻辑） |
| `refactor` | 重构（不新增功能、不修复 Bug） |
| `perf` | 性能优化 |
| `test` | 测试相关 |
| `chore` | 构建/工具链变更 |

**示例：**

```bash
feat(search): 新增按标签筛选功能
fix(auth): 修复 Token 过期后未自动跳转登录页的问题
docs(readme): 更新部署文档中的端口映射说明
```

---

## 常见问题

### Elasticsearch 启动失败

Elasticsearch 默认配置了 512MB JVM 堆内存，如果宿主机内存不足，可修改 `docker-compose.yml` 中的 `ES_JAVA_OPTS` 环境变量降低内存分配。

### 数据采集失败

- 确认已在 `.env` 中配置对应的 Token（`GITHUB_TOKEN` 或 `GITEE_TOKEN`）
- GitHub Token 需要有 `repo` 和 `read:org` 权限
- Gitee Token 需要有 `projects` 和 `groups` 权限

### 本地开发连接数据库失败

- 确认 `APP_MODE=local` 已正确设置
- 确认 `DOCKER_HOST` 已填写正确的宿主机 IP
- 确认基础设施容器已通过 `docker-compose.infra.yml` 启动
- 使用 `docker compose -f docker-compose.infra.yml ps` 检查容器状态

---

## License

[MIT](./LICENSE)
