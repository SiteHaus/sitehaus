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
    turbo prune lighthaus --docker

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
    pnpm install -r

FROM base AS build
WORKDIR /app

ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_IAM_URL
ARG NEXT_PUBLIC_CLIENT_KEY
ARG NEXT_PUBLIC_LIGHTHAUS_API_URL
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}
ENV NEXT_PUBLIC_IAM_URL=${NEXT_PUBLIC_IAM_URL}
ENV NEXT_PUBLIC_CLIENT_KEY=${NEXT_PUBLIC_CLIENT_KEY}
ENV NEXT_PUBLIC_LIGHTHAUS_API_URL=${NEXT_PUBLIC_LIGHTHAUS_API_URL}

COPY --from=installer /app ./

RUN --mount=type=cache,target=/root/.cache/turbo \
    turbo run build --filter=lighthaus...

FROM node:20-alpine AS runner

WORKDIR /app

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs
USER nextjs

COPY --from=build /app/apps/lighthaus/next.config.mjs .
COPY --from=build /app/apps/lighthaus/package.json .

COPY --from=build --chown=nextjs:nodejs /app/apps/lighthaus/.next/standalone ./
COPY --from=build --chown=nextjs:nodejs /app/apps/lighthaus/.next/static ./apps/lighthaus/.next/static
COPY --from=build --chown=nextjs:nodejs /app/apps/lighthaus/public ./apps/lighthaus/public

CMD ["node", "apps/lighthaus/server.js"]
