FROM node:20-alpine AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN apk add --no-cache libc6-compat && \
    corepack enable && \
    corepack prepare pnpm@10.14.0 --activate && \
    pnpm add -g turbo@^2

FROM base AS prune
WORKDIR /app

COPY . .
RUN --mount=type=cache,target=/root/.cache/turbo \
    turbo prune web --docker

FROM base AS installer
WORKDIR /app
 
COPY --from=prune /app/out/json/ .
COPY --from=prune /app/out/pnpm-lock.yaml ./pnpm-lock.yaml
COPY --from=prune /app/out/pnpm-workspace.yaml ./pnpm-workspace.yaml

RUN --mount=type=cache,target=/pnpm/store \
    pnpm fetch

COPY --from=prune /app/out/full/ ./
COPY turbo.json turbo.json

RUN --mount=type=cache,target=/pnpm/store \
    pnpm install -r --offline

FROM base AS build
WORKDIR /app

COPY --from=installer /app ./

RUN --mount=type=cache,target=/root/.cache/turbo \
    turbo run build --filter=web...
 
FROM node:20-alpine AS runner

WORKDIR /app
 
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs
USER nextjs
 
COPY --from=build /app/apps/web/next.config.js .
COPY --from=build /app/apps/web/package.json .
 
COPY --from=build --chown=nextjs:nodejs /app/apps/web/.next/standalone ./
COPY --from=build --chown=nextjs:nodejs /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=build --chown=nextjs:nodejs /app/apps/web/public ./apps/web/public
 
CMD ["node", "apps/web/server.js"]