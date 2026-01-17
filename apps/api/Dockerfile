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
    turbo prune api --docker

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
    turbo run build --filter=api...

FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# Copy built API and dependencies
COPY --from=build /app/apps/api/dist ./dist
COPY --from=build /app/apps/api/package.json ./package.json
COPY --from=build /app/node_modules ./node_modules

EXPOSE 3000

CMD ["node", "dist/main.js"]
