FROM node:20-alpine AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN apk add --no-cache libc6-compat && \
    corepack enable && \
    corepack prepare pnpm@10.14.0 --activate
 
FROM base AS builder
RUN apk add --no-cache openssl
WORKDIR /app
COPY . .
RUN pnpm turbo prune iam --docker
 
FROM base AS installer
WORKDIR /app
 
COPY --from=builder /app/out/json/ .
COPY --from=builder /app/out/pnpm-lock.yaml ./pnpm-lock.yaml
COPY --from=builder /app/out/pnpm-workspace.yaml ./pnpm-workspace.yaml
RUN pnpm install --frozen-lockfile
 
COPY --from=builder /app/out/full/ .
COPY turbo.json turbo.json
 
RUN pnpm turbo run build --filter=iam...
 
FROM node:20-alpine AS runner
WORKDIR /app
 
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs
USER nextjs
 
COPY --from=installer /app/apps/iam/next.config.js .
COPY --from=installer /app/apps/iam/package.json .
 
COPY --from=installer --chown=nextjs:nodejs /app/apps/iam/.next/standalone ./
COPY --from=installer --chown=nextjs:nodejs /app/apps/iam/.next/static ./apps/iam/.next/static
COPY --from=installer --chown=nextjs:nodejs /app/apps/iam/public ./apps/iam/public
 
CMD ["node", "apps/iam/server.js"]