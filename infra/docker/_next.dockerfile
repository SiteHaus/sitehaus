FROM node:20-alpine AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN apk add --no-cache libc6-compat openssl \
 && corepack enable \
 && corepack prepare pnpm@10.14.0 --activate

 RUN pnpm add -g turbo@^2

FROM base AS pruner
ARG APP_NAME

WORKDIR /repo
COPY . .
RUN turbo prune ${APP_NAME} --docker

FROM base AS installer
ARG APP_NAME

WORKDIR /app

COPY --from=pruner /repo/out/json/ ./
COPY --from=pruner /repo/out/pnpm-lock.yaml ./pnpm-lock.yaml
COPY --from=pruner /repo/out/pnpm-workspace.yaml ./pnpm-workspace.yaml

RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store \
    pnpm install --frozen-lockfile --store-dir=/pnpm/store

COPY --from=pruner /repo/out/full/ ./
COPY turbo.json turbo.json

RUN --mount=type=cache,id=next-cache-${APP_NAME},target=/app/apps/${APP_NAME}/.next/cache \
    pnpm turbo run build --filter=${APP_NAME}...

FROM node:20-alpine AS runner
ARG APP_NAME
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs \
 && adduser  --system --uid 1001 nextjs
USER nextjs

COPY --from=installer /app/apps/${APP_NAME}/.next/standalone ./
COPY --from=installer /app/apps/${APP_NAME}/.next/static ./.next/static
COPY --from=installer /app/apps/${APP_NAME}/public ./public

EXPOSE 3000
CMD ["node", "server.js"]
