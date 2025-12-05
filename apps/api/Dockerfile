# apps/api/Dockerfile

# ---------- Base image ----------
FROM node:20-alpine AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"

# basic deps + pnpm + turbo
RUN apk add --no-cache libc6-compat && \
    corepack enable && \
    corepack prepare pnpm@10.14.0 --activate && \
    pnpm add -g turbo@^2

# ---------- Prune (Turborrepo) ----------
FROM base AS prune
WORKDIR /app

# Copy the whole repo so turbo can see everything
COPY . .

# Only keep what's needed for the api app in a docker-friendly layout
RUN --mount=type=cache,target=/root/.cache/turbo \
    turbo prune api --docker

# ---------- Install deps ----------
FROM base AS installer
WORKDIR /app

# Bring in the pruned package manifests
COPY --from=prune /app/out/json/ .
COPY --from=prune /app/out/pnpm-lock.yaml ./pnpm-lock.yaml
COPY --from=prune /app/out/pnpm-workspace.yaml ./pnpm-workspace.yaml

# Pre-fetch deps into pnpm store
RUN --mount=type=cache,target=/pnpm/store \
    pnpm fetch

# Bring in the pruned source
COPY --from=prune /app/out/full/ ./
COPY turbo.json turbo.json

# Install using offline store
RUN --mount=type=cache,target=/pnpm/store \
    pnpm install -r --offline

# ---------- Build ----------
FROM base AS build
WORKDIR /app

COPY --from=installer /app ./

# Build only the api app
RUN --mount=type=cache,target=/root/.cache/turbo \
    turbo run build --filter=api...

# ---------- Runtime ----------
FROM node:20-alpine AS runner
WORKDIR /app

# Optional: non-root user (similar to IAM if you want)
RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 nestjs
USER nestjs

# Copy only what's needed at runtime
COPY --from=build /app/apps/api/dist ./apps/api/dist
COPY --from=build /app/apps/api/package.json ./apps/api/package.json
COPY --from=build /app/node_modules ./node_modules

ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

# Adjust path if your Nest build outputs somewhere else
CMD ["node", "apps/api/dist/main.js"]
