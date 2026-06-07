# shop backend (Medusa v2.15.3) — standalone (context = backend/services/api)
FROM node:24-alpine
RUN apk add --no-cache libc6-compat python3 make g++ bash curl wget git
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@11.3.0 --activate
COPY package.json .npmrc ./
RUN pnpm config set strict-dep-builds false && pnpm install && pnpm rebuild @swc/core sharp esbuild || true
COPY . .
ENV NODE_ENV=production
ENV CHOKIDAR_USEPOLLING=true
EXPOSE 9000
CMD ["sh", "/app/scripts/prod-start.sh"]
