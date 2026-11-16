# =========================================================================
# پلتفرم ابری حسابداری و مدیریت مالی ایرانی (نسخه صنعتی Production)
# Multi-stage Dockerfile optimized for security, minimal size and performance
# =========================================================================

# مرحله ۱: بیلد و کامپایل مونو-ریپو
FROM node:20-alpine AS builder

WORKDIR /app

# فعال‌سازی pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# کپی مانیفست‌ها و پکیج‌ها جهت کش لایه‌ها
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./
COPY packages/accounting-core/package.json ./packages/accounting-core/
COPY apps/api/package.json ./apps/api/

# نصب تمام وابستگی‌ها
RUN pnpm install --frozen-lockfile

# کپی سورس کدها
COPY packages/accounting-core ./packages/accounting-core
COPY apps/api ./apps/api

# بیلد هسته حسابداری و API
RUN pnpm --filter @accounting/core build
RUN pnpm --filter @accounting/api build

# اطمینان از کپی شدن فایل‌های شماتیک SQL در dist
RUN mkdir -p /app/apps/api/dist/database && \
    cp -r /app/apps/api/src/database/*.sql /app/apps/api/dist/database/ 2>/dev/null || true

# =========================================================================
# مرحله ۲: ایمیج نهایی و بهینه‌سازی‌شده برای اجرا (Runtime)
# =========================================================================
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# ساخت کاربر غیر ریشه (non-root) جهت امنیت سرور ابری
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 appuser

RUN chown -R appuser:nodejs /app

# کپی فایل‌های اجرایی از مرحله بیلد
COPY --from=builder --chown=appuser:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=appuser:nodejs /app/packages/accounting-core ./packages/accounting-core
COPY --from=builder --chown=appuser:nodejs /app/apps/api/dist ./apps/api/dist
COPY --from=builder --chown=appuser:nodejs /app/apps/api/node_modules ./apps/api/node_modules
COPY --from=builder --chown=appuser:nodejs /app/apps/api/package.json ./apps/api/package.json
COPY --from=builder --chown=appuser:nodejs /app/apps/api/src/database/schema.sql ./apps/api/dist/database/schema.sql

USER appuser

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/saas/plans || exit 1

CMD ["node", "apps/api/dist/main.js"]
