# -----------------------------------------------------------------------------
# Stage 1: Dependencies
# -----------------------------------------------------------------------------
FROM node:22-bookworm-slim AS deps

WORKDIR /app

RUN apt-get update && \
    apt-get install -y \
    openssl \
    libssl-dev \
    ca-certificates \
    curl && \
    rm -rf /var/lib/apt/lists/*

COPY package*.json ./

RUN npm ci --legacy-peer-deps

COPY prisma ./prisma

RUN npx prisma generate


# -----------------------------------------------------------------------------
# Stage 2: Builder
# -----------------------------------------------------------------------------
FROM node:22-bookworm-slim AS builder

WORKDIR /app

ENV NODE_ENV=production

RUN apt-get update && \
    apt-get install -y \
    openssl \
    libssl-dev && \
    rm -rf /var/lib/apt/lists/*

COPY --from=deps /app/node_modules ./node_modules

COPY . .

RUN npx prisma generate

RUN npm run build

# --- Bake the SQLite database into the image ---
ENV DATABASE_URL="file:/app/db/custom.db"
RUN mkdir -p /app/db && \
    npx prisma db push --skip-generate --accept-data-loss && \
    npx tsx prisma/seed.ts && \
    echo "🔍 Verifying baked database..." && \
    ls -la /app/db && \
    test -s /app/db/custom.db && echo "✅ custom.db exists and is non-empty" || (echo "❌ custom.db missing or empty — aborting build" && exit 1)


# -----------------------------------------------------------------------------
# Stage 3: Production Runner
# -----------------------------------------------------------------------------
FROM node:22-bookworm-slim AS runner

WORKDIR /app
ENV PRISMA_ENGINES_MIRROR=https://binaries.prisma.sh
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
ENV DATABASE_URL="file:/app/db/custom.db"

RUN apt-get update && \
    apt-get install -y \
    openssl \
    libssl3 \
    ca-certificates && \
    rm -rf /var/lib/apt/lists/*

RUN groupadd --system nodejs
RUN useradd --system --gid nodejs nextjs

COPY --from=builder /app/public ./public

COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma

COPY --from=builder /app/db ./db
RUN chown -R nextjs:nodejs /app

USER nextjs

EXPOSE 3000

CMD ["node", "server.js"]