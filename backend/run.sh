#!/bin/bash
# AI Skills Hub — 本地启动后端
# 用法: cd backend && bash run.sh

set -e

echo "=== AI Skills Hub 后端启动 ==="

# 检查 .env
if [ ! -f .env ]; then
    echo "[ERROR] .env 文件不存在，请从 .env.example 复制并修改"
    exit 1
fi

# 检查 Python
if ! command -v python3 &> /dev/null; then
    echo "[ERROR] 未找到 python3，请先安装 Python 3.10+"
    exit 1
fi

# 创建虚拟环境
if [ ! -d "venv" ]; then
    echo "[INFO] 创建虚拟环境..."
    python3 -m venv venv
fi

# 激活虚拟环境
source venv/bin/activate

# 安装依赖
echo "[INFO] 安装依赖..."
pip install -r requirements.txt -q

# 启动服务
echo "[INFO] 启动 FastAPI..."
echo "=== API 文档: http://localhost:8000/docs ==="
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload --log-level info
