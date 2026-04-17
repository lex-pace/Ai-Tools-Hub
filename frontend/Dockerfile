FROM node:20-alpine AS builder

WORKDIR /app

# npm 镜像
RUN npm config set registry https://registry.npmmirror.com

# 先复制依赖文件（利用 Docker 缓存）
COPY package.json package-lock.json* ./
RUN npm install

# 复制源码并构建
COPY . .
RUN npm run build

# 生产镜像
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

EXPOSE 3000

CMD ["node", "server.js"]
