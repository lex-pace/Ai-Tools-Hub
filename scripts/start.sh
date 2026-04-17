#!/bin/bash
# ============================================================
# AI Tools Hub — 一键启动脚本
# 支持 DOCKER_HOST 环境变量，兼容远程 Docker 场景
# ============================================================
set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

info()  { echo -e "${GREEN}[INFO]${NC}  $*"; }
warn()  { echo -e "${YELLOW}[WARN]${NC}  $*"; }
error() { echo -e "${RED}[ERROR]${NC} $*"; }

echo "================================"
echo "  AI Tools Hub — 容器化部署"
echo "================================"
echo ""

# ── 检查 Docker ──────────────────────────────────────
if ! command -v docker &>/dev/null; then
    error "未找到 Docker，请先安装 Docker"
    exit 1
fi

if ! docker compose version &>/dev/null; then
    error "未找到 docker compose，请升级 Docker 到最新版本"
    exit 1
fi

info "Docker 版本: $(docker --version)"
info "Docker Compose 版本: $(docker compose version --short 2>/dev/null || docker compose version)"
echo ""

# ── 检查 .env 文件 ──────────────────────────────────
if [ ! -f .env ]; then
    warn "未找到 .env 文件，从模板创建..."
    cp .env.example .env
    info "已创建 .env 文件，请编辑 .env 填入你的 API Key"
    echo ""
    echo "  快速开始（纯国内方案，无需 VPN）:"
    echo "  1. 注册 SiliconCloud: https://cloud.siliconflow.cn"
    echo "  2. 注册 Gitee: https://gitee.com"
    echo "  3. 编辑 .env 填入 API Key"
    echo ""
    read -p "是否现在编辑 .env? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        ${EDITOR:-nano} .env
    else
        warn "稍后请手动编辑 .env 文件"
    fi
else
    info ".env 文件已存在"
fi

# ── DOCKER_HOST 支持 ────────────────────────────────
if [ -n "$DOCKER_HOST" ]; then
    info "使用 DOCKER_HOST: $DOCKER_HOST"
    export DOCKER_HOST="$DOCKER_HOST"
fi

# ── 创建数据目录 ────────────────────────────────────
info "创建数据目录..."
mkdir -p data/{postgres,elasticsearch,redis,chroma,uploads}

# ── 设置 ES 数据目录权限 ───────────────────────────
info "设置 Elasticsearch 数据目录权限..."
chmod -R 777 data/elasticsearch 2>/dev/null || warn "ES 目录权限设置失败（可能需要 sudo）"

# ── 构建镜像 ────────────────────────────────────────
echo ""
info "构建 Docker 镜像（首次需要 5-15 分钟）..."
docker compose build

# ── 启动服务 ────────────────────────────────────────
echo ""
info "启动所有服务..."
docker compose up -d

# ── 等待服务就绪 ────────────────────────────────────
echo ""
info "等待基础设施服务启动..."

MAX_WAIT=120
WAITED=0
INTERVAL=5

wait_for_healthy() {
    local service=$1
    local name=$2
    local count=0
    while [ $count -lt $MAX_WAIT ]; do
        local status
        status=$(docker inspect --format='{{.State.Health.Status}}' "$service" 2>/dev/null || echo "not found")
        if [ "$status" = "healthy" ]; then
            info "  $name: 就绪"
            return 0
        fi
        sleep $INTERVAL
        count=$((count + INTERVAL))
        WAITED=$((WAITED + INTERVAL))
    done
    warn "  $name: 等待超时（仍在后台启动中）"
    return 1
}

wait_for_healthy "tools-postgres"      "PostgreSQL"
wait_for_healthy "tools-redis"         "Redis"
wait_for_healthy "tools-elasticsearch" "Elasticsearch"

# 等待后端就绪
echo ""
info "等待后端 API 启动..."
BACKEND_WAIT=0
while [ $BACKEND_WAIT -lt 60 ]; do
    if curl -sf http://localhost:8000/api/v1/health >/dev/null 2>&1; then
        info "  后端 API: 就绪"
        break
    fi
    sleep 3
    BACKEND_WAIT=$((BACKEND_WAIT + 3))
done
if [ $BACKEND_WAIT -ge 60 ]; then
    warn "  后端 API: 等待超时（仍在后台启动中）"
fi

# 等待前端就绪
echo ""
info "等待前端服务启动..."
FRONTEND_WAIT=0
while [ $FRONTEND_WAIT -lt 30 ]; do
    if curl -sf http://localhost:3000 >/dev/null 2>&1; then
        info "  前端: 就绪"
        break
    fi
    sleep 3
    FRONTEND_WAIT=$((FRONTEND_WAIT + 3))
done
if [ $FRONTEND_WAIT -ge 30 ]; then
    warn "  前端: 等待超时（仍在后台启动中）"
fi

# ── 服务状态 ────────────────────────────────────────
echo ""
info "服务状态:"
docker compose ps

# ── 访问地址 ────────────────────────────────────────
echo ""
echo "================================"
echo "  启动完成！"
echo "================================"
echo ""
echo "  前端:            http://localhost:3080"
echo "  后端 API:        http://localhost:8000"
echo "  API 文档:        http://localhost:8000/docs"
echo "  ReDoc 文档:      http://localhost:8000/redoc"
echo ""
echo "  PostgreSQL:      localhost:15432 (tools/tools123)"
echo "  Elasticsearch:   http://localhost:19200"
echo "  Redis:           localhost:16379"
echo ""
echo "  查看日志:  docker compose logs -f"
echo "  查看后端:  docker compose logs -f backend"
echo "  停止服务:  docker compose down"
echo "  清除数据:  docker compose down -v"
echo "================================"
