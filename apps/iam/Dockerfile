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
    turbo prune iam --docker

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
    turbo run build --filter=iam...
 
FROM node:20-alpine AS runner

WORKDIR /app
 
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs
USER nextjs
 
COPY --from=build /app/apps/iam/next.config.js .
COPY --from=build /app/apps/iam/package.json .
 
COPY --from=build --chown=nextjs:nodejs /app/apps/iam/.next/standalone ./
COPY --from=build --chown=nextjs:nodejs /app/apps/iam/.next/static ./apps/iam/.next/static
COPY --from=build --chown=nextjs:nodejs /app/apps/iam/public ./apps/iam/public
 
CMD ["node", "apps/iam/server.js"]