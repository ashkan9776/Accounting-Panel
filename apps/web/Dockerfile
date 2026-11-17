# =========================================================================
# پلتفرم حسابداری و پنل کاربری تحت وب (Next.js 16)
# Multi-stage Dockerfile for Next.js Web Frontend
# =========================================================================

FROM node:20-alpine AS builder

WORKDIR /app

RUN corepack enable && corepack prepare pnpm@latest --activate

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./
COPY packages/domain/package.json ./packages/domain/
COPY packages/shared/package.json ./packages/shared/
COPY packages/accounting-core/package.json ./packages/accounting-core/
COPY apps/web/package.json ./apps/web/

RUN pnpm install --frozen-lockfile

COPY packages/domain ./packages/domain
COPY packages/shared ./packages/shared
COPY packages/accounting-core ./packages/accounting-core
COPY apps/web ./apps/web

RUN pnpm --filter @accounting/domain build 2>/dev/null || true
RUN pnpm --filter @accounting/shared build 2>/dev/null || true
RUN pnpm --filter @accounting/core build 2>/dev/null || true
RUN pnpm --filter @accounting/web build

# =========================================================================
# مرحله ۲: اجرای محیط پروداکشن
# =========================================================================
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages ./packages
COPY --from=builder /app/apps/web ./apps/web

USER nextjs

EXPOSE 3000

CMD ["node_modules/.bin/next", "start", "apps/web", "-p", "3000"]
