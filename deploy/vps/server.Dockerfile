FROM node:20-bookworm-slim

RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates \
    && rm -rf /var/lib/apt/lists/*
RUN corepack enable && corepack prepare pnpm@9.0.0 --activate
WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
COPY apps/server/package.json apps/server/package.json
COPY packages/database/package.json packages/database/package.json
COPY packages/types/package.json packages/types/package.json
RUN pnpm install --frozen-lockfile

COPY apps/server apps/server
COPY packages/database packages/database
COPY packages/types packages/types
RUN pnpm --filter @watch-party/database db:generate

ENV NODE_ENV=production
EXPOSE 4000
CMD ["sh", "-c", "pnpm --filter @watch-party/database db:deploy && pnpm --filter @watch-party/server start"]
