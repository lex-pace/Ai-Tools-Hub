#!/bin/bash
# AI Tools Hub — 本地启动前端
# 用法: cd frontend && bash run.sh

set -e

echo "=== AI Tools Hub 前端启动 ==="

# 检查 Node.js
if ! command -v node &> /dev/null; then
    echo "[ERROR] 未找到 node，请先安装 Node.js 18+"
    exit 1
fi

# 安装依赖
if [ ! -d "node_modules" ]; then
    echo "[INFO] 安装依赖..."
    npm install
fi

# 启动开发服务器
echo "[INFO] 启动 Next.js..."
echo "=== 前端地址: http://localhost:3000 ==="
NODE_TLS_REJECT_UNAUTHORIZED=0 npm run dev
