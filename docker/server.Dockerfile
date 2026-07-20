FROM node:20-alpine AS base
RUN npm install -g pnpm turbo
WORKDIR /app

FROM base AS pruner
COPY . .
RUN turbo prune --scope=server --docker

FROM base AS builder
COPY --from=pruner /app/out/json/ .
COPY --from=pruner /app/out/pnpm-lock.yaml ./pnpm-lock.yaml
RUN pnpm install --frozen-lockfile

COPY --from=pruner /app/out/full/ .
RUN pnpm turbo run build --filter=server

FROM node:20-alpine AS runner
RUN npm install -g pnpm
WORKDIR /app

COPY --from=builder /app/apps/server/dist ./dist
COPY --from=builder /app/apps/server/package.json ./package.json
COPY --from=builder /app/packages/database/prisma ./prisma

RUN pnpm install --prod

EXPOSE 4000
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/index.js"]
