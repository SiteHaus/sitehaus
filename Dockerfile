FROM node:20-alpine AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"

RUN apk add --no-cache libc6-compat \
  && corepack enable \
  && corepack prepare pnpm@10.14.0 --activate \
  && pnpm add -g turbo@^2

WORKDIR /app

FROM base AS prune

COPY . .

RUN --mount=type=cache,target=/root/.cache/turbo \
  turbo prune api iam web dashboard --docker

FROM base AS installer

COPY --from=prune /app/out/json/ .
COPY --from=prune /app/out/pnpm-lock.yaml ./pnpm-lock.yaml
COPY --from=prune /app/out/pnpm-workspace.yaml ./pnpm-workspace.yaml

RUN --mount=type=cache,target=/pnpm/store \
  pnpm fetch

COPY --from=prune /app/out/full/ ./
COPY turbo.json turbo.json

RUN --mount=type=cache,target=/pnpm/store \
  pnpm install -r

FROM base AS build

COPY --from=installer /app ./

RUN --mount=type=cache,target=/root/.cache/turbo \
  turbo run build --filter=api... --filter=iam... --filter=web... --filter=dashboard...

# ========================================
# RUNTIME IMAGES
# ========================================

FROM build AS api-runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000

CMD ["node", "apps/api/dist/main.js"]

FROM node:20-alpine AS iam-runner
WORKDIR /app

RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 nextjs
USER nextjs

COPY --from=build /app/apps/iam/next.config.js .
COPY --from=build /app/apps/iam/package.json .

COPY --from=build --chown=nextjs:nodejs /app/apps/iam/.next/standalone ./
COPY --from=build --chown=nextjs:nodejs /app/apps/iam/.next/static ./apps/iam/.next/static
COPY --from=build --chown=nextjs:nodejs /app/apps/iam/public ./apps/iam/public

CMD ["node", "apps/iam/server.js"]

FROM node:20-alpine AS web-runner
WORKDIR /app

RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 nextjs
USER nextjs

COPY --from=build /app/apps/web/next.config.js .
COPY --from=build /app/apps/web/package.json .

COPY --from=build --chown=nextjs:nodejs /app/apps/web/.next/standalone ./
COPY --from=build --chown=nextjs:nodejs /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=build --chown=nextjs:nodejs /app/apps/web/public ./apps/web/public

CMD ["node", "apps/web/server.js"]

FROM node:20-alpine AS dashboard-runner
WORKDIR /app

RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 nextjs
USER nextjs

COPY --from=build /app/apps/dashboard/next.config.js .
COPY --from=build /app/apps/dashboard/package.json .

COPY --from=build --chown=nextjs:nodejs /app/apps/dashboard/.next/standalone ./
COPY --from=build --chown=nextjs:nodejs /app/apps/dashboard/.next/static ./apps/dashboard/.next/static
COPY --from=build --chown=nextjs:nodejs /app/apps/dashboard/public ./apps/dashboard/public

CMD ["node", "apps/dashboard/server.js"]