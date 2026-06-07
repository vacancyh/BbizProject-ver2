# shop storefront (Next.js 15) — standalone (context = apps/web)
FROM node:24-alpine
RUN apk add --no-cache libc6-compat python3 make g++ bash curl wget git
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@11.3.0 --activate
COPY package.json .npmrc ./
RUN pnpm config set strict-dep-builds false && pnpm install && pnpm rebuild sharp || true
COPY . .
ENV NODE_ENV=development
ENV WATCHPACK_POLLING=true
EXPOSE 8000
CMD ["npx", "next", "dev", "--turbopack", "-p", "8000", "-H", "0.0.0.0"]
